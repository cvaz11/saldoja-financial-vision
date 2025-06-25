
import { Transaction } from './openai-processor.ts';

export const insertTransactions = async (
  supabase: any,
  transactions: Transaction[],
  statementId: string,
  userId: string
) => {
  console.log(`[DB] Preparing to insert ${transactions.length} transactions for statement ${statementId}...`);
  
  if (transactions.length === 0) {
    console.log('[DB] No transactions to insert - marking statement as ready with empty data');
    return [];
  }

  // Always delete existing transactions for this statement to avoid duplicates
  console.log(`[DB] Cleaning existing transactions for statement ${statementId}...`);
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('statement_id', statementId);

  if (deleteError) {
    console.error(`[DB] Error deleting existing transactions:`, deleteError);
    // Continue anyway, as they might not exist
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
      ignoreDuplicates: false
    })
    .select();

  if (insertError) {
    console.error(`[DB] Error inserting transactions:`, insertError);
    throw new Error(`Database insert failed: ${insertError.message}`);
  }

  const insertedCount = insertedData?.length || 0;
  console.log(`[DB] Successfully inserted ${insertedCount} transactions`);
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

  if (status === 'ready') {
    if (transactions && transactions.length > 0) {
      const totalCredit = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const totalDebit = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
      updateData.total_credit = totalCredit;
      updateData.total_debit = totalDebit;
      
      console.log(`[DB] Statement totals - Credit: ${totalCredit}, Debit: ${totalDebit}`);
    } else {
      updateData.total_credit = 0;
      updateData.total_debit = 0;
      console.log(`[DB] No transactions found - setting totals to 0`);
    }
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
