
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting PDF text extraction...');
    console.log('[PDF] File size:', fileData.size, 'bytes');
    console.log('[PDF] File type:', fileData.type);
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    console.log(`[PDF] PDF converted to ${pdfBytes.length} bytes`);
    
    // Verify it's actually a PDF
    const header = new TextDecoder('utf-8').decode(pdfBytes.slice(0, 8));
    console.log('[PDF] File header:', header);
    
    if (!header.startsWith('%PDF')) {
      throw new Error('File is not a valid PDF');
    }
    
    // Convert to binary string for processing
    const binaryString = new TextDecoder('latin1').decode(pdfBytes);
    console.log(`[PDF] Binary string length: ${binaryString.length}`);
    
    let extractedText = '';
    const textSegments = [];
    
    // Method 1: Extract from PDF objects
    console.log('[PDF] Method 1: Extracting from PDF objects...');
    const objectMatches = binaryString.match(/\d+ \d+ obj[\s\S]*?endobj/g) || [];
    console.log(`[PDF] Found ${objectMatches.length} PDF objects`);
    
    for (const obj of objectMatches) {
      // Look for text in parentheses (common PDF text encoding)
      const textMatches = obj.match(/\(([^)]*)\)/g) || [];
      for (const match of textMatches) {
        const cleanText = match.replace(/[()]/g, '').trim();
        if (cleanText.length > 2 && /[a-zA-Z0-9]/.test(cleanText)) {
          textSegments.push(cleanText);
        }
      }
      
      // Look for text in brackets
      const bracketMatches = obj.match(/\[([^\]]*)\]/g) || [];
      for (const match of bracketMatches) {
        const cleanText = match.replace(/[\[\]]/g, '').trim();
        if (cleanText.length > 2 && /[a-zA-Z0-9]/.test(cleanText)) {
          textSegments.push(cleanText);
        }
      }
    }
    
    console.log(`[PDF] Method 1 extracted ${textSegments.length} text segments`);
    
    // Method 2: Extract from PDF streams
    console.log('[PDF] Method 2: Extracting from PDF streams...');
    const streamMatches = binaryString.match(/stream\s*([\s\S]*?)\s*endstream/g) || [];
    console.log(`[PDF] Found ${streamMatches.length} PDF streams`);
    
    for (const stream of streamMatches) {
      const content = stream.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
      // Extract readable characters from stream
      const readableText = content.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ').replace(/\s+/g, ' ').trim();
      if (readableText.length > 10) {
        textSegments.push(readableText);
      }
    }
    
    // Method 3: Direct binary extraction with enhanced character mapping
    console.log('[PDF] Method 3: Direct binary extraction...');
    const directText = Array.from(pdfBytes)
      .map(byte => {
        if (byte >= 32 && byte <= 126) return String.fromCharCode(byte); // ASCII printable
        if (byte >= 160 && byte <= 255) return String.fromCharCode(byte); // Extended ASCII
        if (byte === 10 || byte === 13) return '\n'; // Line breaks
        if (byte === 9) return ' '; // Tab
        return '';
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (directText.length > 100) {
      textSegments.push(directText);
    }
    
    // Combine all extracted text
    extractedText = textSegments.join(' ');
    console.log(`[PDF] Total extracted text length: ${extractedText.length} characters`);
    
    // Enhanced banking pattern filtering
    const lines = extractedText.split(/[\r\n]+/);
    const bankingLines = [];
    
    for (const line of lines) {
      const cleaned = line.replace(/\s+/g, ' ').trim();
      
      if (cleaned.length > 5) {
        // Look for banking-specific patterns
        const hasBankingPattern = 
          /R\$\s*[\d.,]+|USD\s*[\d.,]+|EUR\s*[\d.,]+/.test(cleaned) ||
          /\d{1,2}[\s\/\-](Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez|01|02|03|04|05|06|07|08|09|10|11|12)[\s\/\-]\d{2,4}/i.test(cleaned) ||
          /(Nubank|Nu\s|PIX|TED|Transferencia|Compra|Debito|Credito|Saldo|Extrato|Fatura)/i.test(cleaned) ||
          /(Uber|iFood|Mercado|Shopping|Farmacia|Restaurant|Posto|Gasolina|Supermercado)/i.test(cleaned) ||
          /parcela\s+\d+\/\d+/i.test(cleaned);
        
        if (hasBankingPattern) {
          bankingLines.push(cleaned);
        }
      }
    }
    
    // If we found banking-specific content, use that
    if (bankingLines.length > 0) {
      extractedText = bankingLines.join('\n');
      console.log(`[PDF] Using ${bankingLines.length} banking-specific lines`);
    }
    
    console.log(`[PDF] Final extracted text length: ${extractedText.length} characters`);
    console.log(`[PDF] Sample extracted text:`, extractedText.slice(0, 1000));
    
    if (extractedText.length < 50) {
      console.log('[PDF] WARNING: Very little text extracted, PDF might be image-based or heavily encrypted');
      // Return raw text as last resort
      return directText.slice(0, 5000);
    }
    
    return extractedText.slice(0, 8000); // Limit to avoid token limits
    
  } catch (error) {
    console.error('[PDF] Critical error in PDF extraction:', error);
    console.error('[PDF] Error stack:', error.stack);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
