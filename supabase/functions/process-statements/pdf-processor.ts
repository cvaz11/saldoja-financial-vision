
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting PDF text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    console.log(`[PDF] PDF file size: ${arrayBuffer.byteLength} bytes`);
    
    // For now, we'll use a simple text extraction approach
    // that works reliably in Edge Functions environment
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert PDF bytes to text using a simple approach
    let extractedText = '';
    const decoder = new TextDecoder('utf-8', { fatal: false });
    
    // Extract readable text from PDF buffer
    // This is a simplified approach that works with most PDF formats
    const textChunks = [];
    for (let i = 0; i < uint8Array.length - 4; i++) {
      // Look for text patterns in PDF
      if (uint8Array[i] === 0x42 && uint8Array[i + 1] === 0x54) { // "BT" (Begin Text)
        let chunk = '';
        for (let j = i + 2; j < Math.min(i + 200, uint8Array.length); j++) {
          const char = uint8Array[j];
          if (char >= 32 && char <= 126) { // Printable ASCII
            chunk += String.fromCharCode(char);
          } else if (char === 10 || char === 13) { // Line breaks
            chunk += '\n';
          }
        }
        if (chunk.trim().length > 3) {
          textChunks.push(chunk.trim());
        }
      }
    }
    
    // Also try simple string extraction
    const rawText = decoder.decode(uint8Array).replace(/[^\x20-\x7E\n\r]/g, ' ');
    const lines = rawText.split(/[\n\r]+/).filter(line => 
      line.trim().length > 5 && 
      /[a-zA-Z0-9]/.test(line) &&
      !line.includes('obj') &&
      !line.includes('endobj')
    );
    
    extractedText = [...textChunks, ...lines].join('\n').trim();
    
    console.log(`[PDF] Extracted text length: ${extractedText.length} characters`);
    console.log(`[PDF] Sample text: ${extractedText.substring(0, 200)}...`);
    
    if (extractedText.length === 0) {
      throw new Error('No text could be extracted from the PDF');
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
