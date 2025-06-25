
import {
  getDocument,
  GlobalWorkerOptions
} from "npm:pdfjs-dist@3.11.174/build/pdf.mjs";

/* Registrar o worker do pdfjs – hospedado via esm.sh */
GlobalWorkerOptions.workerSrc =
  "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

console.log("[PDFJS] workerSrc set to remote URL");

export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = new Uint8Array(arrayBuffer);
    
    console.log(`[PDF] size=${pdfBuffer.length} bytes`);
    
    // Load the PDF document
    const pdf = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
    console.log(`[PDF] pages=${pdf.numPages}`);
    
    let fullText = "";
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    
    console.log(`[PDF] Extracted text length: ${fullText.length} characters`);
    return fullText.trim();
    
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
