
import { NubankTransaction } from './libs/nubank-transaction-parser.ts';

// Classificação inteligente de receita vs despesa
const INCOME_INDICATORS = [
  'estorno', 'reembolso', 'ajuste',
  'transferencia recebida', 'transferência recebida', 'pix recebido', 'deposito', 'depósito'
];

const classifyTransactionType = (description: string, amount: number): boolean => {
  const normalized = description.toLowerCase();
  const hasIncomeIndicator = INCOME_INDICATORS.some(term => normalized.includes(term));
  if (hasIncomeIndicator) return true;
  
  // Regra principal: valor negativo = despesa, valor positivo = receita
  return amount > 0;
};

// Interface para transações do sistema
interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  installment_number?: number;
  installment_total?: number;
  installment_id?: string;
  is_installment?: boolean;
}

// ===== Helpers de normalização e chave de parcela (idempotência) =====
const stripParcelaMarkers = (text: string): string => {
  return text
    // remover padrões de parcela (ordem importa)
    .replace(/-\s*parcela\s+\d{1,2}\s*\/\s*\d{1,2}/gi, '')
    .replace(/parcela\s+\d{1,2}\s*\/\s*\d{1,2}/gi, '')
    .replace(/\d{1,2}\s*\/\s*\d{1,2}\s*parcela/gi, '')
    .replace(/\d{1,2}\s*de\s*\d{1,2}/gi, '')
    .replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/gi, '')
    .trim();
};

const normalizeDescription = (text: string): string => {
  const noParcela = stripParcelaMarkers(text || '');
  // remover acentos, pontuação e normalizar espaços/caixa
  const ascii = noParcela
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // remove pontuação e símbolos (ex.: *)
    .replace(/\s+/g, ' ') // colapsar espaços
    .trim();
  return ascii;
};

const buildInstallmentKey = (params: {
  description: string;
  amountPerInstallment: number;
  totalInstallments: number;
  userId: string;
}): string => {
  const base = normalizeDescription(params.description);
  const amt = (Math.round(params.amountPerInstallment * 100) / 100).toFixed(2);
  // formato estável e legível
  return `${params.userId}:${base}:${amt}:${params.totalInstallments}`;
};

