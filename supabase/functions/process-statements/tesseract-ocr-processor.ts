
import "https://deno.land/x/xhr@0.1.0/mod.ts";

interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

// Mapeamento de meses em português
const monthMap: { [key: string]: string } = {
  'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
  'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
  'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
};

export const processWithTesseractOCR = async (pdfBuffer: ArrayBuffer): Promise<Transaction[]> => {
  const startTime = Date.now();
  
  try {
    console.log(`[TESSERACT] ===== INICIANDO PROCESSAMENTO OCR TESSERACT =====`);
    console.log(`[TESSERACT] PDF Buffer size: ${pdfBuffer.byteLength} bytes`);
    
    // 1. PDF → PNG (300 DPI)
    console.log(`[TESSERACT] Convertendo PDF para PNG (300 DPI)...`);
    const pageBuffers = await convertPdfToPngPages(pdfBuffer);
    
    if (pageBuffers.length === 0) {
      console.log(`[TESSERACT] ❌ Nenhuma página PNG gerada`);
      return [];
    }
    
    console.log(`[TESSERACT] PDF convertido em ${pageBuffers.length} páginas PNG`);
    
    // 2. OCR com Tesseract
    console.log(`[TESSERACT] Executando OCR em ${pageBuffers.length} páginas...`);
    const pageTexts = await extractTextWithTesseract(pageBuffers);
    
    if (pageTexts.length === 0) {
      console.log(`[TESSERACT] ❌ Nenhum texto extraído via OCR`);
      return [];
    }
    
    // 3. Combinar texto de todas as páginas
    const fullText = pageTexts.join('\n---PÁGINA---\n');
    console.log(`[TESSERACT] Texto total extraído: ${fullText.length} chars`);
    
    // 4. Regex Nubank (Débitos)
    console.log(`[TESSERACT] Aplicando regex para débitos Nubank...`);
    const transactions = extractNubankDebits(fullText);
    
    const processingTime = Date.now() - startTime;
    console.log(`[TESSERACT] ✅ Debits found: ${transactions.length}`);
    console.log(`[TESSERACT] Tempo total: ${processingTime}ms`);
    
    return transactions;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[TESSERACT] ❌ Erro no processamento OCR (${processingTime}ms):`, error.message);
    return [];
  }
};

async function convertPdfToPngPages(pdfBuffer: ArrayBuffer): Promise<Uint8Array[]> {
  try {
    // Usar PDF.js para renderizar páginas como PNG de alta qualidade
    const pdfjsModule = await import('https://esm.sh/pdfjs-dist@4.0.379/build/pdf.min.mjs');
    const { getDocument } = pdfjsModule;
    
    // Configurar worker
    pdfjsModule.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
    
    // Carregar PDF
    const pdf = await getDocument({ data: pdfBuffer }).promise;
    console.log(`[TESSERACT] PDF carregado com ${pdf.numPages} páginas`);
    
    const pageBuffers: Uint8Array[] = [];
    
    // Processar até 10 páginas (limitação de performance)
    const maxPages = Math.min(pdf.numPages, 10);
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`[TESSERACT] Renderizando página ${pageNum}/${maxPages}...`);
        
        const page = await pdf.getPage(pageNum);
        
        // Viewport com escala 3.0 para 300 DPI
        const viewport = page.getViewport({ scale: 3.0 });
        
        // Criar canvas offscreen
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
        
        // Renderizar página no canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Converter para PNG
        const blob = await canvas.convertToBlob({ 
          type: 'image/png', 
          quality: 1.0 
        });
        
        const arrayBuffer = await blob.arrayBuffer();
        const pngBuffer = new Uint8Array(arrayBuffer);
        
        pageBuffers.push(pngBuffer);
        console.log(`[TESSERACT] ✅ Página ${pageNum} renderizada (${pngBuffer.length} bytes)`);
        
      } catch (pageError) {
        console.error(`[TESSERACT] Erro ao renderizar página ${pageNum}:`, pageError.message);
        continue;
      }
    }
    
    return pageBuffers;
    
  } catch (error) {
    console.error(`[TESSERACT] Erro na conversão PDF→PNG:`, error.message);
    return [];
  }
}

async function extractTextWithTesseract(pageBuffers: Uint8Array[]): Promise<string[]> {
  try {
    // Importar Tesseract.js
    const tesseractModule = await import('https://esm.sh/tesseract.js@5.0.4');
    const { createWorker } = tesseractModule;
    
    console.log(`[TESSERACT] Criando worker Tesseract (idioma: por)...`);
    const worker = await createWorker('por'); // Português
    
    const pageTexts: string[] = [];
    
    for (let i = 0; i < pageBuffers.length; i++) {
      try {
        console.log(`[TESSERACT] OCR página ${i + 1}/${pageBuffers.length}...`);
        
        const { data: { text } } = await worker.recognize(pageBuffers[i]);
        
        if (text.trim()) {
          pageTexts.push(text);
          console.log(`[TESSERACT] OCR page ${i + 1} done (chars ${text.length})`);
        } else {
          console.log(`[TESSERACT] ⚠️  Página ${i + 1} não retornou texto`);
        }
        
      } catch (pageError) {
        console.error(`[TESSERACT] Erro OCR página ${i + 1}:`, pageError.message);
        continue;
      }
    }
    
    await worker.terminate();
    console.log(`[TESSERACT] Worker Tesseract finalizado`);
    
    return pageTexts;
    
  } catch (error) {
    console.error(`[TESSERACT] Erro no Tesseract:`, error.message);
    return [];
  }
}

function extractNubankDebits(fullText: string): Transaction[] {
  // Regex específico para padrão Nubank: DD MMM Descrição R$ Valor
  const debitRegex = /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(.+?)\s+R\$\s*([\d.,\-]+)/g;
  
  const matches = [...fullText.matchAll(debitRegex)];
  console.log(`[TESSERACT] Regex encontrou ${matches.length} possíveis transações`);
  
  const transactions: Transaction[] = [];
  const currentYear = new Date().getFullYear();
  
  for (const match of matches) {
    try {
      const day = match[1].padStart(2, '0');
      const month = monthMap[match[2]];
      const description = match[3].trim();
      const amountStr = match[4].replace(/\./g, '').replace(',', '.');
      const amount = -Math.abs(parseFloat(amountStr)); // Sempre negativo para débitos
      
      // Validar se é realmente um débito
      if (amount >= 0) {
        continue; // Pular se não for negativo
      }
      
      // Validar descrição mínima
      if (description.length < 3) {
        continue;
      }
      
      const transaction: Transaction = {
        date: `${currentYear}-${month}-${day}`,
        description: description.substring(0, 255), // Limitar tamanho
        amount: amount,
        category: categorizeTransaction(description)
      };
      
      transactions.push(transaction);
      console.log(`[TESSERACT] Débito: ${transaction.date} - ${transaction.description} - R$ ${Math.abs(transaction.amount).toFixed(2)}`);
      
    } catch (parseError) {
      console.error(`[TESSERACT] Erro ao processar match:`, parseError.message);
      continue;
    }
  }
  
  // Filtrar apenas débitos únicos
  const uniqueTransactions = deduplicateTransactions(transactions);
  console.log(`[TESSERACT] Transações únicas de débito: ${uniqueTransactions.length}`);
  
  return uniqueTransactions;
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  // Categorização baseada em palavras-chave
  if (desc.includes('supermercado') || desc.includes('mercado') || desc.includes('extra') || desc.includes('carrefour')) {
    return 'Alimentação';
  } else if (desc.includes('posto') || desc.includes('combustivel') || desc.includes('uber') || desc.includes('99') || desc.includes('taxi')) {
    return 'Transporte';
  } else if (desc.includes('farmacia') || desc.includes('droga') || desc.includes('hospital') || desc.includes('medic')) {
    return 'Saúde';
  } else if (desc.includes('escola') || desc.includes('curso') || desc.includes('universidade') || desc.includes('livr')) {
    return 'Educação';
  } else if (desc.includes('cinema') || desc.includes('restaurante') || desc.includes('bar') || desc.includes('lanche')) {
    return 'Lazer';
  } else if (desc.includes('loja') || desc.includes('shopping') || desc.includes('magazin') || desc.includes('compra')) {
    return 'Compras';
  } else if (desc.includes('conta') || desc.includes('fatura') || desc.includes('energia') || desc.includes('agua') || desc.includes('internet')) {
    return 'Contas';
  } else if (desc.includes('pix') || desc.includes('transferencia') || desc.includes('ted') || desc.includes('doc')) {
    return 'Transferências';
  } else {
    return 'Outros';
  }
}

function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  const unique: Transaction[] = [];
  
  for (const tx of transactions) {
    const key = `${tx.date}_${tx.description}_${tx.amount}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(tx);
    }
  }
  
  return unique;
}
