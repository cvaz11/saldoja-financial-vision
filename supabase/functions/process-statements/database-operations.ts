
import { Transaction } from './openai-processor.ts';

export const insertTransactions = async (
  supabase: any,
  transactions: Transaction[],
  statementId: string,
  userId: string
): Promise<void> => {
  console.log(`[DB] Preparing to insert ${transactions.length} transactions for statement ${statementId}...`);

  if (transactions.length === 0) {
    console.log('[DB] No transactions to insert - marking statement as ready with empty data');
    return;
  }

  // Clean existing transactions for this statement to avoid duplicates
  console.log(`[DB] Cleaning existing transactions for statement ${statementId}...`);
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('statement_id', statementId);

  if (deleteError) {
    console.error('[DB] Error cleaning existing transactions:', deleteError);
    // Continue anyway, upsert will handle duplicates
  }

  // Convert transactions to database format
  const dbTransactions = transactions.map(transaction => ({
    statement_id: statementId,
    user_id: userId,
    transaction_date: transaction.date,
    description: transaction.description,
    amount: Math.abs(transaction.amount), // Store as positive number
    category: transaction.category,
    installment_number: transaction.installment_number || null,
    installment_total: transaction.installment_total || null,
    is_credit: false, // All transactions are debits now
  }));

  console.log('[DB] Sample transaction insert:', dbTransactions[0]);

  // Use upsert to handle potential duplicates gracefully
  const { error: insertError } = await supabase
    .from('transactions')
    .upsert(dbTransactions, {
      onConflict: 'user_id,transaction_date,description,amount,category',
      ignoreDuplicates: true
    });

  if (insertError) {
    console.error('[DB] Error inserting transactions:', insertError);
    // If it's a duplicate key error, just log and continue
    if (insertError.code === '23505') {
      console.log('[DB] Duplicate transactions detected, continuing with existing data...');
    } else {
      throw new Error(`Database insert failed: ${insertError.message}`);
    }
  } else {
    console.log(`[DB] Successfully inserted ${transactions.length} transactions`);
  }
};

export const updateStatementStatus = async (
  supabase: any,
  statementId: string,
  status: 'ready' | 'error' | 'processing',
  transactions?: Transaction[]
): Promise<void> => {
  console.log(`[DB] Updating statement ${statementId} status to ${status}`);

  let updateData: any = {
    status,
    parsed_at: new Date().toISOString(),
  };

  if (transactions && transactions.length > 0) {
    // Calculate totals - only debits (negative amounts)
    const totalDebit = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalCredit = 0; // No credits processed anymore
    
    updateData.total_debit = totalDebit;
    updateData.total_credit = totalCredit;
    
    console.log(`[DB] Setting totals - debit: ${totalDebit}, credit: ${totalCredit}`);
  } else {
    // No transactions found
    updateData.total_debit = 0;
    updateData.total_credit = 0;
    console.log('[DB] No transactions found - setting totals to 0');
  }

  const { error } = await supabase
    .from('statements')
    .update(updateData)
    .eq('id', statementId);

  if (error) {
    console.error(`[DB] Error updating statement status:`, error);
    throw new Error(`Failed to update statement status: ${error.message}`);
  }

  console.log(`[DB] Statement ${statementId} updated successfully`);
};
