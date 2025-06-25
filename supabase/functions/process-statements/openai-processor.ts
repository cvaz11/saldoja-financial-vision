
export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  installment_number?: number;
  installment_total?: number;
}

export const processTextWithOpenAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[GPT] Starting OpenAI processing...');
    
    // Prepare text for OpenAI (limit to ~15k tokens, roughly 60k characters)
    const textForGPT = extractedText.length > 60000 
      ? extractedText.substring(0, 60000) + '...'
      : extractedText;
    
    console.log(`[GPT] Text length for processing: ${textForGPT.length} characters`);
    
    // Use OpenAI to extract transaction data from the text
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise de extratos bancários brasileiros. Analise o texto do extrato e extraia TODAS as transações encontradas.

Para cada transação, retorne um JSON com:
- date: data no formato YYYY-MM-DD
- description: descrição da transação (limpa, sem códigos desnecessários)
- amount: valor (positivo para créditos/entradas, negativo para débitos/saídas)
- category: categoria baseada na descrição (Mercado, Restaurante, Transporte, Assinaturas, Transferência, Salário, Freelance, Eletrônicos, Saúde, etc.)
- installment_number: número da parcela (se aplicável)
- installment_total: total de parcelas (se aplicável)

IMPORTANTE: 
- Extraia APENAS transações reais do extrato
- NÃO invente ou crie dados fictícios
- Se não encontrar transações, retorne array vazio []
- Valores devem estar corretos conforme o extrato

Retorne APENAS um array JSON válido, sem texto adicional.`
          },
          {
            role: 'user',
            content: `Analise este extrato bancário e extraia todas as transações:\n\n${textForGPT}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });
    
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('[GPT] API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }
    
    const openAIResult = await openAIResponse.json();
    console.log(`[GPT] tokens_in=${openAIResult.usage?.prompt_tokens || 'unknown'} tokens_out=${openAIResult.usage?.completion_tokens || 'unknown'}`);
    
    const extractedTransactionsText = openAIResult.choices[0].message.content;
    console.log('[GPT] Raw response:', extractedTransactionsText);
    
    // Parse the JSON response from OpenAI
    let transactions: Transaction[];
    try {
      transactions = JSON.parse(extractedTransactionsText);
      console.log(`[GPT] Successfully parsed ${transactions.length} transactions`);
    } catch (parseError) {
      console.error('[GPT] Error parsing JSON response:', parseError);
      console.log('[GPT] Raw response that failed to parse:', extractedTransactionsText);
      throw new Error('Failed to parse transaction data from OpenAI response');
    }
    
    // Validate transactions
    if (!Array.isArray(transactions)) {
      throw new Error('OpenAI response is not an array of transactions');
    }
    
    // Filter and validate transaction data
    const validTransactions = transactions.filter(transaction => {
      return transaction.date && 
             transaction.description && 
             typeof transaction.amount === 'number' && 
             transaction.category;
    });
    
    console.log(`[VALIDATION] Filtered to ${validTransactions.length} valid transactions`);
    
    if (validTransactions.length === 0) {
      console.log('[VALIDATION] No valid transactions found in PDF');
    }
    
    return validTransactions;
    
  } catch (error) {
    console.error('[GPT] Error processing with OpenAI:', error);
    throw error;
  }
};
