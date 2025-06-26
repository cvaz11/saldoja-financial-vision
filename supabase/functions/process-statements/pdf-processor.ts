
import { PDFDocument } from "https://deno.land/x/pdf@0.1.1/mod.ts";

export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] ===== STARTING DENO NATIVE PDF EXTRACTION =====');
    console.log('[PDF] File size:', fileData.size, 'bytes');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log(`[PDF] PDF loaded as ${uint8Array.length} bytes`);
    
    // Use Deno native PDF parser
    console.log('[PDF] Loading PDF with Deno native parser...');
    const pdf = await PDFDocument.load(uint8Array);
    console.log(`[PDF] PDF loaded successfully, ${pdf.getPageCount()} pages`);
    
    // Extract text from all pages
    const pages = pdf.getPages();
    const textBlocks: string[] = [];
    
    for (let i = 0; i < pages.length; i++) {
      console.log(`[PDF] Processing page ${i + 1}/${pages.length}`);
      try {
        const page = pages[i];
        const textContent = await page.getTextContent();
        
        if (textContent && textContent.items) {
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .filter(text => text.trim().length > 0)
            .join(' ');
          
          if (pageText.length > 0) {
            textBlocks.push(pageText);
            console.log(`[PDF] Page ${i + 1} extracted ${pageText.length} characters`);
          }
        }
      } catch (pageError) {
        console.log(`[PDF] Warning: Could not extract text from page ${i + 1}:`, pageError.message);
        continue;
      }
    }
    
    const finalText = textBlocks.join('\n').trim();
    console.log(`[PDF] Total extracted text length: ${finalText.length} characters`);
    console.log(`[PDF] Sample text (first 500 chars):`);
    console.log(finalText.slice(0, 500));
    
    if (finalText.length < 50) {
      throw new Error('Very little text extracted - PDF might be image-based or corrupted');
    }
    
    console.log('[PDF] ===== PDF EXTRACTION COMPLETED SUCCESSFULLY =====');
    return finalText;
    
  } catch (error) {
    console.error('[PDF] CRITICAL ERROR in PDF processing:', error);
    console.error('[PDF] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw new Error(`PDF processing failed: ${error.message}`);
  }
};
