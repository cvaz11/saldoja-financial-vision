
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { convertPdfToImages } from './services/pdf-converter.ts';
import { processImageWithGPT4Vision } from './services/gpt4-vision.ts';
import { extractTransactionsFromMarkdown } from './services/transaction-extractor.ts';

interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

export const processWithVision = async (pdfBuffer: ArrayBuffer): Promise<Transaction[]> => {
  try {
    console.log(`[VISION] ===== INICIANDO PROCESSAMENTO VISION =====`);
    console.log(`[VISION] PDF Buffer size: ${pdfBuffer.byteLength} bytes`);
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    // Converter PDF para imagens PNG
    console.log(`[VISION] Convertendo PDF para imagens PNG...`);
    const images = await convertPdfToImages(pdfBuffer);
    console.log(`[VISION] PDF convertido em ${images.length} imagens PNG`);

    if (images.length === 0) {
      console.log(`[VISION] ❌ Nenhuma imagem PNG gerada do PDF`);
      return [];
    }

    // Processar cada imagem com GPT-4o Vision
    console.log(`[VISION] Processando ${images.length} imagens PNG com GPT-4o Vision...`);
    const allMarkdown: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      console.log(`[VISION] Processando imagem PNG ${i + 1}/${images.length}...`);
      
      try {
        const markdown = await processImageWithGPT4Vision(images[i], i + 1);
        if (markdown.trim()) {
          allMarkdown.push(markdown);
          console.log(`[VISION] ✅ Página ${i + 1} processada com sucesso`);
        } else {
          console.log(`[VISION] ⚠️  Página ${i + 1} retornou conteúdo vazio`);
        }
      } catch (error) {
        console.error(`[VISION] ❌ Erro ao processar página ${i + 1}:`, error.message);
        continue;
      }
    }

    if (allMarkdown.length === 0) {
      console.log(`[VISION] ❌ Nenhuma página foi processada com sucesso`);
      return [];
    }

    // Combinar todo o Markdown
    const combinedMarkdown = allMarkdown.join('\n\n---\n\n');
    console.log(`[VISION] Markdown combinado (${combinedMarkdown.length} chars)`);

    // Extrair transações do Markdown combinado
    console.log(`[VISION] Extraindo transações do Markdown...`);
    const transactions = await extractTransactionsFromMarkdown(combinedMarkdown);
    
    console.log(`[VISION] ✅ ${transactions.length} transações extraídas com Vision`);
    
    if (transactions.length > 0) {
      console.log(`[VISION] Primeiras 3 transações:`);
      transactions.slice(0, 3).forEach((tx, i) => {
        console.log(`[VISION]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${tx.amount.toFixed(2)} (${tx.category})`);
      });
    }
    
    return transactions;
    
  } catch (error) {
    console.error(`[VISION] ❌ Erro no processamento Vision:`, error.message);
    return [];
  }
};
