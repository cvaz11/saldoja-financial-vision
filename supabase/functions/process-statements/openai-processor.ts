
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
    console.log(`[GPT] Text preview for analysis:`, extractedText.substring(0, 2000));
    
    // If text is too short, return empty
    if (extractedText.length < 50) {
      console.log('[GPT] Text too short, returning empty array');
      return [];
    }
    
    const prompt = `Você é um especialista em análise de extratos bancários brasileiros. Analise o texto do extrato fornecido e extraia APENAS transações de DÉBITO/SAÍDA (gastos).

INSTRUÇÕES CRÍTICAS:
1. Extraia apenas transações REAIS que aparecem claramente no texto
2. IGNORE completamente: depósitos, PIX recebidos, salários, transferências recebidas, créditos
3. Procure por: compras, pagamentos, débitos, saques, taxas, anuidades
4. Valores devem ser SEMPRE NEGATIVOS (ex: -150.50 para um gasto de R$ 150,50)
5. Datas no formato YYYY-MM-DD
6. Descrições claras e concisas
7. Use apenas estas categorias: "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Outros"

FORMATO DE RESPOSTA (JSON válido):
[
  {
    "date": "YYYY-MM-DD",
    "description": "Descrição da transação",
    "amount": -valor_numerico_negativo,
    "category": "categoria_apropriada"
  }
]

EXEMPLOS DE TRANSAÇÕES VÁLIDAS:
- Compras no cartão de crédito/débito
- Pagamentos via PIX
- Saques em caixas eletrônicos
- Taxas bancárias
- Anuidades
- Transferências enviadas (débito)

TEXTO DO EXTRATO:
${extractedText}

IMPORTANTE: 
- Retorne APENAS o JSON array válido
- Se não encontrar transações de débito, retorne []
- NÃO adicione explicações ou texto extra
- Seja muito rigoroso: só extraia transações que claramente representam gastos/débitos`;
    
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
            content: 'Você é um especialista em análise de extratos bancários brasileiros. Extraia apenas transações de DÉBITO reais do texto fornecido. Sempre retorne um JSON array válido, mesmo que vazio. NUNCA invente dados que não estão no texto. Seja extremamente rigoroso na identificação de débitos vs créditos.'
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
    
    console.log('[GPT] Cleaned response:', extractedTransactionsText.substring(0, 1000));
    
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
    
    // Filter to ensure only negative amounts (debits)
    const debitTransactions = transactions.filter(t => t.amount && t.amount < 0);
    console.log(`[GPT] Filtered to ${debitTransactions.length} debit transactions`);
    
    const validTransactions = debitTransactions.filter(validateTransaction);
    
    console.log(`[VALIDATION] Found ${validTransactions.length} valid debit transactions`);
    
    if (validTransactions.length === 0) {
      console.log('[VALIDATION] No valid debit transactions found in the text');
      console.log('[DEBUG] Sample of original transactions:', transactions.slice(0, 3));
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
