
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
    Math.abs(transaction.amount) > 0 &&
    typeof transaction.category === 'string' &&
    transaction.category.trim().length > 0
  );
};

export const processTextWithOpenAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[GPT] Starting OpenAI processing...');
    
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    console.log(`[GPT] Processing text of ${extractedText.length} characters`);
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise de extratos bancários brasileiros. Analise o extrato fornecido e extraia TODAS as transações financeiras.

IMPORTANTE: Retorne APENAS transações reais e válidas encontradas no extrato.

FORMATO DE RESPOSTA (JSON válido):
[
  {
    "date": "YYYY-MM-DD",
    "description": "Descrição clara da transação",
    "amount": valor_numérico,
    "category": "categoria_apropriada"
  }
]

REGRAS:
- date: formato YYYY-MM-DD
- amount: positivo para entradas, negativo para saídas
- category: "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Salário", "Outros"
- description: máximo 50 caracteres, descritiva

RETORNE APENAS O JSON, sem texto adicional.`
          },
          {
            role: 'user',
            content: `Extraia as transações deste extrato:\n\n${extractedText}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });
    
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('[GPT] API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }
    
    const openAIResult = await openAIResponse.json();
    console.log(`[GPT] OpenAI response received`);
    
    let extractedTransactionsText = openAIResult.choices[0].message.content.trim();
    
    // Clean the response
    if (extractedTransactionsText.startsWith('```json')) {
      extractedTransactionsText = extractedTransactionsText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    }
    if (extractedTransactionsText.startsWith('```')) {
      extractedTransactionsText = extractedTransactionsText.replace(/```\n?/g, '');
    }
    
    console.log('[GPT] Cleaned response:', extractedTransactionsText.substring(0, 500));
    
    let transactions: any[];
    try {
      transactions = JSON.parse(extractedTransactionsText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
      console.log('[GPT] Failed text:', extractedTransactionsText);
      throw new Error('Failed to parse OpenAI response as JSON');
    }
    
    if (!Array.isArray(transactions)) {
      console.error('[GPT] Response is not an array');
      throw new Error('OpenAI response is not an array');
    }
    
    const validTransactions = transactions.filter(validateTransaction);
    
    console.log(`[VALIDATION] Found ${validTransactions.length} valid transactions out of ${transactions.length} total`);
    
    if (validTransactions.length > 0) {
      console.log('[VALIDATION] Sample transaction:', validTransactions[0]);
    }
    
    return validTransactions;
    
  } catch (error) {
    console.error('[GPT] Error processing with OpenAI:', error);
    throw error;
  }
};
