
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
    transaction.amount < 0 && // Only negative amounts (debits)
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
    
    // If text is too short or seems invalid, return empty
    if (extractedText.length < 50) {
      console.log('[GPT] Text too short, returning empty array');
      return [];
    }
    
    const prompt = `Analise o seguinte extrato bancário brasileiro e extraia APENAS as transações de DÉBITO (saídas de dinheiro).

REGRAS CRÍTICAS:
- Extraia apenas transações reais de DÉBITO/SAÍDA (valores negativos)
- IGNORE completamente receitas, depósitos, salários, PIX recebidos e qualquer entrada de dinheiro
- Retorne apenas transações com amount NEGATIVO (valores positivos serão ignorados)
- Para cada transação, identifique: data, descrição, valor negativo e categoria
- Use apenas estas categorias: "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Outros"
- Datas no formato YYYY-MM-DD
- Descrições claras e objetivas (máximo 50 caracteres)
- Se não encontrar transações de débito válidas, retorne um array vazio []
- NÃO INVENTE dados que não estão no extrato

FORMATO DE RESPOSTA (JSON válido):
[
  {
    "date": "YYYY-MM-DD",
    "description": "Descrição da transação",
    "amount": -valor_numérico_negativo,
    "category": "categoria_apropriada"
  }
]

EXTRATO BANCÁRIO:
${extractedText}

RETORNE APENAS O JSON ARRAY com transações de DÉBITO (valores negativos), sem texto adicional. Se não houver débitos, retorne [].`;
    
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
            content: 'Você é um especialista em análise de extratos bancários brasileiros. NUNCA invente dados. Sempre retorne apenas um JSON array válido com as transações de DÉBITO encontradas no texto. Ignore completamente receitas e entradas de dinheiro. Se não encontrar débitos válidos, retorne um array vazio [].'
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
    
    console.log('[GPT] Cleaned response preview:', extractedTransactionsText.substring(0, 300) + '...');
    
    let transactions: any[];
    try {
      transactions = JSON.parse(extractedTransactionsText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
      console.log('[GPT] Failed text:', extractedTransactionsText);
      return [];
    }
    
    if (!Array.isArray(transactions)) {
      console.error('[GPT] Response is not an array:', typeof transactions);
      return [];
    }
    
    // Filter to ensure only negative amounts (debits)
    const debitTransactions = transactions.filter(t => t.amount && t.amount < 0);
    console.log(`[GPT] Filtered to ${debitTransactions.length} debit transactions from ${transactions.length} total`);
    
    const validTransactions = debitTransactions.filter(validateTransaction);
    
    console.log(`[VALIDATION] Found ${validTransactions.length} valid debit transactions out of ${debitTransactions.length} filtered`);
    
    if (validTransactions.length === 0) {
      console.log('[VALIDATION] No valid debit transactions found');
      return [];
    }
    
    console.log('[VALIDATION] Sample transaction:', validTransactions[0]);
    
    return validTransactions;
    
  } catch (error) {
    console.error('[GPT] Error processing with OpenAI:', error);
    return [];
  }
};
