
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
    
    console.log(`[GPT] Processing text of ${extractedText.length} characters`);
    
    // Check if text contains actual transaction data
    if (extractedText.includes('placeholder') || extractedText.includes('simulado') || extractedText.includes('não implementado')) {
      console.log('[GPT] Detected placeholder content - returning empty transactions');
      return [];
    }
    
    const prompt = `Analise o seguinte extrato bancário brasileiro e extraia TODAS as transações financeiras válidas.

REGRAS IMPORTANTES:
- Extraia apenas transações reais (não extraia cabeçalhos, títulos ou informações de conta)
- Para cada transação, identifique: data, descrição, valor e categoria
- Valores positivos para entradas/créditos, negativos para saídas/débitos
- Use apenas estas categorias: "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Salário", "Outros"
- Datas no formato YYYY-MM-DD
- Descrições claras e objetivas (máximo 50 caracteres)
- Se não encontrar transações válidas, retorne um array vazio []

FORMATO DE RESPOSTA (JSON válido):
[
  {
    "date": "YYYY-MM-DD",
    "description": "Descrição da transação",
    "amount": valor_numérico,
    "category": "categoria_apropriada"
  }
]

EXTRATO BANCÁRIO:
${extractedText}

RETORNE APENAS O JSON ARRAY, sem texto adicional. Se não houver transações, retorne [].`;
    
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
            content: 'Você é um especialista em análise de extratos bancários brasileiros. Sempre retorne apenas um JSON array válido com as transações encontradas. Se não encontrar transações válidas, retorne um array vazio [].'
          },
          {
            role: 'user',
            content: prompt
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
    
    let extractedTransactionsText = openAIResult.choices[0].message.content.trim();
    
    // Clean the response
    extractedTransactionsText = extractedTransactionsText
      .replace(/```json\n?/g, '')
      .replace(/```\n?$/g, '')
      .replace(/```/g, '')
      .trim();
    
    console.log('[GPT] Cleaned response preview:', extractedTransactionsText.substring(0, 200) + '...');
    
    let transactions: any[];
    try {
      transactions = JSON.parse(extractedTransactionsText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
      console.log('[GPT] Failed text:', extractedTransactionsText);
      // Return empty array instead of throwing error
      console.log('[GPT] Returning empty transactions due to parse error');
      return [];
    }
    
    if (!Array.isArray(transactions)) {
      console.error('[GPT] Response is not an array:', typeof transactions);
      console.log('[GPT] Returning empty transactions - invalid response format');
      return [];
    }
    
    const validTransactions = transactions.filter(validateTransaction);
    
    console.log(`[VALIDATION] Found ${validTransactions.length} valid transactions out of ${transactions.length} total`);
    
    if (validTransactions.length === 0) {
      console.log('[VALIDATION] No valid transactions found');
      return [];
    }
    
    console.log('[VALIDATION] Sample transaction:', validTransactions[0]);
    
    return validTransactions;
    
  } catch (error) {
    console.error('[GPT] Error processing with OpenAI:', error);
    // Return empty array instead of throwing error to avoid failures
    console.log('[GPT] Returning empty transactions due to processing error');
    return [];
  }
};
