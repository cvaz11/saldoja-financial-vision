
import { extractTextFromPDF } from './pdf-processor.ts';
import { processTextWithOpenAI, Transaction } from './openai-processor.ts';
import { insertTransactions, updateStatementStatus } from './database-operations.ts';

export const parseStatementContent = async (fileUrl: string, supabase: any): Promise<Transaction[]> => {
  try {
    console.log(`[PARSE] ===== STARTING PARSE PROCESS =====`);
    console.log(`[PARSE] File URL: ${fileUrl}`);
    
    // Download the PDF file from Supabase storage
    console.log(`[PARSE] Downloading file from storage...`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(fileUrl);
    
    if (downloadError) {
      console.error('[PARSE] Download error:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }
    
    if (!fileData) {
      console.error('[PARSE] Downloaded file is empty or null');
      throw new Error('Downloaded file is empty');
    }
    
    console.log('[PARSE] File downloaded successfully');
    console.log('[PARSE] File size:', fileData.size);
    console.log('[PARSE] File type:', fileData.type);
    
    // Extract text from PDF
    console.log(`[PARSE] ===== STARTING TEXT EXTRACTION =====`);
    const extractedText = await extractTextFromPDF(fileData);
    console.log(`[PARSE] Text extraction completed`);
    console.log(`[PARSE] Extracted text length: ${extractedText.length} characters`);
    console.log(`[PARSE] Sample text (first 500 chars):`, extractedText.slice(0, 500));
    
    if (extractedText.length < 10) {
      console.error('[PARSE] ERROR: Extracted text is too short');
      throw new Error('Extracted text is too short - PDF might be image-based or corrupted');
    }
    
    // Process text to find transactions
    console.log(`[PARSE] ===== STARTING TRANSACTION PROCESSING =====`);
    const validTransactions = await processTextWithOpenAI(extractedText);
    console.log(`[PARSE] Transaction processing completed`);
    console.log(`[PARSE] Found ${validTransactions.length} valid transactions`);
    
    // Log sample transactions
    if (validTransactions.length > 0) {
      console.log(`[PARSE] Sample transactions:`, validTransactions.slice(0, 3));
    }
    
    console.log(`[PARSE] ===== PARSE PROCESS COMPLETED =====`);
    return validTransactions;
    
  } catch (error) {
    console.error('[PARSE] ===== PARSE PROCESS FAILED =====');
    console.error('[PARSE] Error:', error.message);
    console.error('[PARSE] Stack:', error.stack);
    throw error;
  }
};

export const processStatement = async (statement: any, supabase: any): Promise<void> => {
  const startTime = Date.now();
  
  try {
    console.log(`\n🚀 ===== PROCESSING STATEMENT ${statement.id} =====`);
    console.log(`📄 File: ${statement.filename}`);
    console.log(`👤 User: ${statement.user_id}`);
    console.log(`🔗 File URL: ${statement.file_url}`);
    console.log(`🏦 Bank: ${statement.bank}`);

    // Parse the statement
    const extractedTransactions = await parseStatementContent(statement.file_url, supabase);
    
    console.log(`✅ Parsing completed: ${extractedTransactions.length} transactions found`);

    // Insert transactions if found
    if (extractedTransactions.length > 0) {
      console.log(`💾 Inserting ${extractedTransactions.length} transactions...`);
      await insertTransactions(supabase, extractedTransactions, statement.id, statement.user_id);
      console.log(`✅ Successfully inserted ${extractedTransactions.length} transactions`);
      
      // Update statement status to ready
      await updateStatementStatus(supabase, statement.id, 'ready', extractedTransactions);
      console.log(`✅ Statement status updated to 'ready'`);
    } else {
      console.log(`⚠️ No transactions found - marking as no_data`);
      
      // Update statement status to no_data
      await updateStatementStatus(supabase, statement.id, 'no_data');
      console.log(`✅ Statement status updated to 'no_data'`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`🎉 STATEMENT ${statement.id} COMPLETED in ${processingTime}ms`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`💥 STATEMENT ${statement.id} FAILED after ${processingTime}ms`);
    console.error(`❌ Error:`, error.message);
    console.error(`❌ Stack:`, error.stack);
    
    // Mark as error
    try {
      await updateStatementStatus(supabase, statement.id, 'error');
      console.log(`✅ Statement status updated to 'error'`);
    } catch (updateError) {
      console.error(`💥 Failed to update error status:`, updateError);
    }
    
    throw error;
  }
};
