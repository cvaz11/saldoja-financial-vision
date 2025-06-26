
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
    'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08'
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
  console.log('[NUBANK] ===== ENHANCED NUBANK EXTRACTION =====');
  console.log('[NUBANK] Text length:', text.length);
  
  const transactions: Transaction[] = [];
  const lines = text.split(/[\r\n]+/);
  
  console.log(`[NUBANK] Processing ${lines.length} lines`);
  
  // Enhanced patterns for Nubank transactions
  const transactionPatterns = [
    // Pattern 1: Full transaction with date, card, description, amount
    /(\d{1,2}\s+(?:MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez))\s+.*?(\*+\s*\d{4})\s+([^R$]+?)\s+R\$\s*([\d.,]+)/i,
    
    // Pattern 2: IOF transactions
    /(\d{1,2}\s+(?:MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez))\s+IOF\s+de\s+"([^"]+)"\s+R\$\s*([\d.,]+)/i,
    
    // Pattern 3: Simple date + description + amount
    /(\d{1,2}\s+(?:MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez))\s+([^R$]{10,80}?)\s+R\$\s*([\d.,]+)/i,
    
    // Pattern 4: Date with USD/EUR conversion
    /(\d{1,2}\s+(?:MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez))\s+.*?([A-Za-z][^R$]{5,50}?)(?:USD|EUR|GBP)\s*[\d.,]+.*?R\$\s*([\d.,]+)/i
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.length < 10) continue;
    
    // Skip non-transaction lines
    const skipPatterns = [
      /^\s*Pagamentos?\s*$/i,
      /^\s*Transferências?\s*$/i,
      /^\s*Extrato/i,
      /^\s*Fatura/i,
      /^\s*Total/i,
      /^\s*Saldo/i,
      /^\s*Nubank/i,
      /Estorno/i,
      /Cashback/i,
      /Crédito/i
    ];
    
    if (skipPatterns.some(pattern => pattern.test(line))) {
      continue;
    }
    
    // Try each pattern
    for (const pattern of transactionPatterns) {
      const match = line.match(pattern);
      if (match) {
        console.log(`[NUBANK] Pattern matched: ${match[0]}`);
        
        let dateStr = match[1];
        let description = '';
        let amountStr = '';
        
        if (match.length === 5) {
          // Full match with card info
          description = match[3].trim();
          amountStr = match[4];
        } else if (match.length === 4) {
          // IOF or simple pattern
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
          .replace(/^\s*IOF\s+de\s*/i, 'IOF - ')
          .replace(/^["']|["']$/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (description.length < 3) {
          description = 'Transação não identificada';
        }
        
        // Parse amount
        const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
        
        if (isNaN(amount) || amount <= 0) {
          console.log(`[NUBANK] Invalid amount: ${amountStr}`);
          continue;
        }
        
        // Parse date
        const transactionDate = parseNubankDate(dateStr);
        
        // Categorize transaction
        let category = 'Outros';
        const desc = description.toLowerCase();
        
        const categoryRules = {
          'Tecnologia': ['agi', 'tute', 'tech', 'apple', 'apollo', 'vodafone', 'paypal', 'google', 'amazon', 'netflix', 'spotify', 'microsoft', 'adobe'],
          'Alimentação': ['cafe', 'estacion', 'fruver', 'bravo', 'mercadona', 'dunkin', 'donuts', 'coffee', 'restaurant', 'food', 'comida'],
          'Compras': ['parnasse', 'flores', 'shaddai', 'peluqueria', 'polleria', 'market', 'ccaminos', 'retail', 'shopping', 'loja'],
          'Transporte': ['railway', 'uber', 'taxi', '99', 'combustivel', 'posto', 'transport', 'metro', 'bus'],
          'Saúde': ['farmacia', 'eugenia', 'campo', 'clinica', 'hospital', 'medic', 'health', 'saude'],
          'Lazer': ['five', 'guys', 'spain', 'corte', 'ingles', 'depart', 'cinema', 'teatro', 'game', 'entretenimento'],
          'Financeiro': ['iof', 'taxa', 'tarifa', 'juros', 'parcela', 'bank', 'financial', 'financeiro'],
          'Serviços': ['tinta', 'papel', 'primaprint', 'ilunion', 'service', 'servico', 'consultoria']
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
          date: transactionDate,
          description: description.slice(0, 200),
          amount: -amount, // Always negative for debits
          category
        };
        
        if (installmentMatch) {
          transaction.installment_number = parseInt(installmentMatch[1]);
          transaction.installment_total = parseInt(installmentMatch[2]);
        }
        
        transactions.push(transaction);
        console.log(`[NUBANK] Extracted: ${description} - R$ ${amount.toFixed(2)} on ${transactionDate}`);
        break; // Found a match, no need to try other patterns
      }
    }
  }
  
  console.log(`[NUBANK] Total extracted transactions: ${transactions.length}`);
  return transactions;
};

