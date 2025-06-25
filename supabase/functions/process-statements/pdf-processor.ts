
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting robust PDF text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    console.log(`[PDF] PDF file size: ${pdfBytes.length} bytes`);
    
    // Advanced binary extraction optimized for Nubank PDFs
    let extractedText = '';
    
    // Convert to string for pattern matching
    const binaryString = Array.from(pdfBytes).map(byte => String.fromCharCode(byte)).join('');
    
    // Look for text between stream objects (PDF structure)
    const streamMatches = binaryString.match(/stream\s*(.*?)\s*endstream/gs);
    
    if (streamMatches) {
      console.log(`[PDF] Found ${streamMatches.length} stream objects`);
      
      for (const stream of streamMatches) {
        // Extract readable text from stream
        const streamContent = stream.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
        
        // Look for readable text patterns
        const readableText = streamContent.match(/[\x20-\x7E\u00A0-\u00FF]+/g);
        
        if (readableText) {
          extractedText += readableText.join(' ') + '\n';
        }
      }
    }
    
    // Enhanced pattern-based extraction for Nubank statements
    const allText = Array.from(pdfBytes)
      .map(byte => {
        // Convert byte to character if it's printable
        if (byte >= 32 && byte <= 126) return String.fromCharCode(byte);
        if (byte >= 160 && byte <= 255) return String.fromCharCode(byte);
        if (byte === 10 || byte === 13) return '\n';
        return ' ';
      })
      .join('');
    
    // Look for banking patterns in the raw text
    const lines = allText.split(/[\r\n]+/);
    const bankingLines = [];
    
    for (const line of lines) {
      const cleaned = line.replace(/\s+/g, ' ').trim();
      
      if (cleaned.length > 5) {
        // Look for money patterns (R$, USD, EUR)
        const hasMoneyPattern = /R\$\s*[\d.,]+|USD\s*[\d.,]+|EUR\s*[\d.,]+/.test(cleaned);
        
        // Look for date patterns
        const hasDatePattern = /\d{1,2}\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)/i.test(cleaned);
        
        // Look for transaction keywords
        const hasTransactionKeywords = /(Uber|iFood|Pag|Transf|PIX|TED|Compra|Parcela|Agi|Tech|Mercado|Farmacia|Netflix|Spotify|Shopping|Loja|Hospital|Restaurante|Padaria)/i.test(cleaned);
        
        // Look for banking terms
        const hasBankingTerms = /(Saldo|Extrato|Conta|Cartao|Limite|Fatura|Debito|Credito)/i.test(cleaned);
        
        if (hasMoneyPattern || hasDatePattern || hasTransactionKeywords || hasBankingTerms) {
          bankingLines.push(cleaned);
        }
      }
    }
    
    const finalText = bankingLines.join('\n');
    
    console.log(`[PDF] Extracted ${finalText.length} characters of banking text`);
    console.log(`[PDF] Sample extracted text:`, finalText.slice(0, 800));
    
    if (finalText.length > 100) {
      return finalText;
    }
    
    // Final fallback - return structured raw text
    const fallbackText = allText.replace(/\s+/g, ' ').trim();
    console.log(`[PDF] Using fallback text: ${fallbackText.length} characters`);
    
    return fallbackText.slice(0, 5000); // Limit to avoid token limits
    
  } catch (error) {
    console.error('[PDF] Error in text extraction:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
