
import {
  getDocument,
  GlobalWorkerOptions
} from "npm:pdfjs-dist@3.11.174/build/pdf.mjs";

// Registrar o worker do pdfjs – hospedado via esm.sh
GlobalWorkerOptions.workerSrc =
  "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

console.log("[PDFJS] workerSrc set to remote URL");

export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = new Uint8Array(arrayBuffer);
    
    console.log(`[PDF] PDF file size: ${pdfBuffer.length} bytes`);
    
    // Load the PDF document
    const pdf = await getDocument({ data: pdfBuffer }).promise;
    console.log(`[PDF] PDF loaded successfully. Pages: ${pdf.numPages}`);
    
    let fullText = "";
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`[PDF] Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text items and join them with spaces
      const pageText = textContent.items
        .map((item: any) => {
          // Handle different item types
          if (item.str) {
            return item.str;
          }
          return '';
        })
        .filter(text => text.trim().length > 0)
        .join(' ');
      
      if (pageText.trim()) {
        fullText += pageText + "\n";
      }
    }
    
    console.log(`[PDF] Text extraction completed. Total characters: ${fullText.length}`);
    
    if (fullText.length < 50) {
      throw new Error('PDF appears to be empty or contains no readable text');
    }
    
    return fullText.trim();
    
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
