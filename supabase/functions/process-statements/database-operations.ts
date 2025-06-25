
import { Transaction } from './openai-processor.ts';

export const insertTransactions = async (
  supabase: any,
  transactions: Transaction[],
  statementId: string,
  userId: string
) => {
  console.log(`[DB] Preparing to insert ${transactions.length} transactions...`);
  
  // First, check if we already have transactions for this statement
  const { data: existingTransactions, error: checkError } = await supabase
    .from('transactions')
    .select('id')
    .eq('statement_id', statementId);

  if (checkError) {
    console.error(`[DB] Error checking existing transactions:`, checkError);
    throw new Error(`Database check failed: ${checkError.message}`);
  }

  if (existingTransactions && existingTransactions.length > 0) {
    console.log(`[DB] Statement ${statementId} already has ${existingTransactions.length} transactions, skipping insert`);
    return existingTransactions;
  }

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

  console.log(`[DB] Sample transaction insert:`, transactionInserts[0]);
  
  // Insert transactions with ON CONFLICT handling
  const { error: insertError, data: insertedData } = await supabase
    .from('transactions')
    .upsert(transactionInserts, { 
      onConflict: 'user_id,transaction_date,description,amount,category',
      ignoreDuplicates: true 
    })
    .select();

  if (insertError) {
    console.error(`[DB] Error inserting transactions:`, insertError);
    throw new Error(`Database insert failed: ${insertError.message}`);
  }

  const insertedCount = insertedData?.length || 0;
  console.log(`[DB] Successfully inserted/updated ${insertedCount} transactions`);
  return insertedData;
};

export const updateStatementStatus = async (
  supabase: any,
  statementId: string,
  status: string,
  transactions?: Transaction[]
) => {
  console.log(`[DB] Updating statement ${statementId} status to ${status}`);
  
  const updateData: any = { 
    status,
    parsed_at: new Date().toISOString()
  };

  if (transactions && transactions.length > 0) {
    const totalCredit = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    updateData.total_credit = totalCredit;
    updateData.total_debit = totalDebit;
    
    console.log(`[DB] Statement totals - Credit: ${totalCredit}, Debit: ${totalDebit}`);
  }

  const { error: updateError } = await supabase
    .from('statements')
    .update(updateData)
    .eq('id', statementId);

  if (updateError) {
    console.error(`[DB] Error updating statement ${statementId}:`, updateError);
    throw new Error(`Database update failed: ${updateError.message}`);
  }

  console.log(`[DB] Statement ${statementId} updated successfully`);
};
