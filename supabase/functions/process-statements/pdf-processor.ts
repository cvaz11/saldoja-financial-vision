
import { getDocument, GlobalWorkerOptions } from "npm:pdfjs-dist@3.11.174/build/pdf.mjs";

// Configure worker before using getDocument
GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting PDF text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`[PDF] PDF file size: ${uint8Array.length} bytes`);
    
    // Load PDF document
    const pdf = await getDocument({ data: uint8Array }).promise;
    console.log(`[PDF] PDF loaded with ${pdf.numPages} pages`);
    
    let extractedText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items
      const pageText = textContent.items
        .filter((item: any) => item.str && item.str.trim())
        .map((item: any) => item.str.trim())
        .join(' ');
      
      extractedText += pageText + '\n';
      console.log(`[PDF] Extracted text from page ${pageNum}: ${pageText.length} characters`);
    }
    
    console.log(`[PDF] Total extracted text: ${extractedText.length} characters`);
    
    // Return error only if no text was extracted
    if (extractedText.length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }
    
    return extractedText.trim();
    
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