export const processTextWithOpenAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[GPT] ===== STARTING COMPREHENSIVE PROCESSING =====');
    console.log(`[GPT] Processing text of ${extractedText.length} characters`);
    
    // First attempt: Enhanced direct extraction
    console.log('[GPT] Attempting direct extraction...');
    const directTransactions = extractNubankTransactions(extractedText);
    
    if (directTransactions.length > 0) {
      console.log(`[GPT] Direct extraction successful: ${directTransactions.length} transactions`);
      return directTransactions;
    }
    
    // Second attempt: GPT-4 processing with comprehensive prompt
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.log('[GPT] No OpenAI key available, returning direct results');
      return directTransactions;
    }
    
    console.log('[GPT] Attempting GPT-4 processing...');
    
    // Enhanced prompt specifically for Nubank statements
    const comprehensivePrompt = `VOCÊ É UM ESPECIALISTA EM EXTRAIR TRANSAÇÕES DE EXTRATOS NUBANK.

TEXTO COMPLETO DO EXTRATO:
${extractedText.slice(0, 15000)}

INSTRUÇÕES CRÍTICAS:
1. IDENTIFIQUE todas as transações que representam GASTOS/DÉBITOS
2. PROCURE por padrões como:
   - "DD MMM **** NNNN [DESCRIÇÃO] R$ VALOR"
   - "DD MMM IOF de '[DESCRIÇÃO]' R$ VALOR"
   - "DD MMM [DESCRIÇÃO] USD/EUR [VALOR] R$ VALOR"
   - Qualquer linha com data, descrição e valor em R$

3. IGNORE:
   - Pagamentos feitos pelo usuário (saídas de dinheiro DA conta)
   - Transferências enviadas
   - Estornos positivos
   - Créditos recebidos

4. EXTRAIA APENAS transações que são COMPRAS/GASTOS feitos COM O CARTÃO

5. FORMATO DE DATA: Converta para "2025-MM-DD" (use 06 para MAI, 07 para JUN)

6. VALORES: Sempre negativos (ex: -150.00 para gastos de R$ 150,00)

7. CATEGORIAS: Tecnologia, Alimentação, Compras, Transporte, Saúde, Lazer, Financeiro, Serviços, Outros

EXEMPLO DE TRANSAÇÕES ESPERADAS:
- Compras em estabelecimentos
- Pagamentos de serviços
- Assinaturas
- IOF de compras internacionais
- Compras online

RETORNE APENAS O JSON ARRAY com todas as transações encontradas:`;

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
            content: 'Você é um especialista em processamento de extratos bancários Nubank. Extraia APENAS transações de débito/gastos, ignorando pagamentos, transferências e créditos.'
          },
          {
            role: 'user',
            content: comprehensivePrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });
    
    if (!response.ok) {
      console.error('[GPT] OpenAI API error:', response.status, response.statusText);
      return directTransactions;
    }
    
    const result = await response.json();
    let responseText = result.choices[0].message.content.trim();
    
    // Clean JSON response
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?$/g, '')
      .replace(/```/g, '')
      .replace(/^[^[{]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    
    console.log('[GPT] GPT-4 response preview:', responseText.slice(0, 500));
    
    let gptTransactions: any[];
    try {
      gptTransactions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
      console.error('[GPT] Failed to parse:', responseText);
      return directTransactions;
    }
    
    if (!Array.isArray(gptTransactions)) {
      console.error('[GPT] Response is not an array');
      return directTransactions;
    }
    
    // Validate transactions
    const validTransactions = gptTransactions.filter(validateTransaction);
    
    console.log(`[GPT] GPT-4 found ${validTransactions.length} valid transactions`);
    
    // Return the result with more transactions
    const finalResult = validTransactions.length > directTransactions.length ? validTransactions : directTransactions;
    
    console.log(`[GPT] Final result: ${finalResult.length} transactions`);
    if (finalResult.length > 0) {
      console.log('[GPT] Sample transactions:', finalResult.slice(0, 3));
    }
    
    return finalResult;
    
  } catch (error) {
    console.error('[GPT] Error in comprehensive processing:', error);
    return [];
  }
};
