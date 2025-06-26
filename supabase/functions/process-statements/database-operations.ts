
import { NubankTransaction } from './libs/nubank-transaction-parser.ts';

// Interface para transações do sistema
interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
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

  // Limpar transações existentes deste extrato
  console.log(`[DB] Limpando transações existentes do extrato ${statementId}...`);
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('statement_id', statementId);

  if (deleteError) {
    console.error('[DB] Erro ao limpar transações existentes:', deleteError);
    // Continuar mesmo com erro de limpeza
  }

  // Converter transações para formato do banco
  const dbTransactions = transactions.map(transaction => ({
    statement_id: statementId,
    user_id: userId,
    transaction_date: transaction.date,
    description: transaction.description.slice(0, 255), // Limitar tamanho
    amount: Math.abs(transaction.amount), // Armazenar como positivo
    category: transaction.category,
    installment_number: null,
    installment_total: null,
    is_credit: false, // Todas são débitos
  }));

  console.log('[DB] Exemplo de transação a inserir:', dbTransactions[0]);

  // Inserir transações com upsert para evitar duplicatas
  const { error: insertError, data: insertedData } = await supabase
    .from('transactions')
    .upsert(dbTransactions, {
      onConflict: 'user_id,transaction_date,description,amount'
    })
    .select('id');

  if (insertError) {
    console.error('[DB] Erro ao inserir transações:', insertError);
    throw new Error(`Falha na inserção no banco: ${insertError.message}`);
  }

  console.log(`[DB] ✅ ${dbTransactions.length} transações inseridas com sucesso`);
  if (insertedData) {
    console.log(`[DB] IDs das transações inseridas: ${insertedData.length} registros`);
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