export const insertTransactions = async (
  supabase: any,
  transactions: Transaction[],
  statementId: string,
  userId: string
): Promise<void> => {
  console.log(`[DB] ===== INSERINDO TRANSAÇÕES =====`);
  console.log(`[DB] Preparando ${transactions.length} transações para extrato ${statementId}...`);

  if (transactions.length === 0) {
    console.log('[DB] Nenhuma transação para inserir');
    return;
  }

  // Limpar transações existentes deste extrato PRIMEIRO
  console.log(`[DB] Limpando transações existentes do extrato ${statementId}...`);
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('statement_id', statementId);

  if (deleteError) {
    console.error('[DB] Erro ao limpar transações existentes:', deleteError);
    // Continuar mesmo com erro de limpeza
  } else {
    console.log('[DB] ✅ Transações antigas removidas com sucesso');
  }

  // Converter transações para formato do banco
  const dbTransactions = transactions.map((transaction, index) => {
    console.log(`[DB] Processando transação ${index + 1}: "${transaction.description}"`);
    console.log(`[DB] Dados de parcela:`, {
      installment_number: transaction.installment_number,
      installment_total: transaction.installment_total,
      installment_id: transaction.installment_id,
      is_installment: transaction.is_installment
    });
    
    const isInstallment = !!(transaction.installment_total && transaction.installment_total > 1 && transaction.installment_number);

    const computedInstallmentId = isInstallment
      ? buildInstallmentKey({
          description: transaction.description,
          amountPerInstallment: Math.abs(transaction.amount),
          totalInstallments: transaction.installment_total!,
          userId,
        })
      : null;
    
    return {
      statement_id: statementId,
      user_id: userId,
      transaction_date: transaction.date,
      description: transaction.description.slice(0, 255), // Limitar tamanho
      amount: Math.abs(transaction.amount), // Armazenar como positivo
      category: transaction.category || 'Outros',
      installment_number: transaction.installment_number || null,
      installment_total: transaction.installment_total || null,
      installment_id: computedInstallmentId,
      is_credit: classifyTransactionType(transaction.description, transaction.amount)
    } as any;
  });

  console.log('[DB] Exemplo de transação a inserir:', dbTransactions[0]);

  // Inserir transações uma por vez com upsert para parcelas
  let insertedCount = 0;
  let errors = [];

  for (let i = 0; i < dbTransactions.length; i++) {
    const transaction = dbTransactions[i];
    
    try {
      // Para parcelas, usar upsert baseado na constraint única (user_id, installment_id, installment_number)
      if (transaction.installment_number && transaction.installment_total && transaction.installment_id) {
        const { error: upsertError } = await supabase
          .from('transactions')
          .upsert([transaction], { onConflict: 'user_id,installment_id,installment_number' });

        if (upsertError) {
          console.error(`[DB] Erro no upsert da parcela ${i + 1}:`, upsertError);
          errors.push(`Transação ${i + 1}: ${upsertError.message}`);
        } else {
          insertedCount++;
          await generateFutureInstallments(supabase, transaction, userId, statementId);
          if (i % 10 === 0) {
            console.log(`[DB] Progresso: ${i + 1}/${dbTransactions.length} transações processadas`);
          }
        }
      } else {
        // Transação normal (não parcelada)
        const { error: insertError } = await supabase
          .from('transactions')
          .insert([transaction]);

        if (insertError) {
          console.error(`[DB] Erro ao inserir transação ${i + 1}:`, insertError);
          errors.push(`Transação ${i + 1}: ${insertError.message}`);
        } else {
          insertedCount++;
          if (i % 10 === 0) {
            console.log(`[DB] Progresso: ${i + 1}/${dbTransactions.length} transações processadas`);
          }
        }
      }
    } catch (error) {
      console.error(`[DB] Erro inesperado ao inserir transação ${i + 1}:`, error);
      errors.push(`Transação ${i + 1}: ${error.message}`);
    }
  }

  console.log(`[DB] ✅ ${insertedCount} de ${dbTransactions.length} transações inseridas com sucesso`);
  
  if (errors.length > 0) {
    console.log(`[DB] ⚠️  ${errors.length} erros durante inserção:`);
    errors.slice(0, 3).forEach(error => console.log(`[DB]   - ${error}`));
    if (errors.length > 3) {
      console.log(`[DB]   ... e mais ${errors.length - 3} erros`);
    }
  }

  // Se pelo menos algumas transações foram inseridas, considerar sucesso
  if (insertedCount === 0) {
    throw new Error(`Falha ao inserir transações: ${errors.join('; ')}`);
  }
};

