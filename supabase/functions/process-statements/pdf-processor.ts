
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting advanced PDF text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    console.log(`[PDF] PDF file size: ${arrayBuffer.byteLength} bytes`);
    
    // Convert to Uint8Array for processing
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to string for text processing
    const pdfString = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    
    console.log('[PDF] Searching for text content using multiple methods...');
    
    let extractedText = '';
    const textBlocks = [];
    
    // Method 1: Extract text from stream objects
    const streamPattern = /stream\s*\n([\s\S]*?)\nendstream/gi;
    let streamMatch;
    
    while ((streamMatch = streamPattern.exec(pdfString)) !== null) {
      const streamContent = streamMatch[1];
      if (streamContent && streamContent.length > 20) {
        // Look for readable text in stream
        const readableText = streamContent.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (readableText.length > 10 && /[a-zA-Z]/.test(readableText)) {
          textBlocks.push(readableText);
        }
      }
    }
    
    // Method 2: Look for text in parentheses (PDF text strings)
    const textStringPattern = /\(([^)]+)\)/g;
    let textMatch;
    
    while ((textMatch = textStringPattern.exec(pdfString)) !== null) {
      const text = textMatch[1];
      if (text && text.length > 2 && /[a-zA-Z0-9]/.test(text)) {
        textBlocks.push(text);
      }
    }
    
    // Method 3: Look for hexadecimal encoded text
    const hexPattern = /<([0-9A-Fa-f]+)>/g;
    let hexMatch;
    
    while ((hexMatch = hexPattern.exec(pdfString)) !== null) {
      try {
        const hexString = hexMatch[1];
        if (hexString.length % 2 === 0) {
          const bytes = [];
          for (let i = 0; i < hexString.length; i += 2) {
            bytes.push(parseInt(hexString.substr(i, 2), 16));
          }
          const text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
          if (text && text.length > 2 && /[a-zA-Z0-9]/.test(text)) {
            textBlocks.push(text);
          }
        }
      } catch (e) {
        // Ignore invalid hex strings
      }
    }
    
    // Method 4: Direct text extraction from PDF objects
    const objPattern = /\d+ \d+ obj\s*<<[^>]*>>\s*stream\s*\n([\s\S]*?)\nendstream/gi;
    let objMatch;
    
    while ((objMatch = objPattern.exec(pdfString)) !== null) {
      const objContent = objMatch[1];
      if (objContent) {
        // Try to extract readable text
        const lines = objContent.split('\n');
        for (const line of lines) {
          const cleanLine = line.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (cleanLine.length > 5 && /[a-zA-Z]/.test(cleanLine)) {
            textBlocks.push(cleanLine);
          }
        }
      }
    }
    
    // Method 5: Look for BT/ET text blocks with better parsing
    const btPattern = /BT\s+([\s\S]*?)\s+ET/gi;
    let btMatch;
    
    while ((btMatch = btPattern.exec(pdfString)) !== null) {
      const btContent = btMatch[1];
      
      // Look for Tj commands (show text)
      const tjPattern = /\(([^)]*)\)\s*Tj/gi;
      let tjMatch;
      
      while ((tjMatch = tjPattern.exec(btContent)) !== null) {
        const text = tjMatch[1];
        if (text && text.length > 1) {
          textBlocks.push(text);
        }
      }
      
      // Look for TJ commands (show text array)
      const tjArrayPattern = /\[\s*([^\]]*)\s*\]\s*TJ/gi;
      let tjArrayMatch;
      
      while ((tjArrayMatch = tjArrayPattern.exec(btContent)) !== null) {
        const arrayContent = tjArrayMatch[1];
        const textParts = arrayContent.match(/\(([^)]*)\)/g);
        if (textParts) {
          textParts.forEach(part => {
            const text = part.replace(/[()]/g, '');
            if (text && text.length > 1) {
              textBlocks.push(text);
            }
          });
        }
      }
    }
    
    // Method 6: Look for common Brazilian banking terms to find the right content
    const fullText = pdfString.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ');
    const bankingTerms = [
      'NUBANK', 'PIX', 'TED', 'DOC', 'DÉBITO', 'CRÉDITO', 'SALDO', 'EXTRATO',
      'COMPRA', 'PAGAMENTO', 'TRANSFERÊNCIA', 'CARTÃO', 'CONTA', 'BANCO',
      'VALOR', 'DATA', 'DESCRIÇÃO', 'LANÇAMENTO'
    ];
    
    for (const term of bankingTerms) {
      const termIndex = fullText.toUpperCase().indexOf(term);
      if (termIndex !== -1) {
        // Extract surrounding context
        const start = Math.max(0, termIndex - 200);
        const end = Math.min(fullText.length, termIndex + 500);
        const context = fullText.substring(start, end).trim();
        if (context.length > 50) {
          textBlocks.push(context);
        }
      }
    }
    
    // Combine and clean all extracted text
    const allText = textBlocks.join('\n').trim();
    
    // Remove duplicates and clean up
    const uniqueLines = [...new Set(allText.split('\n'))];
    const cleanText = uniqueLines
      .filter(line => line.trim().length > 3)
      .filter(line => /[a-zA-Z0-9]/.test(line))
      .join('\n');
    
    extractedText = cleanText;
    
    console.log(`[PDF] Final extracted text length: ${extractedText.length} characters`);
    console.log(`[PDF] Text blocks found: ${textBlocks.length}`);
    console.log(`[PDF] Sample extracted text:`, extractedText.substring(0, 800));
    
    if (extractedText.length === 0) {
      console.log('[PDF] No text extracted, PDF might be image-based or heavily encrypted');
      throw new Error('No readable text could be extracted from the PDF. The PDF might be image-based, encrypted, or use unsupported encoding.');
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
