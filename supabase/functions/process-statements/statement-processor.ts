
import { extractTextFromPDF } from './pdf-processor.ts';
import { processTextWithOpenAI, Transaction } from './openai-processor.ts';
import { insertTransactions, updateStatementStatus } from './database-operations.ts';

export const parseStatementContent = async (fileUrl: string, supabase: any): Promise<Transaction[]> => {
  try {
    console.log(`[PARSE] Downloading PDF from: ${fileUrl}`);
    
    // Download the PDF file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(fileUrl);
    
    if (downloadError) {
      console.error('[PARSE] Error downloading file:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }
    
    if (!fileData) {
      throw new Error('Downloaded file is empty or null');
    }
    
    console.log('[PARSE] File downloaded successfully, extracting text...');
    
    // Extract text from PDF
    const extractedText = await extractTextFromPDF(fileData);
    
    if (!extractedText || extractedText.length < 50) {
      console.error('[PARSE] Extracted text is too short:', extractedText?.length || 0);
      throw new Error('PDF text extraction failed - no meaningful content found');
    }
    
    console.log(`[PARSE] Text extracted successfully, ${extractedText.length} characters`);
    console.log(`[PARSE] First 200 characters: ${extractedText.substring(0, 200)}...`);
    
    // Process text with OpenAI
    const validTransactions = await processTextWithOpenAI(extractedText);
    
    console.log(`[PARSE] Processing complete, found ${validTransactions.length} transactions`);
    
    return validTransactions;
    
  } catch (error) {
    console.error('[PARSE] Error parsing statement content:', error);
    throw error;
  }
};

export const processStatement = async (statement: any, supabase: any): Promise<void> => {
  const startTime = Date.now();
  
  try {
    console.log(`\n=== PROCESSING STATEMENT ${statement.id} ===`);
    console.log(`File: ${statement.filename}`);
    console.log(`Bank: ${statement.bank || 'Unknown'}`);
    console.log(`User: ${statement.user_id}`);
    console.log(`Status: ${statement.status}`);

    // Parse the PDF content
    console.log(`[PROCESS] Starting content extraction...`);
    const extractedTransactions = await parseStatementContent(statement.file_url, supabase);
    
    console.log(`[PROCESS] Extraction completed: ${extractedTransactions.length} transactions found`);

    if (extractedTransactions.length === 0) {
      console.log(`[PROCESS] No transactions found, marking as error`);
      await updateStatementStatus(supabase, statement.id, 'error');
      return;
    }

    // Log sample transactions
    console.log(`[PROCESS] Sample transactions:`, extractedTransactions.slice(0, 3));

    // Insert transactions into database
    console.log(`[PROCESS] Inserting transactions into database...`);
    await insertTransactions(supabase, extractedTransactions, statement.id, statement.user_id);

    // Update statement status to 'ready'
    console.log(`[PROCESS] Updating statement status to ready...`);
    await updateStatementStatus(supabase, statement.id, 'ready', extractedTransactions);

    const processingTime = Date.now() - startTime;
    console.log(`✅ STATEMENT ${statement.id} PROCESSED SUCCESSFULLY in ${processingTime}ms`);
    console.log(`   - Transactions: ${extractedTransactions.length}`);
    console.log(`   - Credit: ${extractedTransactions.filter(t => t.amount > 0).length}`);
    console.log(`   - Debit: ${extractedTransactions.filter(t => t.amount < 0).length}`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ STATEMENT ${statement.id} FAILED after ${processingTime}ms:`, error);
    
    // Mark statement as error with detailed error info
    try {
      await updateStatementStatus(supabase, statement.id, 'error');
    } catch (updateError) {
      console.error(`[PROCESS] Failed to update statement status to error:`, updateError);
    }
    
    // Re-throw the error for the main handler
    throw error;
  }
};
