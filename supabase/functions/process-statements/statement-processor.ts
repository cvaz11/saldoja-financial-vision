
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { processStructuredFile } from './structured-processor.ts';
import { insertTransactions, updateStatementStatus } from './database-operations.ts';

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
      await updateStatementStatus(supabase, statement.id, 'no_data');
      console.log('⚠️ No transactions found - marked as no_data');
      return;
    }

    // Insert transactions using the new module
    await insertTransactions(supabase, transactions, statement.id, statement.user_id);

    // Update statement with success status
    await updateStatementStatus(supabase, statement.id, 'ready', transactions);

    console.log(`✅ Statement processed successfully:`);
    console.log(`   - ${transactions.length} transactions`);

  } catch (error) {
    console.error(`❌ Error processing statement ${statement.id}:`, error.message);
    
    // Update statement with error status
    await updateStatementStatus(supabase, statement.id, 'error');
    
    throw error;
  }
};
