
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
    'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12',
    'MAI': '05', 'JUN': '06'
  };
  
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 2) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1] as keyof typeof months] || '06';
    const year = parts[2] || '2025';
    return `${year}-${month}-${day}`;
  }
  
  return '2025-06-01';
};

const extractNubankTransactions = (text: string): Transaction[] => {
  console.log('[NUBANK] Starting enhanced Nubank transaction extraction...');
  console.log('[NUBANK] Text length:', text.length);
  console.log('[NUBANK] Text preview:', text.slice(0, 2000));
  
  const transactions: Transaction[] = [];
  
  // Split text into potential transaction segments
  const lines = text.split(/\n+/);
  
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i].trim();
    const nextLine = lines[i + 1]?.trim() || '';
    const combined = `${currentLine} ${nextLine}`.trim();
    
    if (!currentLine || currentLine.length < 5) continue;
    
    // Skip credits and payments received
    const skipPatterns = [
      /IOF de.*refund/i,
      /Pagamento\s+(recebido|em)/i,
      /Transferência\s+recebida/i,
      /Estorno/i,
      /Cashback/i,
      /Crédito/i,
      /^\s*Pagamentos\s*$/i,
      /^\s*-R\$\s*\d/i // Skip negative values (payments made by user)
    ];
    
    if (skipPatterns.some(pattern => pattern.test(combined))) {
      console.log('[NUBANK] Skipping credit/payment:', combined.slice(0, 80));
      continue;
    }
    
    // Enhanced Nubank transaction pattern matching
    // Look for: DATE + CARD + DESCRIPTION + AMOUNT
    const transactionPatterns = [
      // Pattern: "05 MAI **** 7911 Agi*Tute Tech - Parcela 9/12 R$ 396,66"
      /(\d{1,2}\s+(?:MAI|JUN|Jan|Fev|Mar|Abr|Jul|Ago|Set|Out|Nov|Dez))\s+.*?(\*+\s*\d{4})\s+([^R$]+)\s+R\$\s*([\d.,]+)/i,
      
      // Pattern: "20 MAI **** 4804 Apollo.Io USD 59.00 Conversão: USD 1 = R$ 5,88 R$ 347,24"
      /(\d{1,2}\s+(?:MAI|JUN|Jan|Fev|Mar|Abr|Jul|Ago|Set|Out|Nov|Dez))\s+.*?(\*+\s*\d{4})\s+([^R$]+?)(?:USD|EUR|GBP).*?R\$\s*([\d.,]+)/i,
      
      // Pattern: "28 MAI IOF de "Cafe Estacion N.Minist" R$ 1,67"
      /(\d{1,2}\s+(?:MAI|JUN|Jan|Fev|Mar|Abr|Jul|Ago|Set|Out|Nov|Dez))\s+IOF de\s+"([^"]+)"\s+R\$\s*([\d.,]+)/i,
      
      // General pattern for any transaction with date and amount
      /(\d{1,2}\s+(?:MAI|JUN|Jan|Fev|Mar|Abr|Jul|Ago|Set|Out|Nov|Dez))\s+.*?([A-Za-z][^R$]{5,50}?)\s+R\$\s*([\d.,]+)/i
    ];
    
    let matched = false;
    
    for (const pattern of transactionPatterns) {
      const match = combined.match(pattern);
      if (match) {
        console.log('[NUBANK] Pattern matched:', match[0]);
        
        const dateStr = parseNubankDate(match[1]);
        let description = '';
        let amountStr = '';
        
        if (match.length === 5) {
          // Full match with date, card, description, amount
          description = match[3].trim();
          amountStr = match[4];
        } else if (match.length === 4) {
          // IOF or simpler pattern
          description = match[2].trim();
          amountStr = match[3];
        }
        
        // Clean description
        description = description
          .replace(/Conversão:.*$/i, '')
          .replace(/USD\s*[\d.,]+/g, '')
          .replace(/EUR\s*[\d.,]+/g, '')
          .replace(/GBP\s*[\d.,]+/g, '')
          .replace(/\*+\s*\d{4}/g, '')
          .replace(/^\s*IOF de\s*/i, 'IOF ')
          .replace(/^["']|["']$/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (description.length < 3) {
          description = 'Transação';
        }
        
        // Parse amount
        const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
        
        if (isNaN(amount) || amount <= 0) continue;
        
        // Enhanced category detection
        let category = 'Outros';
        const desc = description.toLowerCase();
        
        const categoryRules = {
          'Tecnologia': ['agi', 'tute', 'tech', 'apple', 'apollo', 'vodafone', 'paypal', 'google', 'amazon', 'netflix', 'spotify'],
          'Alimentação': ['cafe', 'estacion', 'fruver', 'bravo', 'mercadona', 'dunkin', 'donuts', 'chloelan', 'coffee'],
          'Compras': ['parnasse', 'flores', 'shaddai', 'peluqueria', 'polleria', 'market', 'ccaminos', 'retail'],
          'Transporte': ['railway', 'uber', 'taxi', '99', 'combustivel', 'posto'],
          'Saúde': ['farmacia', 'eugenia', 'campo', 'clinica', 'hospital'],
          'Lazer': ['five', 'guys', 'spain', 'corte', 'ingles', 'depart'],
          'Financeiro': ['iof', 'taxa', 'tarifa', 'juros', 'parcela'],
          'Serviços': ['tinta', 'papel', 'primaprint', 'ilunion']
        };
        
        for (const [cat, keywords] of Object.entries(categoryRules)) {
          if (keywords.some(keyword => desc.includes(keyword))) {
            category = cat;
            break;
          }
        }
        
        // Check for installments
        const installmentMatch = description.match(/parcela\s+(\d+)\/(\d+)/i);
        
        const transaction: Transaction = {
          date: dateStr,
          description: description,
          amount: -amount, // Always negative for debits
          category
        };
        
        if (installmentMatch) {
          transaction.installment_number = parseInt(installmentMatch[1]);
          transaction.installment_total = parseInt(installmentMatch[2]);
        }
        
        transactions.push(transaction);
        console.log(`[NUBANK] Found transaction: ${description} - R$ ${amount.toFixed(2)} on ${dateStr}`);
        matched = true;
        break;
      }
    }
    
    // If no pattern matched, try a more general approach
    if (!matched && /R\$\s*[\d.,]+/.test(combined)) {
      const dateMatch = combined.match(/(\d{1,2}\s+(?:MAI|JUN|Jan|Fev|Mar|Abr|Jul|Ago|Set|Out|Nov|Dez))/i);
      const amountMatch = combined.match(/R\$\s*([\d.,]+)/);
      
      if (dateMatch && amountMatch) {
        const dateStr = parseNubankDate(dateMatch[1]);
        const amount = parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.'));
        
        if (!isNaN(amount) && amount > 0) {
          let description = combined
            .replace(/\d{1,2}\s+(?:MAI|JUN|Jan|Fev|Mar|Abr|Jul|Ago|Set|Out|Nov|Dez)/gi, '')
            .replace(/R\$\s*[\d.,]+/g, '')
            .replace(/\*+\s*\d{4}/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (description.length < 3) {
            description = 'Transação';
          }
          
          const transaction: Transaction = {
            date: dateStr,
            description: description.slice(0, 100),
            amount: -amount,
            category: 'Outros'
          };
          
          transactions.push(transaction);
          console.log(`[NUBANK] Found general transaction: ${description} - R$ ${amount.toFixed(2)}`);
        }
      }
    }
  }
  
  console.log(`[NUBANK] Extracted ${transactions.length} transactions`);
  return transactions;
};

