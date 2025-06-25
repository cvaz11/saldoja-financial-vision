
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

const parseNubankDate = (dateStr: string): string => {
  const months = {
    'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06',
    'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12'
  };
  
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 2) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1] as keyof typeof months] || '01';
    const year = parts[2] || '2025';
    return `${year}-${month}-${day}`;
  }
  
  return '2025-01-01';
};

const extractDirectTransactions = (text: string): Transaction[] => {
  console.log('[DIRECT] Starting enhanced direct transaction extraction...');
  console.log('[DIRECT] Text length:', text.length);
  console.log('[DIRECT] Text preview:', text.slice(0, 1000));
  
  const transactions: Transaction[] = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line || line.length < 10) continue;
    
    // Skip obvious credits/payments received (more comprehensive)
    const skipPatterns = [
      /IOF/i,
      /Pagamento\s+recebido/i,
      /Payment\s+received/i,
      /Crédito/i,
      /Credit/i,
      /USD\s+refund/i,
      /Transferência\s+recebida/i,
      /Received/i,
      /Depósito/i,
      /Deposit/i,
      /Estorno/i,
      /Refund/i
    ];
    
    if (skipPatterns.some(pattern => pattern.test(line))) {
      console.log('[DIRECT] Skipping credit/refund:', line.slice(0, 100));
      continue;
    }
    
    // Look for money patterns (more flexible)
    const moneyMatches = line.match(/R\$\s*([\d.,]+)|USD\s*([\d.,]+)|EUR\s*([\d.,]+)/g);
    if (!moneyMatches) continue;
    
    // Look for date pattern (more flexible)
    const dateMatch = line.match(/(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)(\s+\d{4})?/i);
    if (!dateMatch) continue;
    
    const dateStr = parseNubankDate(dateMatch[0]);
    
    // Extract the largest amount
    let maxAmount = 0;
    let currency = 'R$';
    
    for (const match of moneyMatches) {
      const cleanAmount = match.replace(/R\$|USD|EUR/, '').trim().replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(cleanAmount);
      if (!isNaN(amount) && amount > maxAmount) {
        maxAmount = amount;
        currency = match.includes('USD') ? 'USD' : match.includes('EUR') ? 'EUR' : 'R$';
      }
    }
    
    if (maxAmount <= 0) continue;
    
    // Extract description (enhanced)
    let description = line
      .replace(/(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)(\s+\d{4})?/i, '')
      .replace(/R\$\s*[\d.,]+|USD\s*[\d.,]+|EUR\s*[\d.,]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Clean up description
    description = description
      .replace(/^[^\w]+/, '') // Remove leading non-word characters
      .replace(/[^\w\s\-*\/]+$/, '') // Remove trailing non-word characters
      .trim();
    
    if (description.length === 0) {
      description = 'Transação';
    }
    
    // Enhanced category detection
    let category = 'Outros';
    const desc = description.toLowerCase();
    
    if (desc.includes('uber') || desc.includes('99') || desc.includes('taxi') || desc.includes('transporte')) {
      category = 'Transporte';
    } else if (desc.includes('ifood') || desc.includes('restaurante') || desc.includes('padaria') || desc.includes('lanche') || desc.includes('comida')) {
      category = 'Alimentação';
    } else if (desc.includes('farmacia') || desc.includes('hospital') || desc.includes('medic') || desc.includes('saude')) {
      category = 'Saúde';
    } else if (desc.includes('shopping') || desc.includes('loja') || desc.includes('compra') || desc.includes('mercado')) {
      category = 'Compras';
    } else if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('cinema') || desc.includes('lazer')) {
      category = 'Lazer';
    } else if (desc.includes('parcela') || desc.includes('financiamento') || desc.includes('emprestimo')) {
      category = 'Financeiro';
    } else if (desc.includes('tech') || desc.includes('agi') || desc.includes('software') || desc.includes('app')) {
      category = 'Tecnologia';
    }
    
    // Check for installments
    const installmentMatch = description.match(/parcela\s+(\d+)\/(\d+)|(\d+)\/(\d+)/i);
    
    const transaction: Transaction = {
      date: dateStr,
      description: `${description}${currency !== 'R$' ? ` (${currency})` : ''}`,
      amount: -maxAmount, // Always negative for debits
      category
    };
    
    if (installmentMatch) {
      transaction.installment_number = parseInt(installmentMatch[1] || installmentMatch[3]);
      transaction.installment_total = parseInt(installmentMatch[2] || installmentMatch[4]);
    }
    
    transactions.push(transaction);
    console.log(`[DIRECT] Found transaction: ${description} - ${currency} ${maxAmount.toFixed(2)}`);
  }
  
  console.log(`[DIRECT] Extracted ${transactions.length} transactions directly`);
  return transactions;
};

