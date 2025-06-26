
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
    console.log('[GPT] ===== STARTING NUBANK ANALYSIS WITH NEW PROMPT =====');
    console.log(`[GPT] Processing ${extractedText.length} characters of text`);
    
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.log('[GPT] No OpenAI API key - cannot process');
      return [];
    }
    
    console.log('[GPT] Using comprehensive Nubank analysis prompt...');
    
    const prompt = `📌 ANÁLISE CRÍTICA DE EXTRATO NUBANK

Você está prestes a analisar um extrato de cartão de crédito da Nubank em formato PDF. Seu objetivo é extrair, entender e estruturar as transações financeiras realizadas no período informado no documento.

TEXTO EXTRAÍDO DO PDF:
${extractedText.slice(0, 15000)}

🧠 Sua tarefa:
Extraia e organize todas as transações realizadas no período da fatura seguindo estas regras:

1. IDENTIFIQUE APENAS TRANSAÇÕES DE DÉBITO (gastos):
   - Compras nacionais
   - Compras internacionais 
   - IOF de transações internacionais
   - Parcelamentos de compras
   - Taxas e tarifas

2. IGNORE COMPLETAMENTE:
   - Pagamentos da fatura
   - Transferências recebidas
   - Cashback
   - Saldo anterior
   - Limite disponível

3. PARA CADA TRANSAÇÃO ENCONTRADA, EXTRAIA:
   - Data no formato YYYY-MM-DD (converta datas como "12 JUN" para "2025-06-12")
   - Descrição clara do estabelecimento/serviço
   - Valor sempre NEGATIVO (ex: -150.00 para R$ 150,00)
   - Categoria adequada

4. CATEGORIAS PERMITIDAS:
   - "Alimentação" (restaurantes, delivery, supermercados)
   - "Transporte" (Uber, 99, taxi, combustível)
   - "Tecnologia" (Netflix, Spotify, Amazon, apps)
   - "Saúde" (farmácias, clínicas, planos)
   - "Compras" (lojas, shopping, e-commerce)
   - "Lazer" (cinemas, shows, viagens)
   - "Financeiro" (IOF, taxas, juros)
   - "Serviços" (salões, manutenção, profissionais)
   - "Outros" (quando não se encaixa nas anteriores)

5. PARCELAMENTOS:
   - Se encontrar "Parcela X/Y", extraia os números para installment_number e installment_total

IMPORTANTE: 
- Retorne APENAS transações de débito (gastos negativos)
- Se não encontrar nenhum gasto, retorne array vazio []
- Mantenha descrições claras e concisas
- Use sempre valores negativos para gastos

Retorne APENAS o JSON array no formato:
[
  {
    "date": "2025-06-12",
    "description": "UBER EATS",
    "amount": -45.50,
    "category": "Alimentação"
  }
]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de extratos financeiros Nubank. Seja meticuloso na extração de transações de débito.'
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
    
    if (!response.ok) {
      console.error('[GPT] OpenAI API error:', response.status);
      return [];
    }
    
    const result = await response.json();
    let responseText = result.choices[0].message.content.trim();
    
    console.log('[GPT] Raw GPT response length:', responseText.length);
    console.log('[GPT] GPT response preview:', responseText.slice(0, 500));
    
    // Clean response
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^[{]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    
    if (!responseText || responseText === '[]') {
      console.log('[GPT] GPT returned empty result');
      return [];
    }
    
    let gptTransactions: any[];
    try {
      gptTransactions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
      console.error('[GPT] Failed response:', responseText);
      return [];
    }
    
    if (!Array.isArray(gptTransactions)) {
      console.error('[GPT] Response is not an array');
      return [];
    }
    
    const validTransactions = gptTransactions.filter(validateTransaction);
    console.log(`[GPT] GPT extracted ${validTransactions.length} valid debit transactions`);
    
    // Log sample transactions
    if (validTransactions.length > 0) {
      console.log('[GPT] Sample transactions found:');
      validTransactions.slice(0, 3).forEach((tx, i) => {
        console.log(`[GPT]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)}`);
      });
    }
    
    return validTransactions;
    
  } catch (error) {
    console.error('[GPT] Error in OpenAI processing:', error);
    return [];
  }
};
