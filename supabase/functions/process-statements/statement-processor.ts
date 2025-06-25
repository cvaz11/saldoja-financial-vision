
import { extractTextFromPDF } from './pdf-processor.ts';
import { processTextWithOpenAI, Transaction } from './openai-processor.ts';
import { insertTransactions, updateStatementStatus } from './database-operations.ts';

export const parseStatementContent = async (fileUrl: string, supabase: any): Promise<Transaction[]> => {
  try {
    console.log(`[PARSE] Processing file: ${fileUrl}`);
    
    // Download the PDF file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(fileUrl);
    
    if (downloadError) {
      console.error('[PARSE] Download error:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }
    
    if (!fileData) {
      throw new Error('Downloaded file is empty');
    }
    
    console.log('[PARSE] File downloaded successfully');
    
    // Extract text from PDF
    const extractedText = await extractTextFromPDF(fileData);
    console.log(`[PARSE] Text extracted: ${extractedText.length} characters`);
    
    // Process text with OpenAI
    const validTransactions = await processTextWithOpenAI(extractedText);
    console.log(`[PARSE] Found ${validTransactions.length} valid transactions`);
    
    return validTransactions;
    
  } catch (error) {
    console.error('[PARSE] Error:', error);
    // Return empty array instead of throwing error
    console.log('[PARSE] Returning empty transactions due to error');
    return [];
  }
};

export const processStatement = async (statement: any, supabase: any): Promise<void> => {
  const startTime = Date.now();
  
  try {
    console.log(`\n=== PROCESSING STATEMENT ${statement.id} ===`);
    console.log(`File: ${statement.filename}`);
    console.log(`User: ${statement.user_id}`);

    // Parse the statement
    const extractedTransactions = await parseStatementContent(statement.file_url, supabase);
    
    console.log(`[PROCESS] Processing ${extractedTransactions.length} transactions`);

    // Insert transactions (even if empty)
    await insertTransactions(supabase, extractedTransactions, statement.id, statement.user_id);

    // Update statement status to ready (always successful now)
    await updateStatementStatus(supabase, statement.id, 'ready', extractedTransactions);

    const processingTime = Date.now() - startTime;
    console.log(`✅ STATEMENT ${statement.id} COMPLETED in ${processingTime}ms`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ STATEMENT ${statement.id} FAILED after ${processingTime}ms:`, error);
    
    // Mark as error
    try {
      await updateStatementStatus(supabase, statement.id, 'error');
    } catch (updateError) {
      console.error(`Failed to update error status:`, updateError);
    }
    
    throw error;
  }
};
