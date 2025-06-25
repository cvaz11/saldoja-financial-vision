
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting PDF text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    console.log(`[PDF] PDF file size: ${arrayBuffer.byteLength} bytes`);
    
    // Use dynamic import for pdf.js to avoid bundle issues
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@3.11.174/build/pdf.min.js');
    
    // Initialize PDF.js
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      verbosity: 0 // Reduce logging
    }).promise;
    
    console.log(`[PDF] PDF loaded successfully. Pages: ${pdf.numPages}`);
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine all text items with spaces
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += pageText + '\n';
          console.log(`[PDF] Page ${pageNum}: ${pageText.length} characters extracted`);
        }
      } catch (pageError) {
        console.error(`[PDF] Error extracting page ${pageNum}:`, pageError);
      }
    }
    
    console.log(`[PDF] Total extracted text length: ${fullText.length} characters`);
    console.log(`[PDF] Sample extracted text:`, fullText.slice(0, 500));
    
    if (fullText.length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }
    
    return fullText;
    
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    
    // Fallback to simple binary text extraction
    console.log('[PDF] Falling back to binary text extraction...');
    
    try {
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
      
      // Look for readable text patterns
      const lines = text.split('\n');
      const readableLines = lines.filter(line => {
        const cleanLine = line.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ').trim();
        return cleanLine.length > 10 && /[a-zA-Z]/.test(cleanLine);
      });
      
      const fallbackText = readableLines.join('\n');
      console.log(`[PDF] Fallback extraction: ${fallbackText.length} characters`);
      
      if (fallbackText.length > 0) {
        return fallbackText;
      }
    } catch (fallbackError) {
      console.error('[PDF] Fallback extraction failed:', fallbackError);
    }
    
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
