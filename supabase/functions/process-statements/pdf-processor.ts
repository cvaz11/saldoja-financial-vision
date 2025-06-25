
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting advanced PDF text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    console.log(`[PDF] PDF file size: ${pdfBytes.length} bytes`);
    
    // Advanced multi-layer text extraction for Nubank PDFs
    let extractedText = '';
    
    // Method 1: Extract from PDF streams with better decoding
    const binaryString = new TextDecoder('latin1').decode(pdfBytes);
    
    // Look for text in PDF streams and objects
    const streamMatches = binaryString.match(/stream\s*([\s\S]*?)\s*endstream/g);
    const textObjects = [];
    
    if (streamMatches) {
      console.log(`[PDF] Found ${streamMatches.length} PDF streams`);
      
      for (const stream of streamMatches) {
        const content = stream.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
        
        // Try to decode FlateDecode streams (common in PDFs)
        try {
          // Look for readable text patterns in streams
          const readableMatches = content.match(/[\x20-\x7E\u00A0-\u00FF]{3,}/g);
          if (readableMatches) {
            textObjects.push(...readableMatches);
          }
        } catch (e) {
          // Continue with other methods
        }
      }
    }
    
    // Method 2: Extract text from PDF objects and font definitions
    const objectMatches = binaryString.match(/\d+ \d+ obj[\s\S]*?endobj/g);
    if (objectMatches) {
      console.log(`[PDF] Found ${objectMatches.length} PDF objects`);
      
      for (const obj of objectMatches) {
        // Look for text in various PDF constructs
        const textMatches = obj.match(/\((.*?)\)/g) || [];
        const bracketMatches = obj.match(/\[(.*?)\]/g) || [];
        
        textMatches.forEach(match => {
          const clean = match.replace(/[()]/g, '').trim();
          if (clean.length > 2 && /[a-zA-Z0-9]/.test(clean)) {
            textObjects.push(clean);
          }
        });
        
        bracketMatches.forEach(match => {
          const clean = match.replace(/[\[\]]/g, '').trim();
          if (clean.length > 2 && /[a-zA-Z0-9]/.test(clean)) {
            textObjects.push(clean);
          }
        });
      }
    }
    
    // Method 3: Advanced binary extraction with character mapping
    const rawText = Array.from(pdfBytes)
      .map(byte => {
        // Enhanced character mapping for better text extraction
        if (byte >= 32 && byte <= 126) return String.fromCharCode(byte); // ASCII printable
        if (byte >= 160 && byte <= 255) return String.fromCharCode(byte); // Extended ASCII
        if (byte === 10 || byte === 13) return '\n'; // Line breaks
        if (byte === 9) return ' '; // Tab to space
        return '';
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Combine all extracted text
    const allExtractedText = [...textObjects, rawText].join(' ');
    
    // Method 4: Pattern-based enhancement for banking data
    const lines = allExtractedText.split(/[\r\n]+/);
    const enhancedLines = [];
    
    for (const line of lines) {
      const cleaned = line.replace(/\s+/g, ' ').trim();
      
      if (cleaned.length > 5) {
        // Enhanced pattern matching for Nubank transactions
        const hasBankingPattern = 
          /R\$\s*[\d.,]+|USD\s*[\d.,]+|EUR\s*[\d.,]+/.test(cleaned) ||
          /\d{1,2}\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)/i.test(cleaned) ||
          /(Uber|iFood|Pag|Transf|PIX|TED|Compra|Parcela|Mercado|Farmacia|Netflix|Spotify|Shopping|Loja|Hospital|Restaurante|Padaria|Posto|Gasolina|Supermercado|Drogaria|Magazine|Lojas)/i.test(cleaned) ||
          /(Saldo|Extrato|Conta|Cartao|Limite|Fatura|Debito|Credito|Nubank|Nu|Pagamento|Compra|Transferencia)/i.test(cleaned) ||
          /\d{4}-\d{2}-\d{2}/.test(cleaned) ||
          /parcela\s+\d+\/\d+/i.test(cleaned);
        
        if (hasBankingPattern) {
          enhancedLines.push(cleaned);
        }
      }
    }
    
    // Method 5: Try to reconstruct transaction-like patterns
    const reconstructedText = enhancedLines.join('\n');
    
    // Final assembly
    let finalText = reconstructedText;
    
    if (finalText.length < 200) {
      // If banking patterns are sparse, include more raw text
      const filteredRawLines = lines
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(line => 
          line.length > 10 && 
          (line.includes('R$') || 
           line.includes('USD') || 
           /\d{1,2}\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)/i.test(line) ||
           /(Uber|iFood|Mercado|Farmacia|Shopping|Loja|Nubank)/i.test(line))
        );
      
      finalText = filteredRawLines.join('\n');
    }
    
    console.log(`[PDF] Final extracted text length: ${finalText.length} characters`);
    console.log(`[PDF] Sample final text:`, finalText.slice(0, 1200));
    
    if (finalText.length < 50) {
      // Last resort: return structured raw text with better filtering
      const emergencyText = allExtractedText
        .split(/\s+/)
        .filter(word => 
          word.length > 2 && 
          (word.includes('R$') || 
           word.includes('USD') ||
           /\d{2,}/.test(word) ||
           /[A-Za-z]{4,}/.test(word))
        )
        .join(' ');
      
      console.log(`[PDF] Using emergency extraction: ${emergencyText.length} characters`);
      return emergencyText.slice(0, 8000);
    }
    
    return finalText.slice(0, 8000); // Limit to avoid token limits
    
  } catch (error) {
    console.error('[PDF] Error in advanced text extraction:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
