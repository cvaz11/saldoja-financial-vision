
import { Transaction } from './openai-processor.ts';

export const insertTransactions = async (
  supabase: any,
  transactions: Transaction[],
  statementId: string,
  userId: string
) => {
  const transactionInserts = transactions.map(transaction => ({
    statement_id: statementId,
    user_id: userId,
    transaction_date: transaction.date,
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.category,
    installment_number: transaction.installment_number || null,
    installment_total: transaction.installment_total || null,
    is_credit: transaction.amount > 0
  }));

  console.log(`[DB] Inserting ${transactionInserts.length} transactions...`);
  
  // Use upsert with ignoreDuplicates to handle the unique constraint
  const { error: insertError, data: insertedData } = await supabase
    .from('transactions')
    .upsert(transactionInserts, { 
      onConflict: 'user_id,transaction_date,description,amount,category',
      ignoreDuplicates: true 
    })
    .select();

  if (insertError) {
    console.error(`[DB] Error inserting transactions:`, insertError);
    throw insertError;
  }

  console.log(`[DB] Successfully inserted/updated ${insertedData?.length || 0} transactions`);
  return insertedData;
};

export const updateStatementStatus = async (
  supabase: any,
  statementId: string,
  status: string,
  transactions?: Transaction[]
) => {
  const updateData: any = { 
    status,
    parsed_at: new Date().toISOString()
  };

  if (transactions && transactions.length > 0) {
    const totalCredit = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    updateData.total_credit = totalCredit;
    updateData.total_debit = totalDebit;
  }

  const { error: updateError } = await supabase
    .from('statements')
    .update(updateData)
    .eq('id', statementId);

  if (updateError) {
    console.error(`[DB] Error updating statement ${statementId}:`, updateError);
    throw updateError;
  }

  console.log(`[DB] Updated statement ${statementId} status to ${status}`);
};
