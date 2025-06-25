
import { extractTextFromPDF } from './pdf-processor.ts';
import { processTextWithOpenAI, Transaction } from './openai-processor.ts';
import { insertTransactions, updateStatementStatus } from './database-operations.ts';

export const parseStatementContent = async (fileUrl: string, supabase: any): Promise<Transaction[]> => {
  try {
    console.log(`[PDF] Downloading from: ${fileUrl}`);
    
    // Download the PDF file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(fileUrl);
    
    if (downloadError) {
      console.error('[PDF] Error downloading:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }
    
    console.log('[PDF] Downloaded successfully');
    
    // Extract text from PDF
    const extractedText = await extractTextFromPDF(fileData);
    
    if (!extractedText || extractedText.length < 50) {
      console.error('[PDF] Extracted text is too short or empty');
      throw new Error('PDF text extraction failed - no meaningful content found');
    }
    
    // Process text with OpenAI
    const validTransactions = await processTextWithOpenAI(extractedText);
    
    return validTransactions;
    
  } catch (error) {
    console.error('[ERROR] Error parsing statement content:', error);
    throw error; // Re-throw to mark statement as error
  }
};

export const processStatement = async (statement: any, supabase: any): Promise<void> => {
  try {
    console.log(`\n--- Processing statement ${statement.id} (${statement.filename}) ---`);

    // Parse the actual PDF content using text extraction
    console.log(`[PROCESSING] Starting extraction for ${statement.id}`);
    const extractedTransactions = await parseStatementContent(statement.file_url, supabase);
    
    console.log(`[PROCESSING] Extracted ${extractedTransactions.length} transactions from PDF`);

    if (extractedTransactions.length === 0) {
      console.log(`[PROCESSING] No transactions found, marking as error`);
      await updateStatementStatus(supabase, statement.id, 'error');
      return;
    }

    // Insert transactions into database
    await insertTransactions(supabase, extractedTransactions, statement.id, statement.user_id);

    // Update statement status to 'ready'
    await updateStatementStatus(supabase, statement.id, 'ready', extractedTransactions);

    console.log(`✅ Successfully processed statement ${statement.id}`);

  } catch (error) {
    console.error(`❌ Error processing statement ${statement.id}:`, error);
    
    // Mark statement as error
    await updateStatementStatus(supabase, statement.id, 'error');
    
    throw error;
  }
};
