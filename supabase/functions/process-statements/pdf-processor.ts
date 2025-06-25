
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting PDF text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    console.log(`[PDF] PDF file size: ${pdfBytes.length} bytes`);
    
    // Use the correct PDF.js import for Deno
    const pdfjsLib = await import('https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.js');
    
    // Set up worker
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = 
      'https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.worker.js';
    
    console.log('[PDF] PDF.js loaded successfully');
    
    // Load the PDF document
    const loadingTask = (pdfjsLib as any).getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    
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
    console.error('[PDF] Error with PDF.js extraction:', error);
    
    // Enhanced fallback extraction
    console.log('[PDF] Trying enhanced fallback extraction...');
    
    try {
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to string with better encoding handling
      let text = '';
      for (let i = 0; i < uint8Array.length; i++) {
        const byte = uint8Array[i];
        // Only include printable ASCII and common UTF-8 characters
        if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
          text += String.fromCharCode(byte);
        } else if (byte > 127) {
          // Try to handle UTF-8 sequences
          text += String.fromCharCode(byte);
        } else {
          text += ' ';
        }
      }
      
      // Clean up the text and look for banking patterns
      const lines = text.split(/[\r\n]+/);
      const cleanLines = [];
      
      for (const line of lines) {
        const cleaned = line
          .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Look for lines that might contain transaction data
        if (cleaned.length > 5 && (
          cleaned.includes('R$') ||
          cleaned.includes('USD') ||
          cleaned.includes('EUR') ||
          /\d{1,2}\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)/i.test(cleaned) ||
          /(Uber|iFood|Pag|Transf|PIX|TED|Compra)/i.test(cleaned)
        )) {
          cleanLines.push(cleaned);
        }
      }
      
      const fallbackText = cleanLines.join('\n');
      console.log(`[PDF] Enhanced fallback extraction: ${fallbackText.length} characters`);
      console.log(`[PDF] Sample fallback text:`, fallbackText.slice(0, 500));
      
      if (fallbackText.length > 50) {
        return fallbackText;
      }
      
      // Final fallback - return raw decoded text
      const rawText = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
      console.log(`[PDF] Raw fallback text length: ${rawText.length}`);
      return rawText;
      
    } catch (fallbackError) {
      console.error('[PDF] All extraction methods failed:', fallbackError);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
};
