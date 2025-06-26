
// Novo parser de PDF otimizado para Nubank usando múltiplas estratégias
export class NubankPDFParser {
  
  async extractText(fileData: Blob): Promise<string> {
    try {
      console.log('[PDF-PARSER] ===== INICIANDO EXTRAÇÃO NUBANK =====');
      console.log('[PDF-PARSER] Tamanho do arquivo:', fileData.size, 'bytes');
      
      // Converter blob para array buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Verificar assinatura PDF
      const pdfSignature = new TextDecoder('utf-8').decode(uint8Array.slice(0, 4));
      if (!pdfSignature.startsWith('%PDF')) {
        throw new Error('Arquivo não é um PDF válido');
      }
      
      console.log('[PDF-PARSER] PDF válido detectado, versão:', pdfSignature);
      
      // Estratégia 1: Extração por objetos de texto
      const textFromObjects = this.extractFromTextObjects(uint8Array);
      console.log('[PDF-PARSER] Texto extraído via objetos:', textFromObjects.length, 'caracteres');
      
      // Estratégia 2: Extração por streams
      const textFromStreams = this.extractFromStreams(uint8Array);
      console.log('[PDF-PARSER] Texto extraído via streams:', textFromStreams.length, 'caracteres');
      
      // Estratégia 3: Varredura de bytes legíveis
      const textFromBytes = this.extractReadableBytes(uint8Array);
      console.log('[PDF-PARSER] Texto extraído via bytes:', textFromBytes.length, 'caracteres');
      
      // Combinar todos os textos extraídos
      const combinedText = [textFromObjects, textFromStreams, textFromBytes].join(' ');
      
      // Limpeza final
      const cleanedText = this.cleanExtractedText(combinedText);
      
      console.log('[PDF-PARSER] Texto final limpo:', cleanedText.length, 'caracteres');
      console.log('[PDF-PARSER] Amostra do texto (primeiros 500 chars):', cleanedText.slice(0, 500));
      
      return cleanedText;
      
    } catch (error) {
      console.error('[PDF-PARSER] ERRO na extração:', error);
      throw error;
    }
  }
  
  private extractFromTextObjects(data: Uint8Array): string {
    const text = new TextDecoder('latin1').decode(data);
    const textBlocks: string[] = [];
    
    // Padrões para blocos de texto
    const patterns = [
      /BT\s+([\s\S]*?)\s+ET/gi,  // Blocos de texto básicos
      /\((.*?)\)\s*Tj/gi,        // Comandos de texto simples
      /\[(.*?)\]\s*TJ/gi,        // Arrays de texto
      /\/F\d+.*?Tf.*?\((.*?)\)/gi, // Texto com fonte
    ];
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        let content = match[1] || match[0];
        if (content && content.length > 3) {
          // Limpar escape sequences
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
  
  private extractFromStreams(data: Uint8Array): string {
    const text = new TextDecoder('latin1').decode(data);
    const streamBlocks: string[] = [];
    
    // Encontrar todos os streams
    const streamPattern = /stream\s*([\s\S]*?)\s*endstream/gi;
    const matches = text.matchAll(streamPattern);
    
    for (const match of matches) {
      let streamContent = match[1];
      if (streamContent && streamContent.length > 20) {
        // Tentar decodificar o stream
        const decoded = this.decodeStreamContent(streamContent);
        if (decoded && decoded.length > 10) {
          streamBlocks.push(decoded);
        }
      }
    }
    
    return streamBlocks.join(' ');
  }
  
  private decodeStreamContent(content: string): string {
    // Extrair caracteres legíveis do stream
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
  
  private extractReadableBytes(data: Uint8Array): string {
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
  
  private cleanExtractedText(text: string): string {
    return text
      .replace(/\0/g, ' ')
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{8,}/g, '$1$1') // Reduzir repetições excessivas
      .trim();
  }
}
