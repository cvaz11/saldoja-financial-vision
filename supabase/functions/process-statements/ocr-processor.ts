
import "https://deno.land/x/xhr@0.1.0/mod.ts";

interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

export const processWithOCR = async (pdfBuffer: ArrayBuffer): Promise<Transaction[]> => {
  try {
    console.log(`[OCR] ===== INICIANDO PROCESSAMENTO OCR =====`);
    console.log(`[OCR] PDF Buffer size: ${pdfBuffer.byteLength} bytes`);
    
    // Usar PDF.js para renderizar páginas como canvas e depois OCR
    const text = await extractTextWithOCR(pdfBuffer);
    console.log(`[OCR] Texto extraído via OCR (${text.length} chars)`);
    
    if (!text || text.length < 100) {
      console.log(`[OCR] ❌ Texto insuficiente extraído`);
      return [];
    }
    
    // Analisar texto Nubank
    console.log(`[OCR] Analisando texto Nubank...`);
    const transactions = await analyzeNubankText(text);
    
    console.log(`[OCR] ✅ ${transactions.length} transações encontradas`);
    return transactions;
    
  } catch (error) {
    console.error(`[OCR] ❌ Erro no processamento OCR:`, error.message);
    return [];
  }
};

async function extractTextWithOCR(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Usar PDF.js para renderizar páginas
    const pdfjsModule = await import('https://esm.sh/pdfjs-dist@4.0.379');
    const { getDocument } = pdfjsModule;
    
    // Carregar PDF
    const pdf = await getDocument({ data: pdfBuffer }).promise;
    console.log(`[OCR] PDF carregado com ${pdf.numPages} páginas`);
    
    const allText: string[] = [];
    
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
      try {
        console.log(`[OCR] Processando página ${pageNum}/${pdf.numPages}...`);
        
        const page = await pdf.getPage(pageNum);
        
        // Criar canvas para renderizar a página
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        // Renderizar página no canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Converter canvas para blob
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        const imageBuffer = await blob.arrayBuffer();
        
        console.log(`[OCR] Página ${pageNum} renderizada (${imageBuffer.byteLength} bytes)`);
        
        // Usar Tesseract.js para OCR
        const pageText = await performOCR(imageBuffer);
        
        if (pageText.trim()) {
          allText.push(pageText);
          console.log(`[OCR] ✅ Página ${pageNum} processada (${pageText.length} chars)`);
        } else {
          console.log(`[OCR] ⚠️  Página ${pageNum} não retornou texto`);
        }
        
      } catch (pageError) {
        console.error(`[OCR] Erro ao processar página ${pageNum}:`, pageError.message);
        continue;
      }
    }
    
    const combinedText = allText.join('\n\n---PÁGINA---\n\n');
    console.log(`[OCR] Texto total extraído: ${combinedText.length} chars`);
    
    return combinedText;
    
  } catch (error) {
    console.error(`[OCR] Erro na extração de texto:`, error.message);
    return '';
  }
}

async function performOCR(imageBuffer: ArrayBuffer): Promise<string> {
  try {
    // Usar Tesseract.js via ESM import
    const tesseractModule = await import('https://esm.sh/tesseract.js@5.0.5');
    const { createWorker } = tesseractModule;
    
    console.log(`[OCR] Iniciando Tesseract worker...`);
    const worker = await createWorker('por'); // Português
    
    console.log(`[OCR] Executando OCR na imagem...`);
    const { data: { text } } = await worker.recognize(new Uint8Array(imageBuffer));
    
    await worker.terminate();
    console.log(`[OCR] OCR concluído: ${text.length} chars`);
    
    return text;
    
  } catch (error) {
    console.error(`[OCR] Erro no Tesseract:`, error.message);
    console.log(`[OCR] Tentando OCR simplificado...`);
    
    // Fallback: tentar extrair texto básico
    return await simpleTextExtraction(imageBuffer);
  }
}

