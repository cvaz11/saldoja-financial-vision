
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { processStructuredFile } from './structured-processor.ts';

export const processStatement = async (statement: any, supabase: any) => {
  console.log(`\n🔄 Processing statement: ${statement.filename}`);
  
  try {
    // Update status to processing
    await supabase
      .from('statements')
      .update({ status: 'processing' })
      .eq('id', statement.id);

    // Download file from storage
    console.log(`📁 Downloading file: ${statement.file_url}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(statement.file_url);

    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    console.log(`📊 File downloaded: ${fileData.size} bytes`);

    // Process the structured file
    const transactions = await processStructuredFile(fileData, statement.filename);
    
    console.log(`💫 Extracted ${transactions.length} transactions`);

    if (transactions.length === 0) {
      // No transactions found
      await supabase
        .from('statements')
        .update({ 
          status: 'no_data',
          processed_at: new Date().toISOString()
        })
        .eq('id', statement.id);
      
      console.log('⚠️ No transactions found - marked as no_data');
      return;
    }

    // Insert transactions into database - removed 'bank' field
    const transactionsWithStatementId = transactions.map(tx => ({
      user_id: statement.user_id,
      statement_id: statement.id,
      transaction_date: tx.date,
      description: tx.description,
      amount: Math.abs(tx.amount), // Store as positive value
      is_credit: tx.amount > 0, // Set is_credit based on original sign
      category: tx.category,
      installment_number: tx.installment_number || null,
      installment_total: tx.installment_total || null,
      created_at: new Date().toISOString()
    }));

    console.log(`💾 Inserting ${transactionsWithStatementId.length} transactions...`);

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactionsWithStatementId);

    if (insertError) {
      throw new Error(`Transaction insert failed: ${insertError.message}`);
    }

    // Calculate totals
    const totalDebit = transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    const totalCredit = transactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Update statement with results
    await supabase
      .from('statements')
      .update({
        status: 'ready',
        total_debit: totalDebit,
        total_credit: totalCredit,
        transaction_count: transactions.length,
        processed_at: new Date().toISOString()
      })
      .eq('id', statement.id);

    console.log(`✅ Statement processed successfully:`);
    console.log(`   - ${transactions.length} transactions`);
    console.log(`   - R$ ${totalDebit.toFixed(2)} in debits`);
    console.log(`   - R$ ${totalCredit.toFixed(2)} in credits`);

  } catch (error) {
    console.error(`❌ Error processing statement ${statement.id}:`, error.message);
    
    // Update statement with error status
    await supabase
      .from('statements')
      .update({
        status: 'error',
        error_message: error.message,
        processed_at: new Date().toISOString()
      })
      .eq('id', statement.id);
    
    throw error;
  }
};
