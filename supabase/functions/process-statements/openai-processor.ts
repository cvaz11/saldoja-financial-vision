
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
    console.log(`[GPT] Full text for analysis:`, extractedText);
    
    // If text is too short, return empty
    if (extractedText.length < 20) {
      console.log('[GPT] Text too short, returning empty array');
      return [];
    }
    
    const prompt = `Você é um especialista em análise de extratos bancários do NUBANK. Analise o texto fornecido e extraia APENAS transações de DÉBITO/SAÍDA (gastos) reais.

TEXTO FORNECIDO:
${extractedText}

INSTRUÇÕES CRÍTICAS:
1. Analise TODO o texto fornecido acima procurando por transações de DÉBITO/GASTOS
2. Procure por padrões como:
   - Compras no cartão de crédito/débito
   - Pagamentos via PIX
   - Transferências enviadas
   - Saques
   - Taxas bancárias
   - Compras em estabelecimentos (ex: PADARIA, SUPERMERCADO, etc.)
   - Pagamentos de serviços
3. IGNORE: depósitos, PIX recebidos, salários, transferências recebidas, créditos
4. Para cada transação encontrada, extraia:
   - Data (formato YYYY-MM-DD)
   - Descrição clara do gasto
   - Valor (SEMPRE NEGATIVO para gastos, ex: -150.50)
   - Categoria apropriada
5. Use apenas estas categorias: "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Outros"

FORMATO DE RESPOSTA (JSON válido):
[
  {
    "date": "YYYY-MM-DD",
    "description": "Descrição clara da transação",
    "amount": -valor_negativo,
    "category": "categoria_apropriada"
  }
]

IMPORTANTE: 
- Retorne APENAS o JSON array válido
- Se não encontrar transações de débito, retorne []
- NÃO adicione explicações ou texto extra
- Seja rigoroso: só extraia transações que claramente representem gastos/débitos
- Analise TODO o texto fornecido, não apenas uma parte`;
    
    console.log('[GPT] Sending request to OpenAI...');
    
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
            content: 'Você é um especialista em análise de extratos bancários brasileiros do NUBANK. Extraia apenas transações de DÉBITO reais do texto fornecido. Sempre retorne um JSON array válido, mesmo que vazio. NUNCA invente dados que não estão no texto. Seja extremamente rigoroso na identificação de débitos vs créditos. Analise TODO o texto fornecido.'
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
    
    console.log('[GPT] Cleaned OpenAI response:', extractedTransactionsText);
    
    let transactions: any[];
    try {
      transactions = JSON.parse(extractedTransactionsText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
      console.log('[GPT] Failed to parse text:', extractedTransactionsText);
      return [];
    }
    
    if (!Array.isArray(transactions)) {
      console.error('[GPT] Response is not an array:', typeof transactions);
      return [];
    }
    
    console.log(`[GPT] Parsed ${transactions.length} transactions from OpenAI`);
    console.log('[GPT] Raw transactions:', transactions);
    
    // Filter to ensure only negative amounts (debits)
    const debitTransactions = transactions.filter(t => t.amount && t.amount < 0);
    console.log(`[GPT] Filtered to ${debitTransactions.length} debit transactions`);
    
    const validTransactions = debitTransactions.filter(validateTransaction);
    
    console.log(`[VALIDATION] Found ${validTransactions.length} valid debit transactions`);
    
    if (validTransactions.length === 0) {
      console.log('[VALIDATION] No valid debit transactions found in the text');
      console.log('[DEBUG] Sample of original transactions:', transactions.slice(0, 5));
      console.log('[DEBUG] Sample of debit transactions:', debitTransactions.slice(0, 5));
    } else {
      console.log('[VALIDATION] Sample valid transaction:', validTransactions[0]);
      console.log('[VALIDATION] All valid transactions:', validTransactions);
    }
    
    return validTransactions;
    
  } catch (error) {
    console.error('[GPT] Error processing with OpenAI:', error);
    return [];
  }
};