export const processTextWithOpenAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[GPT] Starting Nubank transaction processing...');
    console.log(`[GPT] Processing text of ${extractedText.length} characters`);
    
    // First try enhanced direct extraction
    const directTransactions = extractNubankTransactions(extractedText);
    
    if (directTransactions.length > 0) {
      console.log(`[GPT] Direct extraction successful: ${directTransactions.length} transactions`);
      return directTransactions;
    }
    
    // Enhanced GPT-4 processing with Nubank-specific prompt
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.log('[GPT] No OpenAI key, returning direct results');
      return directTransactions;
    }
    
    console.log('[GPT] Trying GPT-4 with Nubank-specific prompt...');
    
    const nubankPrompt = `VOCÊ É UM ESPECIALISTA EM EXTRAIR TRANSAÇÕES DE EXTRATOS NUBANK.

TEXTO DO EXTRATO NUBANK:
${extractedText.slice(0, 12000)}

INSTRUÇÕES ESPECÍFICAS PARA NUBANK:
1. PROCURE por padrões como: "05 MAI **** 7911 Agi*Tute Tech - Parcela 9/12 R$ 396,66"
2. EXTRAIA transações com datas como "05 MAI", "20 MAI", "28 MAI", etc.
3. IGNORE "IOF" de valores pequenos, "Pagamentos" negativos, "Estornos"
4. CAPTURE compras como: Apple.Com/Bill, Apollo.Io, PayPal, Cafe Estacion, Farmacia, etc.
5. CONVERTA datas para formato "2025-06-XX" (use 06 para MAI, 07 para JUN)
6. VALORES sempre NEGATIVOS (ex: -396.66 para gastos)

ESTABELECIMENTOS TÍPICOS NO EXTRATO:
- Agi*Tute Tech, Apple.Com/Bill, Apollo.Io
- PayPal *Haqsultan, Mon Parnasse Flores
- Cafe Estacion N.Minist, Dali Fruver
- Farmacia Eugenia Campo, Shaddai Peluqueria
- Vodafone, Railway, Five Guys Spain
- Market Ccaminos, Mercadona de San Enriq

EXEMPLO DE SAÍDA:
[
  {
    "date": "2025-06-05",
    "description": "Agi*Tute Tech - Parcela 9/12",
    "amount": -396.66,
    "category": "Tecnologia",
    "installment_number": 9,
    "installment_total": 12
  },
  {
    "date": "2025-06-11", 
    "description": "Apple.Com/Bill",
    "amount": -11.90,
    "category": "Tecnologia"
  }
]

RETORNE APENAS O JSON ARRAY com TODAS as transações encontradas. Se não encontrar nada, retorne [].`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Você é um especialista em extrair transações de extratos bancários Nubank. Você reconhece todos os padrões e formatos específicos do Nubank.'
          },
          {
            role: 'user',
            content: nubankPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        presence_penalty: 0.1
      }),
    });
    
    if (!openAIResponse.ok) {
      console.error('[GPT] OpenAI API error:', openAIResponse.status);
      return directTransactions;
    }
    
    const result = await openAIResponse.json();
    let responseText = result.choices[0].message.content.trim();
    
    // Clean JSON response
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?$/g, '')
      .replace(/```/g, '')
      .replace(/^[^[{]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    
    console.log('[GPT] GPT-4 response:', responseText.slice(0, 2000));
    
    let transactions: any[];
    try {
      transactions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
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
