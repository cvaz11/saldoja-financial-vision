
export const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting PDF text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    console.log(`[PDF] PDF file size: ${arrayBuffer.byteLength} bytes`);
    
    // Convert to Uint8Array for processing
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Try to extract text using multiple approaches
    let extractedText = '';
    
    // Method 1: Look for text streams in PDF
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const pdfString = textDecoder.decode(uint8Array);
    
    // Extract text between BT (Begin Text) and ET (End Text) markers
    const textBlocks = [];
    const btPattern = /BT\s+(.*?)\s+ET/gs;
    let match;
    
    while ((match = btPattern.exec(pdfString)) !== null) {
      const textBlock = match[1];
      if (textBlock && textBlock.length > 5) {
        // Clean up the text block
        const cleanText = textBlock
          .replace(/\s+/g, ' ')
          .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ')
          .trim();
        
        if (cleanText.length > 10) {
          textBlocks.push(cleanText);
        }
      }
    }
    
    // Method 2: Look for Tj operators (show text)
    const tjPattern = /\((.*?)\)\s*Tj/g;
    const tjTexts = [];
    
    while ((match = tjPattern.exec(pdfString)) !== null) {
      const text = match[1];
      if (text && text.length > 2) {
        tjTexts.push(text);
      }
    }
    
    // Method 3: Extract readable ASCII text
    const asciiText = [];
    let currentText = '';
    
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      
      if (byte >= 32 && byte <= 126) { // Printable ASCII
        currentText += String.fromCharCode(byte);
      } else if (byte === 10 || byte === 13) { // Line breaks
        if (currentText.trim().length > 5) {
          asciiText.push(currentText.trim());
        }
        currentText = '';
      } else {
        if (currentText.trim().length > 5) {
          asciiText.push(currentText.trim());
        }
        currentText = '';
      }
    }
    
    // Add final text if exists
    if (currentText.trim().length > 5) {
      asciiText.push(currentText.trim());
    }
    
    // Combine all extracted text
    const allText = [
      ...textBlocks,
      ...tjTexts,
      ...asciiText.filter(text => 
        text.length > 10 && 
        !/^[0-9\s\.\-\+\/\\<>]+$/.test(text) && // Skip pure numbers/symbols
        !text.includes('obj') &&
        !text.includes('endobj') &&
        !text.includes('stream') &&
        !text.includes('endstream')
      )
    ];
    
    extractedText = allText.join('\n').trim();
    
    console.log(`[PDF] Extracted text length: ${extractedText.length} characters`);
    console.log(`[PDF] Sample text preview:`, extractedText.substring(0, 500));
    
    if (extractedText.length === 0) {
      console.log('[PDF] No text extracted, PDF might be image-based or encrypted');
      throw new Error('No text could be extracted from the PDF. The PDF might be image-based or encrypted.');
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
