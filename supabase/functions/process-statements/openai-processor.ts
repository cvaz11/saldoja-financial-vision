
export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  installment_number?: number;
  installment_total?: number;
}

const validateDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
};

const validateTransaction = (transaction: any): transaction is Transaction => {
  return (
    transaction &&
    typeof transaction.date === 'string' &&
    validateDate(transaction.date) &&
    typeof transaction.description === 'string' &&
    transaction.description.trim().length > 0 &&
    typeof transaction.amount === 'number' &&
    !isNaN(transaction.amount) &&
    typeof transaction.category === 'string' &&
    transaction.category.trim().length > 0
  );
};

export const processTextWithOpenAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[GPT] Starting OpenAI processing...');
    
    // Limit text size for processing
    const maxLength = 50000;
    const textForGPT = extractedText.length > maxLength 
      ? extractedText.substring(0, maxLength) + '...'
      : extractedText;
    
    console.log(`[GPT] Processing text of ${textForGPT.length} characters`);
    
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
            content: `Você é um especialista em análise de extratos bancários brasileiros. Sua tarefa é extrair TODAS as transações financeiras do texto fornecido.

INSTRUÇÕES IMPORTANTES:
1. Analise o texto completo e identifique TODAS as transações
2. Para cada transação encontrada, extraia as informações no formato JSON
3. Use apenas transações REAIS encontradas no extrato
4. NÃO invente ou crie dados fictícios
5. Se não encontrar transações, retorne um array vazio []

FORMATO DE RESPOSTA:
Retorne um array JSON com objetos contendo:
- date: data no formato YYYY-MM-DD (obrigatório)
- description: descrição limpa da transação (obrigatório)
- amount: valor numérico (positivo para créditos/entradas, negativo para débitos/saídas) (obrigatório)
- category: categoria apropriada (obrigatório)
- installment_number: número da parcela (opcional, apenas se identificado)
- installment_total: total de parcelas (opcional, apenas se identificado)

CATEGORIAS SUGERIDAS:
- Alimentação (restaurantes, delivery, mercado)
- Transporte (uber, combustível, passagem)
- Saúde (farmácia, médicos, planos)
- Lazer (cinema, streaming, jogos)
- Educação (cursos, livros, escola)
- Casa (aluguel, condomínio, utilities)
- Vestuário (roupas, calçados)
- Tecnologia (celular, internet, eletrônicos)
- Financeiro (taxas, juros, transferências)
- Salário (pagamentos recebidos)
- Outros (para itens não categorizados)

ATENÇÃO: Retorne APENAS o array JSON, sem texto adicional ou formatação markdown.`
          },
          {
            role: 'user',
            content: `Analise este extrato bancário brasileiro e extraia TODAS as transações encontradas:\n\n${textForGPT}`
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
    console.log(`[GPT] Tokens used - input: ${openAIResult.usage?.prompt_tokens || 'unknown'}, output: ${openAIResult.usage?.completion_tokens || 'unknown'}`);
    
    const extractedTransactionsText = openAIResult.choices[0].message.content;
    console.log('[GPT] Raw response from OpenAI:', extractedTransactionsText.substring(0, 500) + '...');
    
    // Clean the response - remove markdown formatting if present
    let cleanedResponse = extractedTransactionsText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }
    
    // Parse the JSON response
    let transactions: any[];
    try {
      transactions = JSON.parse(cleanedResponse);
      console.log(`[GPT] Successfully parsed ${transactions.length} transactions from response`);
    } catch (parseError) {
      console.error('[GPT] Error parsing JSON response:', parseError);
      console.log('[GPT] Cleaned response that failed to parse:', cleanedResponse);
      throw new Error('Failed to parse transaction data from OpenAI response');
    }
    
    // Validate transactions
    if (!Array.isArray(transactions)) {
      console.error('[GPT] Response is not an array:', typeof transactions);
      throw new Error('OpenAI response is not an array of transactions');
    }
    
    // Filter and validate each transaction
    const validTransactions = transactions.filter((transaction, index) => {
      const isValid = validateTransaction(transaction);
      if (!isValid) {
        console.log(`[VALIDATION] Invalid transaction at index ${index}:`, transaction);
      }
      return isValid;
    });
    
    console.log(`[VALIDATION] Found ${validTransactions.length} valid transactions out of ${transactions.length} total`);
    
    if (validTransactions.length === 0) {
      console.log('[VALIDATION] No valid transactions found in the extracted data');
    } else {
      console.log('[VALIDATION] Sample valid transaction:', validTransactions[0]);
    }
    
    return validTransactions;
    
  } catch (error) {
    console.error('[GPT] Error processing with OpenAI:', error);
    throw error;
  }
};
