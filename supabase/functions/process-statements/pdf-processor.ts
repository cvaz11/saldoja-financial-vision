
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] ===== STARTING COMPREHENSIVE PDF EXTRACTION =====');
    console.log('[PDF] File size:', fileData.size, 'bytes');
    
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
    
    // Convert to different encodings for better text extraction
    const latin1String = new TextDecoder('latin1').decode(pdfBytes);
    const utf8String = new TextDecoder('utf-8', { ignoreBOM: true }).decode(pdfBytes);
    
    console.log(`[PDF] Latin1 string length: ${latin1String.length}`);
    console.log(`[PDF] UTF8 string length: ${utf8String.length}`);
    
    let allExtractedText = '';
    const textSegments = new Set<string>(); // Use Set to avoid duplicates
    
    // Method 1: Enhanced stream extraction with better decoding
    console.log('[PDF] === METHOD 1: Enhanced Stream Extraction ===');
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi;
    let streamMatch;
    let streamCount = 0;
    
    while ((streamMatch = streamRegex.exec(latin1String)) !== null && streamCount < 100) {
      streamCount++;
      const streamContent = streamMatch[1];
      
      // Try to decode the stream content
      let decodedText = '';
      
      // Method 1a: Direct character extraction
      for (let i = 0; i < streamContent.length; i++) {
        const char = streamContent.charCodeAt(i);
        if ((char >= 32 && char <= 126) || (char >= 160 && char <= 255)) {
          decodedText += streamContent.charAt(i);
        } else if (char === 10 || char === 13) {
          decodedText += ' ';
        }
      }
      
      // Clean and filter the text
      decodedText = decodedText
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s.,;:!?@#$%&*()[\]{}<>\/\\|+=\-"'`~]/g, ' ')
        .trim();
      
      if (decodedText.length > 20) {
        textSegments.add(decodedText);
      }
    }
    
    console.log(`[PDF] Found ${streamCount} streams, extracted ${textSegments.size} text segments`);
    
    // Method 2: PDF object text extraction
    console.log('[PDF] === METHOD 2: PDF Object Text Extraction ===');
    const objectRegex = /\d+\s+\d+\s+obj\s*([\s\S]*?)\s*endobj/gi;
    let objectMatch;
    let objectCount = 0;
    
    while ((objectMatch = objectRegex.exec(latin1String)) !== null && objectCount < 200) {
      objectCount++;
      const objContent = objectMatch[1];
      
      // Extract text from various PDF text patterns
      const textPatterns = [
        /\(([^)]{3,})\)/g,  // Text in parentheses
        /\[([^\]]{3,})\]/g, // Text in brackets  
        /<([^>]{3,})>/g,    // Text in angle brackets
        /\/Title\s*\(([^)]+)\)/g, // Title
        /\/Subject\s*\(([^)]+)\)/g, // Subject
        /\/Contents\s*\(([^)]+)\)/g, // Contents
      ];
      
      for (const pattern of textPatterns) {
        let patternMatch;
        while ((patternMatch = pattern.exec(objContent)) !== null) {
          let extractedText = patternMatch[1]
            .replace(/\\[nrt]/g, ' ')
            .replace(/\\\\/g, '\\')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (extractedText.length > 5 && /[a-zA-Z0-9]/.test(extractedText)) {
            textSegments.add(extractedText);
          }
        }
      }
    }
    
    console.log(`[PDF] Processed ${objectCount} objects`);
    
    // Method 3: Raw byte scanning for readable text
    console.log('[PDF] === METHOD 3: Raw Byte Scanning ===');
    let rawText = '';
    let consecutiveReadable = 0;
    
    for (let i = 0; i < pdfBytes.length; i++) {
      const byte = pdfBytes[i];
      
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        rawText += String.fromCharCode(byte);
        consecutiveReadable++;
      } else if (byte >= 160 && byte <= 255) {
        // Extended ASCII
        rawText += String.fromCharCode(byte);
        consecutiveReadable++;
      } else {
        if (consecutiveReadable > 10) {
          // We had a good run of readable text
          const segment = rawText.slice(-consecutiveReadable).trim();
          if (segment.length > 10) {
            textSegments.add(segment);
          }
        }
        rawText += ' ';
        consecutiveReadable = 0;
      }
    }
    
    // Method 4: Look for specific PDF text encoding patterns
    console.log('[PDF] === METHOD 4: PDF Text Encoding Patterns ===');
    const encodingPatterns = [
      /Tj\s*$/gm,  // Text showing operator
      /TJ\s*$/gm,  // Text showing with individual glyph positioning
      /Td\s*$/gm,  // Move to start of next line
      /TD\s*$/gm,  // Move to start of next line and set leading
    ];
    
    for (const pattern of encodingPatterns) {
      const matches = latin1String.match(pattern);
      if (matches) {
        console.log(`[PDF] Found ${matches.length} text positioning operators`);
      }
    }
    
    // Combine all extracted text
    allExtractedText = Array.from(textSegments).join(' ');
    console.log(`[PDF] Total extracted text length: ${allExtractedText.length} characters`);
    console.log(`[PDF] Total unique segments: ${textSegments.size}`);
    
    // Enhanced cleaning and filtering
    const cleanedText = allExtractedText
      .replace(/\0/g, ' ')
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{5,}/g, '$1') // Remove excessive character repetitions
      .trim();
    
    console.log(`[PDF] Final cleaned text length: ${cleanedText.length} characters`);
    
    // Show sample of extracted text for debugging
    const sampleText = cleanedText.slice(0, 1000);
    console.log(`[PDF] Sample extracted text:`, sampleText);
    
    if (cleanedText.length < 50) {
      console.log('[PDF] WARNING: Very little text extracted from PDF');
      console.log('[PDF] This might be an image-based PDF or use unsupported encoding');
      
      // Try one more method - look for any readable sequences
      const fallbackText = latin1String.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`[PDF] Fallback text length: ${fallbackText.length}`);
      
      if (fallbackText.length > cleanedText.length) {
        return fallbackText.slice(0, 20000);
      }
    }
    
    return cleanedText.slice(0, 20000);
    
  } catch (error) {
    console.error('[PDF] Critical error in PDF extraction:', error);
    console.error('[PDF] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
