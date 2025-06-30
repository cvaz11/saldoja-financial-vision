
export async function extractTextFromPDFBytes(fileData: Blob): Promise<string> {
  try {
    console.log('[PDF-PARSER] Iniciando extração de texto do PDF...');
    
    // Usar PDF.js para extrair texto
    const pdfjsModule = await import('https://esm.sh/pdfjs-dist@4.0.379/build/pdf.min.mjs');
    const { getDocument } = pdfjsModule;
    
    // Configurar worker
    pdfjsModule.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
    
    // Converter Blob para ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Carregar PDF
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    console.log(`[PDF-PARSER] PDF carregado com ${pdf.numPages} páginas`);
    
    let fullText = '';
    
    // Extrair texto de todas as páginas (máximo 20 páginas para performance)
    const maxPages = Math.min(pdf.numPages, 20);
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`[PDF-PARSER] Extraindo texto da página ${pageNum}/${maxPages}...`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combinar todos os itens de texto da página
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += pageText + '\n\n';
          console.log(`[PDF-PARSER] ✅ Página ${pageNum}: ${pageText.length} caracteres extraídos`);
        }
        
      } catch (pageError) {
        console.error(`[PDF-PARSER] Erro ao processar página ${pageNum}:`, pageError.message);
        continue;
      }
    }
    
    console.log(`[PDF-PARSER] ✅ Extração concluída: ${fullText.length} caracteres totais`);
    return fullText.trim();
    
  } catch (error) {
    console.error('[PDF-PARSER] ❌ Erro na extração de texto:', error.message);
    
    // Fallback: tentar extração simples de bytes
    try {
      console.log('[PDF-PARSER] Tentando extração simples como fallback...');
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let simpleText = '';
      for (let i = 0; i < uint8Array.length; i++) {
        const byte = uint8Array[i];
        if (byte >= 32 && byte <= 126) {
          simpleText += String.fromCharCode(byte);
        } else if (byte === 10 || byte === 13) {
          simpleText += ' ';
        }
      }
      
      // Limpar texto extraído
      const cleanText = simpleText
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s\d.,\-\/]/g, ' ')
        .trim();
      
      console.log(`[PDF-PARSER] Fallback: ${cleanText.length} caracteres extraídos`);
      return cleanText;
      
    } catch (fallbackError) {
      console.error('[PDF-PARSER] ❌ Fallback também falhou:', fallbackError.message);
      return '';
    }
  }
}

export function tryRegexExtraction(text: string): any[] {
  console.log('[PDF-PARSER] Tentando extração com regex...');
  
  // Padrões para diferentes formatos de transação
  const patterns = [
    // Padrão Nubank: DD/MM DESCRIÇÃO R$ VALOR
    /(\d{1,2}\/\d{1,2})\s+(.+?)\s+R\$\s*([\d.,]+)/g,
    // Padrão com data completa: DD/MM/YYYY DESCRIÇÃO VALOR
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([\d.,]+)/g,
    // Padrão simples: DESCRIÇÃO R$ VALOR
    /(.+?)\s+R\$\s*([\d.,]+)/g
  ];
  
  const transactions = [];
  const currentYear = new Date().getFullYear();
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    console.log(`[PDF-PARSER] Regex encontrou ${matches.length} possíveis transações`);
    
    for (const match of matches) {
      try {
        let date, description, amountStr;
        
        if (match.length === 4) {
          // Formato: data descrição valor
          const dateStr = match[1];
          description = match[2].trim();
          amountStr = match[3];
          
          // Processar data
          if (dateStr.includes('/')) {
            const dateParts = dateStr.split('/');
            if (dateParts.length === 2) {
              date = `${currentYear}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            } else if (dateParts.length === 3) {
              date = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            }
          }
        } else {
          // Formato simples
          description = match[1].trim();
          amountStr = match[2];
          date = new Date().toISOString().split('T')[0];
        }
        
        // Processar valor
        const amount = -Math.abs(parseFloat(amountStr.replace(/\./g, '').replace(',', '.')));
        
        // Validar
        if (description.length > 3 && !isNaN(amount) && amount < 0) {
          transactions.push({
            date: date || new Date().toISOString().split('T')[0],
            description: description.substring(0, 255),
            amount: amount,
            category: 'Outros'
          });
        }
        
      } catch (parseError) {
        continue;
      }
    }
    
    if (transactions.length > 0) {
      break; // Se encontrou transações, não precisa testar outros padrões
    }
  }
  
  console.log(`[PDF-PARSER] Regex extraiu ${transactions.length} transações`);
  return transactions;
}
