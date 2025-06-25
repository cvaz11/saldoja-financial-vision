
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
  console.log('[DIRECT] Starting ultra-enhanced direct transaction extraction...');
  console.log('[DIRECT] Text length:', text.length);
  console.log('[DIRECT] Text preview:', text.slice(0, 1500));
  
  const transactions: Transaction[] = [];
  
  // Split by various possible delimiters
  const segments = text.split(/\n|;|,(?=\s*\d)|\.(?=\s*[A-Z])/);
  
  for (let i = 0; i < segments.length; i++) {
    let segment = segments[i].trim();
    
    if (!segment || segment.length < 8) continue;
    
    // Skip obvious credits/payments received 
    const skipPatterns = [
      /IOF/i, /Pagamento\s+recebido/i, /Payment\s+received/i, /Crédito/i, /Credit/i,
      /USD\s+refund/i, /Transferência\s+recebida/i, /Received/i, /Depósito/i, 
      /Deposit/i, /Estorno/i, /Refund/i, /Cashback/i
    ];
    
    if (skipPatterns.some(pattern => pattern.test(segment))) {
      console.log('[DIRECT] Skipping credit/refund:', segment.slice(0, 80));
      continue;
    }
    
    // Enhanced money pattern detection
    const moneyMatches = segment.match(/(?:R\$|USD|EUR)\s*([\d.,]+)/g);
    if (!moneyMatches) {
      // Try to find standalone money values near dates
      const nearbyText = [segments[i-1], segment, segments[i+1]].join(' ').trim();
      const standaloneMoneyMatches = nearbyText.match(/(?:R\$|USD|EUR)\s*([\d.,]+)/g);
      if (!standaloneMoneyMatches) continue;
    }
    
    // Enhanced date pattern detection
    const dateMatch = segment.match(/(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)(\s+\d{4})?/i) ||
                     segment.match(/(\d{2,4}[-\/]\d{1,2}[-\/]\d{1,2})/);
    
    let dateStr = '2025-01-01';
    if (dateMatch) {
      if (dateMatch[0].includes('-') || dateMatch[0].includes('/')) {
        // Handle date formats like 2025-06-25 or 25/06/2025
        const dateParts = dateMatch[0].split(/[-\/]/);
        if (dateParts.length === 3) {
          const [a, b, c] = dateParts;
          if (a.length === 4) {
            dateStr = `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
          } else {
            dateStr = `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
          }
        }
      } else {
        dateStr = parseNubankDate(dateMatch[0]);
      }
    }
    
    // Enhanced amount extraction
    let maxAmount = 0;
    let currency = 'R$';
    
    const allMatches = (moneyMatches || segment.match(/(?:R\$|USD|EUR)\s*([\d.,]+)/g)) || [];
    
    // Also look for standalone numbers that might be amounts
    const standaloneNumbers = segment.match(/\b(\d{1,4}[.,]\d{2})\b/g) || [];
    
    [...allMatches, ...standaloneNumbers.map(n => `R$ ${n}`)].forEach(match => {
      const cleanAmount = match.replace(/R\$|USD|EUR/, '').trim().replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(cleanAmount);
      if (!isNaN(amount) && amount > maxAmount && amount < 50000) { // Reasonable limit
        maxAmount = amount;
        currency = match.includes('USD') ? 'USD' : match.includes('EUR') ? 'EUR' : 'R$';
      }
    });
    
    if (maxAmount <= 0) continue;
    
    // Enhanced description extraction and cleaning
    let description = segment
      .replace(/(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)(\s+\d{4})?/gi, '')
      .replace(/(?:R\$|USD|EUR)\s*[\d.,]+/g, '')
      .replace(/\d{2,4}[-\/]\d{1,2}[-\/]\d{1,2}/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^[^\w]+|[^\w\s\-*\/]+$/g, '')
      .trim();
    
    // If description is empty or too short, try to get context from nearby segments
    if (description.length < 3) {
      const contextSegments = [segments[i-2], segments[i-1], segments[i+1], segments[i+2]]
        .filter(s => s && s.trim().length > 3)
        .map(s => s.trim());
      
      for (const contextSeg of contextSegments) {
        const cleanContext = contextSeg
          .replace(/(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)(\s+\d{4})?/gi, '')
          .replace(/(?:R\$|USD|EUR)\s*[\d.,]+/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanContext.length > description.length && cleanContext.length > 5) {
          description = cleanContext;
          break;
        }
      }
    }
    
    if (description.length === 0) {
      description = 'Transação';
    }
    
    // Super enhanced category detection
    let category = 'Outros';
    const desc = description.toLowerCase();
    
    const categoryRules = {
      'Transporte': ['uber', '99', 'taxi', 'transporte', 'viagem', 'combustivel', 'posto', 'gasolina', 'alcool', 'shell', 'ipiranga', 'br'],
      'Alimentação': ['ifood', 'restaurante', 'padaria', 'lanche', 'comida', 'mercado', 'supermercado', 'açougue', 'hortifruti', 'pao', 'pizza', 'burguer', 'mcdonalds', 'bk'],
      'Saúde': ['farmacia', 'hospital', 'medic', 'saude', 'clinica', 'laboratorio', 'droga', 'remedios', 'consulta'],
      'Compras': ['shopping', 'loja', 'compra', 'magazine', 'americanas', 'casas', 'bahia', 'extra', 'carrefour', 'walmart'],
      'Lazer': ['netflix', 'spotify', 'cinema', 'lazer', 'entretenimento', 'jogos', 'parque', 'teatro', 'show'],
      'Financeiro': ['parcela', 'financiamento', 'emprestimo', 'banco', 'juros', 'tarifa', 'taxa', 'anuidade'],
      'Tecnologia': ['tech', 'agi', 'software', 'app', 'google', 'apple', 'microsoft', 'amazon', 'digital'],
      'Casa': ['casa', 'lar', 'construção', 'reforma', 'moveis', 'eletro', 'utilidades'],
      'Vestuário': ['roupa', 'moda', 'calçado', 'sapato', 'vestido', 'camisa', 'calça']
    };
    
    for (const [cat, keywords] of Object.entries(categoryRules)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        category = cat;
        break;
      }
    }
    
    // Enhanced installment detection
    const installmentMatch = description.match(/parcela\s+(\d+)\/(\d+)|(\d+)\/(\d+)\s*parcela/i) ||
                            segment.match(/(\d+)\s*\/\s*(\d+)/);
    
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
    console.log(`[DIRECT] Found transaction: ${description} - ${currency} ${maxAmount.toFixed(2)} on ${dateStr}`);
  }
  
  console.log(`[DIRECT] Extracted ${transactions.length} transactions directly`);
  return transactions;
};

