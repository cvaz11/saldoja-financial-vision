
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] ===== STARTING ENHANCED NUBANK PDF EXTRACTION =====');
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
    
    // Method 1: Enhanced PDF stream extraction specifically for Nubank
    console.log('[PDF] Method 1: Enhanced Nubank-specific stream extraction...');
    const streamMatches = binaryString.match(/stream\s*([\s\S]*?)\s*endstream/g) || [];
    console.log(`[PDF] Found ${streamMatches.length} PDF streams`);
    
    for (const stream of streamMatches) {
      const content = stream.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
      
      // Enhanced text extraction with better character mapping
      let cleanText = '';
      for (let i = 0; i < content.length; i++) {
        const byte = content.charCodeAt(i);
        
        // Map common PDF encoded characters
        if (byte >= 32 && byte <= 126) {
          cleanText += String.fromCharCode(byte); // Standard ASCII
        } else if (byte >= 160 && byte <= 255) {
          cleanText += String.fromCharCode(byte); // Extended ASCII
        } else if (byte === 10 || byte === 13) {
          cleanText += '\n'; // Line breaks
        } else if (byte === 9) {
          cleanText += ' '; // Tab
        } else if (byte === 0) {
          cleanText += ' '; // Null bytes as spaces
        }
      }
      
      // Clean and normalize
      cleanText = cleanText
        .replace(/\0/g, ' ') // Remove null bytes
        .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Remove control chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      if (cleanText.length > 50) {
        textSegments.push(cleanText);
      }
    }
    
    // Method 2: Direct binary parsing with enhanced character detection
    console.log('[PDF] Method 2: Enhanced binary parsing...');
    let directText = '';
    
    for (let i = 0; i < pdfBytes.length; i++) {
      const byte = pdfBytes[i];
      
      if (byte >= 32 && byte <= 126) {
        directText += String.fromCharCode(byte);
      } else if (byte >= 192 && byte <= 255) {
        // Extended Latin characters common in Portuguese
        directText += String.fromCharCode(byte);
      } else if (byte === 10 || byte === 13) {
        directText += '\n';
      } else if (byte === 9 || byte === 32) {
        directText += ' ';
      } else if (byte === 0) {
        directText += ' ';
      }
    }
    
    // Clean direct text
    directText = directText
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{10,}/g, '$1') // Remove excessive repetitions
      .trim();
    
    if (directText.length > 100) {
      textSegments.push(directText);
    }
    
    // Method 3: PDF object text extraction with Nubank patterns
    console.log('[PDF] Method 3: PDF object extraction...');
    const objectMatches = binaryString.match(/\d+ \d+ obj[\s\S]*?endobj/g) || [];
    console.log(`[PDF] Found ${objectMatches.length} PDF objects`);
    
    for (const obj of objectMatches) {
      // Look for text in various PDF text encodings
      const textPatterns = [
        /\(([^)]*)\)/g,  // Text in parentheses
        /\[([^\]]*)\]/g, // Text in brackets
        /<([^>]*)>/g,    // Text in angle brackets
        /\/F\d+\s+(\w+)/g, // Font references
      ];
      
      for (const pattern of textPatterns) {
        const matches = obj.match(pattern) || [];
        for (const match of matches) {
          const cleanText = match
            .replace(/[()[\]<>]/g, '')
            .replace(/\\[nrt]/g, ' ')
            .trim();
          
          if (cleanText.length > 2 && /[a-zA-Z0-9]/.test(cleanText)) {
            textSegments.push(cleanText);
          }
        }
      }
    }
    
    // Combine all extracted text
    extractedText = textSegments.join(' ');
    console.log(`[PDF] Combined text length: ${extractedText.length} characters`);
    
    // Enhanced Nubank-specific filtering
    const lines = extractedText.split(/[\r\n]+/);
    const nubankLines = [];
    
    for (const line of lines) {
      const cleaned = line.replace(/\s+/g, ' ').trim();
      
      if (cleaned.length < 3) continue;
      
      // Look for Nubank transaction patterns
      const hasNubankPattern = 
        // Money patterns
        /R\$\s*[\d.,]+|USD\s*[\d.,]+|EUR\s*[\d.,]+|GBP\s*[\d.,]+|BRL\s*[\d.,]+/.test(cleaned) ||
        // Date patterns
        /\d{1,2}\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez|MAI|JUN)/i.test(cleaned) ||
        // Card numbers
        /\*{4}\s*\d{4}|\*{3}\s*\d{4}/.test(cleaned) ||
        // Common merchants
        /(Apple\.Com|PayPal|Uber|iFood|Amazon|Google|Netflix|Spotify)/i.test(cleaned) ||
        // Nubank specific terms
        /(IOF|Pagamento|Fatura|Extrato|Transações|TRANSAÇÕES)/i.test(cleaned) ||
        // Transaction descriptions
        /(Tech|Bill|Fruver|Cafe|Farmacia|Estacion|Parnasse|Apollo|Railway|Vodafone)/i.test(cleaned) ||
        // Installments
        /parcela\s*\d+\/\d+|\d+\/\d+\s*parcela/i.test(cleaned);
      
      if (hasNubankPattern) {
        nubankLines.push(cleaned);
      }
    }
    
    // Use Nubank-specific content if found
    if (nubankLines.length > 5) {
      extractedText = nubankLines.join('\n');
      console.log(`[PDF] Using ${nubankLines.length} Nubank-specific lines`);
    }
    
    console.log(`[PDF] Final extracted text length: ${extractedText.length} characters`);
    console.log(`[PDF] Sample extracted text:`, extractedText.slice(0, 2000));
    
    if (extractedText.length < 100) {
      console.log('[PDF] WARNING: Very little text extracted');
      // Return best available text
      return textSegments.join(' ').slice(0, 10000);
    }
    
    return extractedText.slice(0, 15000); // Increased limit for more content
    
  } catch (error) {
    console.error('[PDF] Critical error in PDF extraction:', error);
    console.error('[PDF] Error stack:', error.stack);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