async function simpleTextExtraction(imageBuffer: ArrayBuffer): Promise<string> {
  try {
    // Implementação básica de extração de texto
    // Pode ser expandida com outras bibliotecas OCR
    console.log(`[OCR] Usando extração de texto simples...`);
    
    // Por enquanto, retorna string vazia para fallback
    return '';
    
  } catch (error) {
    console.error(`[OCR] Erro na extração simples:`, error.message);
    return '';
  }
}

async function analyzeNubankText(text: string): Promise<Transaction[]> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log(`[OCR] Processando ${lines.length} linhas de texto`);
  
  const transactions: Transaction[] = [];
  
  // Padrões para identificar transações Nubank
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2}|\d{2} [A-Z]{3})/;
  const amountPattern = /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/;
  const debitIndicators = ['débito', 'compra', 'saque', 'transferência', 'pix enviado', 'ted', 'doc'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Verificar se é uma linha de transação de débito
    const hasDebitIndicator = debitIndicators.some(indicator => line.includes(indicator));
    const dateMatch = lines[i].match(datePattern);
    const amountMatch = lines[i].match(amountPattern);
    
    if (hasDebitIndicator || (dateMatch && amountMatch)) {
      try {
        // Tentar extrair data
        let date = '';
        if (dateMatch) {
          date = normalizeDate(dateMatch[1]);
        }
        
        // Tentar extrair valor
        let amount = 0;
        if (amountMatch) {
          const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.');
          amount = parseFloat(amountStr);
        }
        
        // Tentar extrair descrição
        let description = lines[i].replace(datePattern, '').replace(amountPattern, '').trim();
        
        // Procurar descrição nas linhas adjacentes se necessário
        if (!description && i + 1 < lines.length) {
          description = lines[i + 1].substring(0, 100);
        }
        
        if (date && amount > 0 && description) {
          transactions.push({
            date,
            description: description.substring(0, 255),
            amount,
            category: categorizeTransaction(description)
          });
          
          console.log(`[OCR] Transação encontrada: ${date} - ${description} - R$ ${amount.toFixed(2)}`);
        }
        
      } catch (parseError) {
        console.error(`[OCR] Erro ao processar linha "${lines[i]}":`, parseError.message);
        continue;
      }
    }
  }
  
  console.log(`[OCR] ${transactions.length} transações válidas de débito encontradas`);
  return transactions;
}

function normalizeDate(dateStr: string): string {
  try {
    // Normalizar diferentes formatos de data para YYYY-MM-DD
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${month}-${day}`;
      } else if (parts.length === 2) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = new Date().getFullYear();
        return `${year}-${month}-${day}`;
      }
    }
    
    // Formato "DD MMM" (ex: "15 JAN")
    if (dateStr.includes(' ')) {
      const months = {
        'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
        'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
      };
      
      const parts = dateStr.toLowerCase().split(' ');
      if (parts.length === 2) {
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]] || '01';
        const year = new Date().getFullYear();
        return `${year}-${month}-${day}`;
      }
    }
    
    // Fallback para hoje
    return new Date().toISOString().split('T')[0];
    
  } catch (error) {
    console.error(`[OCR] Erro ao normalizar data "${dateStr}":`, error.message);
    return new Date().toISOString().split('T')[0];
  }
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('supermercado') || desc.includes('mercado') || desc.includes('food')) {
    return 'Alimentação';
  } else if (desc.includes('posto') || desc.includes('combustivel') || desc.includes('uber') || desc.includes('taxi')) {
    return 'Transporte';
  } else if (desc.includes('farmacia') || desc.includes('hospital') || desc.includes('medic')) {
    return 'Saúde';
  } else if (desc.includes('escola') || desc.includes('curso') || desc.includes('livr')) {
    return 'Educação';
  } else if (desc.includes('cinema') || desc.includes('restaurante') || desc.includes('bar')) {
    return 'Lazer';
  } else if (desc.includes('loja') || desc.includes('shopping') || desc.includes('magazin')) {
    return 'Compras';
  } else if (desc.includes('conta') || desc.includes('fatura') || desc.includes('energia') || desc.includes('agua')) {
    return 'Contas';
  } else {
    return 'Outros';
  }
}