export const processTextWithOpenAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[GPT] Starting enhanced transaction processing...');
    console.log(`[GPT] Processing text of ${extractedText.length} characters`);
    console.log(`[GPT] Sample text:`, extractedText.slice(0, 1000));
    
    // First try enhanced direct extraction
    const directTransactions = extractDirectTransactions(extractedText);
    
    if (directTransactions.length > 0) {
      console.log(`[GPT] Direct extraction successful: ${directTransactions.length} transactions`);
      return directTransactions;
    }
    
    // If direct extraction fails, try OpenAI with GPT-4 (more powerful)
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.log('[GPT] No OpenAI key, returning direct results');
      return directTransactions;
    }
    
    console.log('[GPT] Trying GPT-4 extraction (enhanced prompt)...');
    
    const prompt = `Você é um especialista em análise de extratos bancários do NUBANK. Analise este texto extraído de um PDF e encontre APENAS transações de DÉBITO (gastos/saídas).

TEXTO DO EXTRATO:
${extractedText.slice(0, 8000)}

INSTRUÇÕES CRÍTICAS:
1. IGNORE completamente: IOF, "Pagamento recebido", "Crédito", "USD refund", "Transferência recebida", "Depósito", "Estorno"
2. EXTRAIA apenas: compras, pagamentos feitos, saques, transferências enviadas, Uber, iFood, parcelas, etc.
3. Para cada transação de débito:
   - Data: converta formato "12 Jun" para "2025-06-12"
   - Descrição: limpe e seja descritivo
   - Valor: SEMPRE NEGATIVO (ex: -150.50)
   - Categoria: escolha a mais apropriada

CATEGORIAS DISPONÍVEIS:
"Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Compras", "Outros"

EXEMPLO DE RESPOSTA ESPERADA:
[
  {
    "date": "2025-06-12",
    "description": "Uber - Viagem Centro",
    "amount": -25.50,
    "category": "Transporte"
  },
  {
    "date": "2025-06-11", 
    "description": "iFood - Pedido Restaurante",
    "amount": -45.80,
    "category": "Alimentação"
  },
  {
    "date": "2025-06-10",
    "description": "Agi Tech - Parcela 9/12",
    "amount": -396.66,
    "category": "Tecnologia"
  }
]

IMPORTANTE: Retorne APENAS o JSON array válido. Se não encontrar transações de débito, retorne [].`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using more powerful model
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de extratos bancários do Nubank. Você é extremamente preciso em identificar transações de débito e ignorar créditos. Sempre retorne JSON válido.'
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
      console.error('[GPT] OpenAI API error:', openAIResponse.status);
      const errorText = await openAIResponse.text();
      console.error('[GPT] Error details:', errorText);
      return directTransactions;
    }
    
    const result = await openAIResponse.json();
    let responseText = result.choices[0].message.content.trim();
    
    // Clean JSON response
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?$/g, '')
      .replace(/```/g, '')
      .trim();
    
    console.log('[GPT] GPT-4 response:', responseText.slice(0, 2000));
    
    let transactions: any[];
    try {
      transactions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
      console.log('[GPT] Raw response that failed to parse:', responseText);
      return directTransactions;
    }
    
    if (!Array.isArray(transactions)) {
      console.error('[GPT] Response is not an array');
      return directTransactions;
    }
    
    // Validate and filter transactions
    const validTransactions = transactions.filter(validateTransaction);
    
    console.log(`[GPT] GPT-4 found ${validTransactions.length} valid transactions`);
    
    // Return the better result
    return validTransactions.length > directTransactions.length ? validTransactions : directTransactions;
    
  } catch (error) {
    console.error('[GPT] Error in processing:', error);
    return [];
  }
};
