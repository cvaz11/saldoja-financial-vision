
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] ===== STARTING PDF TEXT EXTRACTION =====');
    console.log('[PDF] File size:', fileData.size, 'bytes');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log(`[PDF] PDF loaded as ${uint8Array.length} bytes`);
    
    // Check PDF signature
    const pdfSignature = new TextDecoder('utf-8').decode(uint8Array.slice(0, 4));
    if (!pdfSignature.startsWith('%PDF')) {
      throw new Error('File is not a valid PDF');
    }
    
    console.log('[PDF] Valid PDF detected, version:', pdfSignature);
    
    // Extract text using multiple strategies
    const textFromObjects = extractFromTextObjects(uint8Array);
    const textFromStreams = extractFromStreams(uint8Array);
    const textFromBytes = extractReadableBytes(uint8Array);
    
    console.log('[PDF] Text extracted via objects:', textFromObjects.length, 'characters');
    console.log('[PDF] Text extracted via streams:', textFromStreams.length, 'characters');
    console.log('[PDF] Text extracted via bytes:', textFromBytes.length, 'characters');
    
    // Combine all extracted text
    const combinedText = [textFromObjects, textFromStreams, textFromBytes].join(' ');
    const cleanedText = cleanExtractedText(combinedText);
    
    console.log(`[PDF] Total extracted text length: ${cleanedText.length} characters`);
    console.log(`[PDF] Sample text (first 500 chars):`);
    console.log(cleanedText.slice(0, 500));
    
    if (cleanedText.length < 50) {
      throw new Error('Very little text extracted - PDF might be image-based or corrupted');
    }
    
    console.log('[PDF] ===== PDF EXTRACTION COMPLETED SUCCESSFULLY =====');
    return cleanedText;
    
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

function extractFromTextObjects(data: Uint8Array): string {
  const text = new TextDecoder('latin1').decode(data);
  const textBlocks: string[] = [];
  
  // Patterns for text blocks
  const patterns = [
    /BT\s+([\s\S]*?)\s+ET/gi,  // Basic text blocks
    /\((.*?)\)\s*Tj/gi,        // Simple text commands
    /\[(.*?)\]\s*TJ/gi,        // Text arrays
    /\/F\d+.*?Tf.*?\((.*?)\)/gi, // Text with font
  ];
  
  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let content = match[1] || match[0];
      if (content && content.length > 3) {
        // Clean escape sequences
        content = content
          .replace(/\\[nrt]/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .trim();
        
        if (content.length > 5) {
          textBlocks.push(content);
        }
      }
    }
  });
  
  return textBlocks.join(' ');
}

function extractFromStreams(data: Uint8Array): string {
  const text = new TextDecoder('latin1').decode(data);
  const streamBlocks: string[] = [];
  
  // Find all streams
  const streamPattern = /stream\s*([\s\S]*?)\s*endstream/gi;
  const matches = text.matchAll(streamPattern);
  
  for (const match of matches) {
    let streamContent = match[1];
    if (streamContent && streamContent.length > 20) {
      // Try to decode the stream
      const decoded = decodeStreamContent(streamContent);
      if (decoded && decoded.length > 10) {
        streamBlocks.push(decoded);
      }
    }
  }
  
  return streamBlocks.join(' ');
}

function decodeStreamContent(content: string): string {
  // Extract readable characters from stream
  let readable = '';
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
      readable += content.charAt(i);
    } else if (char >= 160 && char <= 255) {
      readable += content.charAt(i);
    } else {
      readable += ' ';
    }
  }
  
  return readable.replace(/\s+/g, ' ').trim();
}

function extractReadableBytes(data: Uint8Array): string {
  let readable = '';
  let consecutiveReadable = 0;
  const chunks: string[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      readable += String.fromCharCode(byte);
      consecutiveReadable++;
    } else if (byte >= 160 && byte <= 255) {
      readable += String.fromCharCode(byte);
      consecutiveReadable++;
    } else {
      if (consecutiveReadable > 10) {
        const segment = readable.slice(-consecutiveReadable).trim();
        if (segment.length > 8 && /[a-zA-Z0-9]/.test(segment)) {
          chunks.push(segment);
        }
      }
      readable += ' ';
      consecutiveReadable = 0;
    }
  }
  
  return chunks.join(' ');
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\0/g, ' ')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(.)\1{8,}/g, '$1$1') // Reduce excessive repetitions
    .trim();
}
