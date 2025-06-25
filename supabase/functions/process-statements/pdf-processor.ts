
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting PDF text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    console.log(`[PDF] PDF file size: ${pdfBytes.length} bytes`);
    
    // Try modern PDF.js import for Deno
    try {
      console.log('[PDF] Attempting PDF.js extraction...');
      
      // Import PDF.js with correct Deno-compatible way
      const { getDocument, GlobalWorkerOptions } = await import('https://esm.sh/pdfjs-dist@3.11.174/build/pdf.mjs');
      
      // Set worker source
      GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.mjs';
      
      console.log('[PDF] PDF.js loaded successfully');
      
      // Load the PDF document
      const loadingTask = getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      
      console.log(`[PDF] PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine all text items with spaces and preserve structure
          const pageText = textContent.items
            .map((item: any) => {
              // Add some spacing context based on positioning
              const str = item.str || '';
              if (str.trim() === '') return ' ';
              return str;
            })
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
      
      if (fullText.length > 100) {
        return fullText;
      }
      
    } catch (pdfjsError) {
      console.error('[PDF] PDF.js failed:', pdfjsError);
    }
    
    console.log('[PDF] Falling back to binary text extraction...');
    
    // Enhanced binary extraction for banking documents
    const uint8Array = new Uint8Array(arrayBuffer);
    let rawText = '';
    
    // First pass: extract readable text
    for (let i = 0; i < uint8Array.length - 1; i++) {
      const byte = uint8Array[i];
      const nextByte = uint8Array[i + 1];
      
      // Look for text patterns in PDF
      if (byte >= 32 && byte <= 126) {
        rawText += String.fromCharCode(byte);
      } else if (byte === 10 || byte === 13) {
        rawText += '\n';
      } else if (byte > 160 && byte < 255) {
        // Handle accented characters
        rawText += String.fromCharCode(byte);
      } else {
        rawText += ' ';
      }
    }
    
    console.log(`[PDF] Raw text length: ${rawText.length}`);
    
    // Second pass: look for banking patterns
    const lines = rawText.split(/[\r\n]+/);
    const bankingLines = [];
    
    for (const line of lines) {
      const cleaned = line.replace(/\s+/g, ' ').trim();
      
      // Look for lines that might contain transaction data
      if (cleaned.length > 10 && (
        // Money patterns
        /R\$[\s\d.,]+/.test(cleaned) ||
        /USD[\s\d.,]+/.test(cleaned) ||
        /EUR[\s\d.,]+/.test(cleaned) ||
        // Date patterns
        /\d{1,2}\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)/i.test(cleaned) ||
        // Common transaction words
        /(Uber|iFood|Pag|Transf|PIX|TED|Compra|Parcela|Agi|Tech|Mercado|Farmacia)/i.test(cleaned) ||
        // Banking terms
        /(Saldo|Extrato|Conta|Cartao|Limite)/i.test(cleaned)
      )) {
        bankingLines.push(cleaned);
      }
    }
    
    const extractedText = bankingLines.join('\n');
    console.log(`[PDF] Banking text extraction: ${extractedText.length} characters`);
    console.log(`[PDF] Sample banking text:`, extractedText.slice(0, 500));
    
    if (extractedText.length > 50) {
      return extractedText;
    }
    
    // Final fallback - return first 2000 chars of raw text
    const fallbackText = rawText.slice(0, 2000);
    console.log(`[PDF] Final fallback text length: ${fallbackText.length}`);
    return fallbackText;
    
  } catch (error) {
    console.error('[PDF] All extraction methods failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