export const processTextWithOpenAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[GPT] Starting ultra-enhanced transaction processing...');
    console.log(`[GPT] Processing text of ${extractedText.length} characters`);
    console.log(`[GPT] Sample text:`, extractedText.slice(0, 1500));
    
    // First try ultra-enhanced direct extraction
    const directTransactions = extractDirectTransactions(extractedText);
    
    if (directTransactions.length > 0) {
      console.log(`[GPT] Direct extraction successful: ${directTransactions.length} transactions`);
      return directTransactions;
    }
    
    // Enhanced GPT-4 processing with more aggressive prompting
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.log('[GPT] No OpenAI key, returning direct results');
      return directTransactions;
    }
    
    console.log('[GPT] Trying GPT-4 with ultra-aggressive prompt...');
    
    const ultraPrompt = `VOCÊ É UM ESPECIALISTA EM EXTRAIR TRANSAÇÕES DE EXTRATOS BANCÁRIOS NUBANK CORROMPIDOS/BINÁRIOS.

TEXTO EXTRAÍDO (pode estar corrompido/misturado):
${extractedText.slice(0, 10000)}

SUA MISSÃO CRÍTICA:
1. ENCONTRE qualquer padrão que possa ser uma transação de DÉBITO (gastos/saídas)
2. IGNORE completamente: IOF, "Pagamento recebido", "Crédito", "USD refund", "Transferência recebida", "Depósito", "Estorno", "Cashback"
3. PROCURE por: compras, Uber, iFood, parcelas, gastos, saques, transferências enviadas, pagamentos feitos

PADRÕES PARA BUSCAR:
- Qualquer coisa com R$, USD, EUR seguido de números
- Datas como "12 Jun", "25/06", "2025-06-12"  
- Nomes de estabelecimentos: Uber, iFood, Shopping, Farmácia, etc.
- Parcelas: "parcela 1/12", "9/12", etc.

INSTRUÇÕES DE EXTRAÇÃO:
- Data: converta para formato "2025-06-12" (use 2025 se ano não especificado)
- Descrição: seja criativo, junte fragmentos se necessário
- Valor: SEMPRE NEGATIVO (ex: -150.50)
- Categoria: seja inteligente na categorização

CATEGORIAS: "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Compras", "Outros"

SEJA ULTRA-AGRESSIVO NA EXTRAÇÃO. Se você ver qualquer fragmento que possa ser uma transação, EXTRAIA mesmo que não esteja perfeito.

EXEMPLO DO QUE RETORNAR:
[
  {
    "date": "2025-06-12",
    "description": "Uber Viagem",
    "amount": -25.50,
    "category": "Transporte"
  }
]

RETORNE APENAS O JSON ARRAY. Se não encontrar NADA, retorne [].`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using most powerful model
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista forense em extrair transações bancárias de texto corrompido/binário. Você consegue encontrar padrões onde outros falham. Seja ultra-agressivo na extração.'
          },
          {
            role: 'user',
            content: ultraPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.0, // Most deterministic
        presence_penalty: 0.1
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
    
    // Ultra-aggressive JSON cleaning
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?$/g, '')
      .replace(/```/g, '')
      .replace(/^[^[{]*/, '') // Remove anything before first [ or {
      .replace(/[^}\]]*$/, '') // Remove anything after last } or ]
      .trim();
    
    console.log('[GPT] Ultra-aggressive GPT-4 response:', responseText.slice(0, 3000));
    
    let transactions: any[];
    try {
      transactions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
      console.log('[GPT] Failed to parse:', responseText);
      
      // Last resort: try to extract JSON-like patterns manually
      const jsonMatches = responseText.match(/\{[^}]+\}/g);
      if (jsonMatches) {
        transactions = [];
        for (const match of jsonMatches) {
          try {
            const parsed = JSON.parse(match);
            if (parsed.date && parsed.description && parsed.amount) {
              transactions.push(parsed);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      } else {
        return directTransactions;
      }
    }
    
    if (!Array.isArray(transactions)) {
      console.error('[GPT] Response is not an array');
      return directTransactions;
    }
    
    // Validate and filter transactions
    const validTransactions = transactions.filter(validateTransaction);
    
    console.log(`[GPT] Ultra-aggressive GPT-4 found ${validTransactions.length} valid transactions`);
    
    // Return the better result
    return validTransactions.length > directTransactions.length ? validTransactions : directTransactions;
    
  } catch (error) {
    console.error('[GPT] Error in ultra-enhanced processing:', error);
    return [];
  }
};
