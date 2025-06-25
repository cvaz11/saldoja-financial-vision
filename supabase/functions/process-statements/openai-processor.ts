
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
    
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Limit text size for processing
    const maxLength = 30000;
    const textForGPT = extractedText.length > maxLength 
      ? extractedText.substring(0, maxLength)
      : extractedText;
    
    console.log(`[GPT] Processing text of ${textForGPT.length} characters`);
    
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
            content: `Você é um especialista em análise de extratos bancários brasileiros. Analise o texto fornecido e extraia TODAS as transações financeiras encontradas.

INSTRUÇÕES IMPORTANTES:
1. Procure por padrões de transações bancárias (PIX, TED, DOC, débitos, créditos, etc.)
2. Identifique datas no formato DD/MM/YYYY, DD-MM-YYYY ou YYYY-MM-DD
3. Encontre valores monetários (R$, vírgulas, pontos decimais)
4. Extraia descrições das transações
5. Categorize apropriadamente cada transação

FORMATO DE RESPOSTA:
Retorne APENAS um array JSON válido com esta estrutura:
[
  {
    "date": "YYYY-MM-DD",
    "description": "Descrição da transação",
    "amount": valor_numérico,
    "category": "categoria"
  }
]

REGRAS:
- date: sempre no formato YYYY-MM-DD
- amount: positivo para entradas/créditos, negativo para saídas/débitos
- category: use uma das opções: "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Salário", "Outros"
- description: seja descritivo mas conciso

EXEMPLO:
[
  {
    "date": "2024-01-15",
    "description": "PIX Recebido - Salário",
    "amount": 5000.00,
    "category": "Salário"
  },
  {
    "date": "2024-01-16",
    "description": "Pagamento PIX - Supermercado",
    "amount": -150.50,
    "category": "Alimentação"
  }
]

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional ou formatação markdown.`
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
    console.log(`[GPT] OpenAI response received`);
    
    let extractedTransactionsText = openAIResult.choices[0].message.content;
    console.log('[GPT] Raw response:', extractedTransactionsText.substring(0, 1000));
    
    // Clean the response
    extractedTransactionsText = extractedTransactionsText.trim();
    if (extractedTransactionsText.startsWith('```json')) {
      extractedTransactionsText = extractedTransactionsText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    }
    if (extractedTransactionsText.startsWith('```')) {
      extractedTransactionsText = extractedTransactionsText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }
    
    // Parse the JSON response
    let transactions: any[];
    try {
      transactions = JSON.parse(extractedTransactionsText);
      console.log(`[GPT] Successfully parsed ${transactions.length} transactions`);
    } catch (parseError) {
      console.error('[GPT] Error parsing JSON:', parseError);
      console.log('[GPT] Failed text:', extractedTransactionsText);
      throw new Error('Failed to parse transaction data from OpenAI response');
    }
    
    // Validate transactions
    if (!Array.isArray(transactions)) {
      console.error('[GPT] Response is not an array');
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
      console.log('[VALIDATION] No valid transactions found, returning empty array');
      return [];
    }
    
    console.log('[VALIDATION] Sample valid transaction:', validTransactions[0]);
    return validTransactions;
    
  } catch (error) {
    console.error('[GPT] Error processing with OpenAI:', error);
    throw error;
  }
};