export const updateStatementStatus = async (
  supabase: any,
  statementId: string,
  status: 'ready' | 'error' | 'processing' | 'no_data',
  transactions?: Transaction[]
): Promise<void> => {
  console.log(`[DB] ===== ATUALIZANDO STATUS DO EXTRATO =====`);
  console.log(`[DB] Extrato ${statementId} → status: ${status}`);

  let updateData: any = {
    status,
    parsed_at: new Date().toISOString(),
  };

  if (transactions && transactions.length > 0) {
    // Calcular totais - apenas débitos
    const totalDebit = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalCredit = 0; // Sem créditos processados
    
    updateData.total_debit = totalDebit;
    updateData.total_credit = totalCredit;

    // === NOVA FUNCIONALIDADE: DETECÇÃO AUTOMÁTICA DE PERÍODO ===
    console.log(`[DB] 🔍 Iniciando análise inteligente de período...`);
    
    // Buscar dados do statement atual para obter closing_day
    const { data: statement } = await supabase
      .from('statements')
      .select('closing_day, month, year')
      .eq('id', statementId)
      .single();
    
    if (statement) {
      const { analyzeInvoicePeriod } = await import('./period-analyzer.ts');
      
      // Analisar transações para detectar período correto
      const analysis = analyzeInvoicePeriod(transactions, statement.closing_day || 5);
      
      console.log(`[DB] 📊 Análise de período concluída:`);
      console.log(`[DB]   - Período atual no banco: ${statement.month}/${statement.year}`);
      console.log(`[DB]   - Período sugerido: ${analysis.suggestedMonth}/${analysis.suggestedYear}`);
      console.log(`[DB]   - Confiança: ${analysis.confidence}%`);
      console.log(`[DB]   - Raciocínio: ${analysis.reasoning}`);
      
      // Se a confiança for alta e diferente do período atual, atualizar
      if (analysis.confidence >= 60 && 
          (statement.month !== analysis.suggestedMonth || statement.year !== analysis.suggestedYear)) {
        
        console.log(`[DB] 🎯 Corrigindo período automaticamente:`);
        console.log(`[DB]   - De: ${statement.month}/${statement.year}`);
        console.log(`[DB]   - Para: ${analysis.suggestedMonth}/${analysis.suggestedYear}`);
        
        updateData.month = analysis.suggestedMonth;
        updateData.year = analysis.suggestedYear;
        
        // Log da correção para auditoria
        console.log(`[DB] ✅ PERÍODO CORRIGIDO AUTOMATICAMENTE: ${analysis.reasoning}`);
      } else if (analysis.confidence < 60) {
        console.log(`[DB] ⚠️ Confiança baixa (${analysis.confidence}%), mantendo período original`);
      } else {
        console.log(`[DB] ✅ Período atual já está correto`);
      }
    }
    
    console.log(`[DB] Definindo totais - débito: R$ ${totalDebit.toFixed(2)}, crédito: R$ ${totalCredit.toFixed(2)}`);
  } else {
    // Sem transações
    updateData.total_debit = 0;
    updateData.total_credit = 0;
    console.log('[DB] Sem transações - definindo totais como 0');
  }

  const { error } = await supabase
    .from('statements')
    .update(updateData)
    .eq('id', statementId);

  if (error) {
    console.error(`[DB] Erro ao atualizar status do extrato:`, error);
    throw new Error(`Falha ao atualizar status: ${error.message}`);
  }

  console.log(`[DB] ✅ Extrato ${statementId} atualizado com sucesso`);
};

// Função para gerar parcelas futuras
const generateFutureInstallments = async (
  supabase: any,
  baseTransaction: any,
  userId: string,
  statementId: string
) => {
  const currentInstallment = baseTransaction.installment_number;
  const totalInstallments = baseTransaction.installment_total;
  
  if (currentInstallment >= totalInstallments) {
    return; // Já é a última parcela
  }

  console.log(`[DB] Gerando ${totalInstallments - currentInstallment} parcelas futuras...`);

  const baseDate = new Date(baseTransaction.transaction_date);
  const futureInstallments = [];

  // Gerar parcelas futuras
  for (let i = currentInstallment + 1; i <= totalInstallments; i++) {
    const futureDate = new Date(baseDate);
    futureDate.setMonth(futureDate.getMonth() + (i - currentInstallment));
    
    // Atualizar descrição com o número da parcela
    const baseDescription = stripParcelaMarkers(baseTransaction.description).trim();
    
    const futureDescription = `${baseDescription} - Parcela ${i}/${totalInstallments}`;

    const futureInstallmentId = buildInstallmentKey({
      description: baseDescription,
      amountPerInstallment: Math.abs(baseTransaction.amount),
      totalInstallments: totalInstallments,
      userId,
    });

    futureInstallments.push({
      statement_id: null, // Parcelas futuras não têm extrato ainda
      user_id: userId,
      transaction_date: futureDate.toISOString().split('T')[0],
      description: futureDescription.slice(0, 255),
      amount: baseTransaction.amount,
      category: baseTransaction.category,
      installment_number: i,
      installment_total: totalInstallments,
      installment_id: futureInstallmentId,
      is_credit: classifyTransactionType(baseTransaction.description, baseTransaction.amount),
    });
  }

  // Inserir/atualizar parcelas futuras (idempotente)
  if (futureInstallments.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .upsert(futureInstallments, { onConflict: 'user_id,installment_id,installment_number' });
      
    if (error) {
      console.error('[DB] Erro ao upsert de parcelas futuras:', error);
    } else {
      console.log(`[DB] ✅ ${futureInstallments.length} parcelas futuras garantidas (upsert)`);
    }
  }
}
