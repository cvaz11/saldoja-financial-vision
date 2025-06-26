
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

const extractNubankTransactionsAdvanced = (text: string): Transaction[] => {
  console.log('[NUBANK-ADV] ===== ADVANCED NUBANK EXTRACTION =====');
  console.log('[NUBANK-ADV] Text length:', text.length);
  
  const transactions: Transaction[] = [];
  
  // More comprehensive regex patterns for Nubank transactions
  const patterns = [
    // Pattern 1: Date + Card + Description + Amount
    /(\d{1,2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\s+.*?\*{3,4}\s*\d{4}\s+([^R$]{5,80}?)\s+R\$\s*([\d.,]+)/gi,
    
    // Pattern 2: IOF transactions
    /(\d{1,2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\s+IOF.*?["']([^"']+)["'].*?R\$\s*([\d.,]+)/gi,
    
    // Pattern 3: Simple date + description + amount
    /(\d{1,2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\s+([A-Za-z][^R$]{8,60}?)\s+R\$\s*([\d.,]+)/gi,
    
    // Pattern 4: International transactions with currency conversion
    /(\d{1,2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\s+.*?([A-Za-z][^R$]{5,50}?)(?:USD|EUR|GBP)\s*[\d.,]+.*?R\$\s*([\d.,]+)/gi,
    
    // Pattern 5: Any line with date pattern and amount
    /(\d{1,2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)).*?([A-Za-z][^R$0-9]{5,}?).*?R\$\s*([\d.,]+)/gi
  ];
  
  // Split text into lines and also try to process as one big string
  const textVariants = [
    text,
    ...text.split(/[\r\n]+/).filter(line => line.trim().length > 10)
  ];
  
  for (const textVariant of textVariants) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0; // Reset regex
      let match;
      
      while ((match = pattern.exec(textVariant)) !== null) {
        console.log(`[NUBANK-ADV] Found match: ${match[0]}`);
        
        const dateStr = match[1];
        let description = (match[2] || match[3] || '').trim();
        const amountStr = match[3] || match[4] || match[match.length - 1];
        
        // Clean description
        description = description
          .replace(/\*{3,4}\s*\d{4}/g, '') // Remove card numbers
          .replace(/Conversão:.*$/i, '')
          .replace(/USD\s*[\d.,]+/g, '')
          .replace(/EUR\s*[\d.,]+/g, '')
          .replace(/IOF\s+de\s*/i, 'IOF - ')
          .replace(/^["']|["']$/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (description.length < 3) {
          description = 'Compra não identificada';
        }
        
        // Parse amount
        const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
          console.log(`[NUBANK-ADV] Invalid amount: ${amountStr}`);
          continue;
        }
        
        // Convert date
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
          'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
          'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
        };
        
        const dateParts = dateStr.trim().split(/\s+/);
        const day = dateParts[0].padStart(2, '0');
        const month = monthMap[dateParts[1]] || '06';
        const transactionDate = `2025-${month}-${day}`;
        
        // Categorize
        let category = 'Outros';
        const desc = description.toLowerCase();
        
        if (desc.includes('iof') || desc.includes('taxa')) category = 'Financeiro';
        else if (desc.includes('uber') || desc.includes('99') || desc.includes('taxi')) category = 'Transporte';
        else if (desc.includes('mercado') || desc.includes('supermercado') || desc.includes('food')) category = 'Alimentação';
        else if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('amazon')) category = 'Tecnologia';
        else if (desc.includes('farmacia') || desc.includes('drogaria')) category = 'Saúde';
        else if (desc.includes('shopping') || desc.includes('loja')) category = 'Compras';
        
        const transaction: Transaction = {
          date: transactionDate,
          description: description.slice(0, 200),
          amount: -amount, // Negative for debits
          category
        };
        
        // Check for duplicates
        const isDuplicate = transactions.some(t => 
          t.date === transaction.date && 
          t.description === transaction.description && 
          Math.abs(t.amount - transaction.amount) < 0.01
        );
        
        if (!isDuplicate) {
          transactions.push(transaction);
          console.log(`[NUBANK-ADV] Added: ${description} - R$ ${amount.toFixed(2)} on ${transactionDate}`);
        }
      }
    }
  }
  
  console.log(`[NUBANK-ADV] Total transactions extracted: ${transactions.length}`);
  return transactions;
};

export const processTextWithOpenAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[GPT] ===== STARTING ADVANCED PROCESSING =====');
    console.log(`[GPT] Processing ${extractedText.length} characters of text`);
    
    // First try: Advanced direct extraction
    console.log('[GPT] Attempting advanced direct extraction...');
    const directTransactions = extractNubankTransactionsAdvanced(extractedText);
    
    if (directTransactions.length > 0) {
      console.log(`[GPT] Direct extraction found ${directTransactions.length} transactions`);
      return directTransactions;
    }
    
    // Second try: Enhanced GPT processing
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.log('[GPT] No OpenAI API key - returning direct results');
      return directTransactions;
    }
    
    console.log('[GPT] Attempting GPT-4 analysis...');
    
    const prompt = `ANÁLISE CRÍTICA DE EXTRATO NUBANK

CONTEXTO: Você é um especialista em processar extratos do Nubank. O texto abaixo foi extraído de um PDF e contém transações que precisam ser identificadas.

TEXTO EXTRAÍDO:
${extractedText.slice(0, 12000)}

INSTRUÇÕES ESPECÍFICAS:
1. PROCURE por padrões como:
   - "DD MMM" seguido de descrição e "R$ VALOR"
   - "IOF de" seguido de descrição
   - Qualquer referência a valores em Reais (R$)
   - Datas em formato brasileiro (ex: "12 JUN")

2. IGNORE:
   - Saldos e totais
   - Pagamentos da fatura
   - Transferências recebidas
   - Cashback

3. EXTRAIA APENAS:
   - Compras com cartão
   - IOF de compras internacionais
   - Assinaturas e serviços

4. FORMATO DE SAÍDA:
   - Data: "2025-MM-DD" (use mês 06 para Jun, 07 para Jul, etc.)
   - Valor: sempre negativo (ex: -50.00)
   - Descrição: clara e limpa
   - Categoria: uma de [Tecnologia, Alimentação, Compras, Transporte, Saúde, Lazer, Financeiro, Serviços, Outros]

IMPORTANTE: Se encontrar qualquer transação, mesmo que seja só uma, retorne ela. Não retorne array vazio se houver qualquer indicação de gastos.

Retorne APENAS o JSON array:`;

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
            content: 'Você é um especialista em extrair transações de extratos Nubank. Seja meticuloso e encontre todas as transações possíveis.'
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
      return directTransactions;
    }
    
    const result = await response.json();
    let responseText = result.choices[0].message.content.trim();
    
    // Clean response
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^[{]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    
    console.log('[GPT] GPT response length:', responseText.length);
    console.log('[GPT] GPT response preview:', responseText.slice(0, 500));
    
    if (!responseText || responseText === '[]') {
      console.log('[GPT] GPT returned empty result');
      return directTransactions;
    }
    
    let gptTransactions: any[];
    try {
      gptTransactions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[GPT] JSON parse error:', parseError);
      console.error('[GPT] Failed response:', responseText);
      return directTransactions;
    }
    
    if (!Array.isArray(gptTransactions)) {
      console.error('[GPT] Response is not an array');
      return directTransactions;
    }
    
    const validTransactions = gptTransactions.filter(validateTransaction);
    console.log(`[GPT] GPT extracted ${validTransactions.length} valid transactions`);
    
    const finalResult = validTransactions.length > directTransactions.length ? validTransactions : directTransactions;
    console.log(`[GPT] Final result: ${finalResult.length} transactions`);
    
    return finalResult;
    
  } catch (error) {
    console.error('[GPT] Error in processing:', error);
    return [];
  }
};
