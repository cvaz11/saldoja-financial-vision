
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] ===== STARTING ENHANCED PDF TEXT EXTRACTION =====');
    console.log('[PDF] File size:', fileData.size, 'bytes');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log(`[PDF] PDF loaded as ${uint8Array.length} bytes`);
    
    // Verify it's a PDF
    const pdfSignature = new TextDecoder('utf-8').decode(uint8Array.slice(0, 4));
    console.log('[PDF] File signature:', pdfSignature);
    
    if (!pdfSignature.startsWith('%PDF')) {
      throw new Error('Invalid PDF file signature');
    }
    
    // Convert to string for text processing using multiple encodings
    const latin1Text = new TextDecoder('latin1').decode(uint8Array);
    const utf8Text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(uint8Array);
    
    console.log(`[PDF] Latin1 text length: ${latin1Text.length}`);
    console.log(`[PDF] UTF8 text length: ${utf8Text.length}`);
    
    let extractedTexts = new Set<string>();
    
    // Method 1: Extract from stream objects with comprehensive patterns
    console.log('[PDF] === METHOD 1: Stream Object Extraction ===');
    const streamMatches = latin1Text.matchAll(/(\d+\s+\d+\s+obj[\s\S]*?stream\s*)([\s\S]*?)(\s*endstream)/gi);
    let streamCount = 0;
    
    for (const match of streamMatches) {
      streamCount++;
      if (streamCount > 50) break; // Limit processing
      
      const streamContent = match[2];
      console.log(`[PDF] Processing stream ${streamCount}, length: ${streamContent.length}`);
      
      // Try different decompression approaches
      let textContent = '';
      
      // Direct character extraction with better filtering
      for (let i = 0; i < streamContent.length; i++) {
        const char = streamContent.charCodeAt(i);
        if ((char >= 32 && char <= 126) || char === 10 || char === 13 || char === 9) {
          textContent += streamContent.charAt(i);
        } else if (char >= 160 && char <= 255) {
          textContent += streamContent.charAt(i);
        } else {
          textContent += ' ';
        }
      }
      
      // Clean and extract meaningful text
      const cleanedContent = textContent
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s.,;:!?@#$%&*()[\]{}<>/\\|+=\-"'`~]/g, ' ')
        .trim();
      
      if (cleanedContent.length > 20) {
        extractedTexts.add(cleanedContent);
        console.log(`[PDF] Stream ${streamCount} added text segment of ${cleanedContent.length} chars`);
      }
    }
    
    // Method 2: Text object extraction with enhanced patterns
    console.log('[PDF] === METHOD 2: Text Object Patterns ===');
    const textPatterns = [
      /BT\s+([\s\S]*?)\s+ET/gi,  // Text blocks
      /\((.*?)\)\s*Tj/gi,        // Text show
      /\[(.*?)\]\s*TJ/gi,        // Text show with positioning
      /\/F\d+\s+\d+\s+Tf\s+([\s\S]*?)(?=\/F\d+|\s*BT|\s*ET|$)/gi, // Font definitions with text
    ];
    
    for (const pattern of textPatterns) {
      const matches = latin1Text.matchAll(pattern);
      for (const match of matches) {
        let textContent = match[1] || match[0];
        
        // Clean escape sequences and formatting
        textContent = textContent
          .replace(/\\[nrt]/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (textContent.length > 5 && /[a-zA-Z0-9]/.test(textContent)) {
          extractedTexts.add(textContent);
        }
      }
    }
    
    // Method 3: Raw byte sequence scanning for readable text
    console.log('[PDF] === METHOD 3: Byte Sequence Scanning ===');
    let currentText = '';
    let consecutiveReadable = 0;
    
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        currentText += String.fromCharCode(byte);
        consecutiveReadable++;
      } else if (byte >= 160 && byte <= 255) {
        currentText += String.fromCharCode(byte);
        consecutiveReadable++;
      } else {
        if (consecutiveReadable > 15) {
          const segment = currentText.slice(-consecutiveReadable).trim();
          if (segment.length > 10 && /[a-zA-Z0-9]/.test(segment)) {
            extractedTexts.add(segment);
          }
        }
        currentText += ' ';
        consecutiveReadable = 0;
      }
    }
    
    // Method 4: Look for specific Nubank patterns in raw text
    console.log('[PDF] === METHOD 4: Nubank Pattern Recognition ===');
    const fullText = latin1Text + ' ' + utf8Text;
    
    // Look for Nubank-specific patterns
    const nubankPatterns = [
      /\d{1,2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+.*?R\$\s*[\d.,]+/gi,
      /(?:IOF|Compra|Pagamento).*?R\$\s*[\d.,]+/gi,
      /\*{4}\s*\d{4}.*?R\$\s*[\d.,]+/gi,
    ];
    
    for (const pattern of nubankPatterns) {
      const matches = fullText.matchAll(pattern);
      for (const match of matches) {
        extractedTexts.add(match[0].trim());
      }
    }
    
    // Combine all extracted text
    const allText = Array.from(extractedTexts).join(' ');
    console.log(`[PDF] Total extracted segments: ${extractedTexts.size}`);
    console.log(`[PDF] Combined text length: ${allText.length}`);
    
    // Final cleaning
    const finalText = allText
      .replace(/\0/g, ' ')
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{10,}/g, '$1$1$1') // Reduce excessive repetitions
      .trim();
    
    console.log(`[PDF] Final cleaned text length: ${finalText.length}`);
    console.log(`[PDF] Sample text (first 1000 chars):`);
    console.log(finalText.slice(0, 1000));
    
    if (finalText.length < 100) {
      console.log('[PDF] WARNING: Very little text extracted');
      console.log('[PDF] This PDF might be image-based or use complex encoding');
      
      // Try one more fallback - look for any numeric patterns that might be amounts
      const fallbackPattern = /R\$\s*[\d.,]+|\d+[.,]\d{2}/g;
      const amounts = fullText.match(fallbackPattern) || [];
      console.log(`[PDF] Found ${amounts.length} potential amounts: ${amounts.slice(0, 10).join(', ')}`);
      
      if (amounts.length > 0) {
        return `Fallback extraction found amounts: ${amounts.join(' ')} ${finalText}`.slice(0, 20000);
      }
    }
    
    console.log('[PDF] ===== PDF EXTRACTION COMPLETED =====');
    return finalText.slice(0, 20000);
    
  } catch (error) {
    console.error('[PDF] CRITICAL ERROR in PDF processing:', error);
    console.error('[PDF] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw new Error(`PDF processing failed: ${error.message}`);
  }
};
