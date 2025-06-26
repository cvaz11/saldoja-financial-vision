
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
  console.log('[MULTI-LLM] ===== INICIANDO PROCESSAMENTO MULTI-LLM AVANÇADO =====');
  
  // Verificar chaves de API disponíveis
  const claudeKey = Deno.env.get('ANTHROPIC_API_KEY');
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  
  console.log('[MULTI-LLM] 🔑 Verificando chaves de API:');
  console.log(`[MULTI-LLM]   Claude (Anthropic): ${claudeKey ? '✅ DISPONÍVEL' : '❌ NÃO CONFIGURADA'}`);
  console.log(`[MULTI-LLM]   OpenAI (GPT): ${openAIKey ? '✅ DISPONÍVEL' : '❌ NÃO CONFIGURADA'}`);
  
  try {
    // Etapa 1: Extrair texto do PDF com parser avançado
    console.log('[MULTI-LLM] 📄 Extraindo texto com parser avançado...');
    const extractedText = await extractTextFromPDFBytes(fileData);
    
    if (!extractedText || extractedText.length < 50) {
      console.log('[MULTI-LLM] ⚠️  Texto extraído insuficiente, tentando análise direta de bytes...');
      
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
    
    console.log(`[MULTI-LLM] ✅ Texto extraído: ${extractedText.length} caracteres`);
    console.log(`[MULTI-LLM] 📝 Amostra do texto: ${extractedText.slice(0, 300)}...`);
    
    // Etapa 2: Tentar Claude primeiro (melhor para documentos estruturados)
    if (claudeKey) {
      console.log('[MULTI-LLM] 🤖 Tentando processamento com Claude (Anthropic)...');
      try {
        const claudeResult = await processTextWithClaude(extractedText);
        if (claudeResult.length > 0) {
          console.log(`[MULTI-LLM] 🎉 SUCESSO COM CLAUDE! ${claudeResult.length} transações encontradas`);
          claudeResult.slice(0, 3).forEach((tx, i) => {
            console.log(`[MULTI-LLM]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)}`);
          });
          return claudeResult;
        }
      } catch (claudeError) {
        console.error('[MULTI-LLM] ❌ Erro no Claude:', claudeError.message);
      }
    } else {
      console.log('[MULTI-LLM] ⏭️  Pulando Claude - chave não configurada');
    }
    
    // Etapa 3: Tentar OpenAI (GPT)
    if (openAIKey) {
      console.log('[MULTI-LLM] 🤖 Tentando processamento com OpenAI (GPT)...');
      try {
        const openAIResult = await processTextWithOpenAI(extractedText);
        if (openAIResult.length > 0) {
          console.log(`[MULTI-LLM] 🎉 SUCESSO COM OPENAI! ${openAIResult.length} transações encontradas`);
          openAIResult.slice(0, 3).forEach((tx, i) => {
            console.log(`[MULTI-LLM]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)}`);
          });
          return openAIResult;
        }
      } catch (openAIError) {
        console.error('[MULTI-LLM] ❌ Erro no OpenAI:', openAIError.message);
      }
    } else {
      console.log('[MULTI-LLM] ⏭️  Pulando OpenAI - chave não configurada');
    }
    
    // Etapa 4: Fallback final com regex
    console.log('[MULTI-LLM] 🔍 Tentando extração com regex (fallback final)...');
    const regexResult = tryRegexExtraction(extractedText);
    if (regexResult.length > 0) {
      console.log(`[MULTI-LLM] ✅ Regex encontrou ${regexResult.length} transações`);
      return regexResult.filter(validateTransaction);
    }
    
    console.log('[MULTI-LLM] ❌ TODAS AS ABORDAGENS FALHARAM');
    console.log('[MULTI-LLM] 💡 Sugestões:');
    console.log('[MULTI-LLM]   - Verifique se o PDF é um extrato Nubank válido');
    console.log('[MULTI-LLM]   - Confirme se há transações de débito no período');
    console.log('[MULTI-LLM]   - Tente converter o PDF para um formato mais simples');
    
    return [];
    
  } catch (error) {
    console.error('[MULTI-LLM] ❌ ERRO CRÍTICO:', error);
    return [];
  }
};
