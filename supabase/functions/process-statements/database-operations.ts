
import { NubankTransaction } from './libs/nubank-transaction-parser.ts';

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
    
    // Detectar se é parcela baseado na presença de installment_total > 1
    const isInstallment = transaction.installment_total && transaction.installment_total > 1;
    
    return {
      statement_id: statementId,
      user_id: userId,
      transaction_date: transaction.date,
      description: transaction.description.slice(0, 255), // Limitar tamanho
      amount: Math.abs(transaction.amount), // Armazenar como positivo
      category: transaction.category || 'Outros',
      installment_number: transaction.installment_number || null,
      installment_total: transaction.installment_total || null,
      is_credit: false, // Todas são débitos
      is_installment: isInstallment, // Incluir flag de parcela
    };
  });

  console.log('[DB] Exemplo de transação a inserir:', dbTransactions[0]);

  // Inserir transações uma por vez com upsert para parcelas
  let insertedCount = 0;
  let errors = [];

  for (let i = 0; i < dbTransactions.length; i++) {
    const transaction = dbTransactions[i];
    
    try {
      // Para parcelas, usar upsert baseado em installment_id + number
      if (transaction.installment_number && transaction.installment_total) {
        // Verificar se já existe essa parcela
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('description', transaction.description)
          .eq('installment_number', transaction.installment_number)
          .eq('installment_total', transaction.installment_total)
          .single();

        if (existing) {
          console.log(`[DB] Parcela ${transaction.installment_number}/${transaction.installment_total} já existe, pulando...`);
          continue;
        }
      }

      const { error: insertError } = await supabase
        .from('transactions')
        .insert([transaction]);

      if (insertError) {
        console.error(`[DB] Erro ao inserir transação ${i + 1}:`, insertError);
        errors.push(`Transação ${i + 1}: ${insertError.message}`);
      } else {
        insertedCount++;
        
        // Se é uma parcela, gerar as parcelas futuras
        if (transaction.installment_number && transaction.installment_total) {
          await generateFutureInstallments(supabase, transaction, userId, statementId);
        }
        
        if (i % 10 === 0) {
          console.log(`[DB] Progresso: ${i + 1}/${dbTransactions.length} transações processadas`);
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
    const baseDescription = baseTransaction.description
      .replace(/parcela\s+\d{1,2}\/\d{1,2}/i, '')
      .replace(/\d{1,2}\s*de\s*\d{1,2}/i, '')
      .replace(/\d{1,2}\/\d{1,2}\s*parcela/i, '')
      .replace(/\d{1,2}\s*\/\s*\d{1,2}/i, '')
      .trim();
    
    const futureDescription = `${baseDescription} - Parcela ${i}/${totalInstallments}`;

    futureInstallments.push({
      statement_id: null, // Parcelas futuras não têm extrato ainda
      user_id: userId,
      transaction_date: futureDate.toISOString().split('T')[0],
      description: futureDescription.slice(0, 255),
      amount: baseTransaction.amount,
      category: baseTransaction.category,
      installment_number: i,
      installment_total: totalInstallments,
      is_credit: false,
      is_installment: true, // Marcar como parcela
    });
  }

  // Inserir parcelas futuras
  if (futureInstallments.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .insert(futureInstallments);
      
    if (error) {
      console.error('[DB] Erro ao inserir parcelas futuras:', error);
    } else {
      console.log(`[DB] ✅ ${futureInstallments.length} parcelas futuras geradas`);
    }
  }
};
