
import { processTextWithOpenAI } from './openai-processor.ts';
import { processTextWithClaude } from './claude-processor.ts';
import { extractTextFromPDFBytes, tryRegexExtraction } from './advanced-pdf-parser.ts';

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  installment_number?: number;
  installment_total?: number;
}

const validateTransaction = (transaction: any): transaction is Transaction => {
  return (
    transaction &&
    typeof transaction.date === 'string' &&
    typeof transaction.description === 'string' &&
    transaction.description.trim().length > 0 &&
    typeof transaction.amount === 'number' &&
    !isNaN(transaction.amount) &&
    transaction.amount < 0 &&
    typeof transaction.category === 'string' &&
    transaction.category.trim().length > 0
  );
};

export const processWithMultiLLM = async (fileData: Blob): Promise<Transaction[]> => {
  console.log('[MULTI-LLM] ===== INICIANDO PROCESSAMENTO MULTI-LLM =====');
  
  try {
    // Etapa 1: Extrair texto do PDF com parser avançado
    console.log('[MULTI-LLM] Extraindo texto com parser avançado...');
    const extractedText = await extractTextFromPDFBytes(fileData);
    
    if (!extractedText || extractedText.length < 50) {
      console.log('[MULTI-LLM] Texto extraído insuficiente, tentando análise direta de bytes...');
      
      // Fallback: tentar regex direto nos bytes
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const basicText = Array.from(uint8Array)
        .map(byte => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : ' ')
        .join('');
      
      const regexResults = tryRegexExtraction(basicText);
      if (regexResults.length > 0) {
        console.log(`[MULTI-LLM] ✅ Regex encontrou ${regexResults.length} transações`);
        return regexResults.filter(validateTransaction);
      }
      
      console.log('[MULTI-LLM] ❌ Falha na extração de texto');
      return [];
    }
    
    console.log(`[MULTI-LLM] Texto extraído: ${extractedText.length} caracteres`);
    
    // Etapa 2: Tentar Claude primeiro (melhor para documentos)
    console.log('[MULTI-LLM] Tentando processamento com Claude...');
    const claudeResult = await processTextWithClaude(extractedText);
    if (claudeResult.length > 0) {
      console.log(`[MULTI-LLM] ✅ Claude encontrou ${claudeResult.length} transações`);
      return claudeResult;
    }
    
    // Etapa 3: Tentar OpenAI
    console.log('[MULTI-LLM] Tentando processamento com OpenAI...');
    const openAIResult = await processTextWithOpenAI(extractedText);
    if (openAIResult.length > 0) {
      console.log(`[MULTI-LLM] ✅ OpenAI encontrou ${openAIResult.length} transações`);
      return openAIResult;
    }
    
    // Etapa 4: Fallback com regex
    console.log('[MULTI-LLM] Tentando extração com regex...');
    const regexResult = tryRegexExtraction(extractedText);
    if (regexResult.length > 0) {
      console.log(`[MULTI-LLM] ✅ Regex encontrou ${regexResult.length} transações`);
      return regexResult.filter(validateTransaction);
    }
    
    console.log('[MULTI-LLM] ❌ Todas as abordagens falharam');
    return [];
    
  } catch (error) {
    console.error('[MULTI-LLM] Erro geral:', error);
    return [];
  }
};
