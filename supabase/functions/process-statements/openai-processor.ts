
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
  // Convert dates like "12 Jun", "12 Jun 2024" to YYYY-MM-DD
  const months = {
    'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06',
    'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12'
  };
  
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 2) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1] as keyof typeof months] || '01';
    const year = parts[2] || '2025'; // Default to current year if not specified
    return `${year}-${month}-${day}`;
  }
  
  return '2025-01-01'; // Fallback date
};

const extractDirectTransactions = (text: string): Transaction[] => {
  console.log('[DIRECT] Starting direct transaction extraction...');
  
  const transactions: Transaction[] = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and obvious headers/footers
    if (!line || line.length < 10) continue;
    
    // Look for money patterns with R$
    const moneyPattern = /R\$\s*([\d.,]+)/g;
    const moneyMatch = moneyPattern.exec(line);
    
    if (moneyMatch) {
      // Check if this is a debit transaction (exclude credits/payments received)
      const isCredit = /IOF|Pagamento recebido|Crédito|USD refund|Payment received|Credit/i.test(line);
      
      if (!isCredit) {
        // Look for date pattern in the line or nearby lines
        const datePattern = /(\d{1,2})\s+(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)(\s+\d{4})?/i;
        
        let dateMatch = datePattern.exec(line);
        let dateLine = line;
        
        // If no date in current line, check previous/next lines
        if (!dateMatch && i > 0) {
          dateMatch = datePattern.exec(lines[i - 1]);
          if (dateMatch) dateLine = lines[i - 1];
        }
        if (!dateMatch && i < lines.length - 1) {
          dateMatch = datePattern.exec(lines[i + 1]);
          if (dateMatch) dateLine = lines[i + 1];
        }
        
        if (dateMatch) {
          const dateStr = parseNubankDate(dateMatch[0]);
          
          // Extract description (text between date and amount)
          let description = line
            .replace(datePattern, '')
            .replace(/R\$\s*[\d.,]+/g, '')
            .trim();
          
          // Clean up description
          description = description
            .replace(/\s+/g, ' ')
            .replace(/^[-\s]+|[-\s]+$/g, '')
            .trim();
          
          if (description.length === 0) {
            description = 'Transação';
          }
          
          // Parse amount as negative (debit)
          const amountStr = moneyMatch[1].replace(/\./g, '').replace(',', '.');
          const amount = -parseFloat(amountStr);
          
          if (!isNaN(amount) && amount < 0) {
            // Determine category based on description
            let category = 'Outros';
            const desc = description.toLowerCase();
            
            if (desc.includes('uber') || desc.includes('99') || desc.includes('taxi')) {
              category = 'Transporte';
            } else if (desc.includes('ifood') || desc.includes('restaurante') || desc.includes('padaria') || desc.includes('supermercado')) {
              category = 'Alimentação';
            } else if (desc.includes('farmacia') || desc.includes('hospital') || desc.includes('clinica')) {
              category = 'Saúde';
            } else if (desc.includes('shopping') || desc.includes('loja') || desc.includes('magazine')) {
              category = 'Compras';
            } else if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('cinema')) {
              category = 'Lazer';
            } else if (desc.includes('parcela') || desc.includes('financiamento')) {
              category = 'Financeiro';
            }
            
            // Check for installments
            const installmentMatch = /parcela\s+(\d+)\/(\d+)/i.exec(description);
            
            const transaction: Transaction = {
              date: dateStr,
              description,
              amount,
              category
            };
            
            if (installmentMatch) {
              transaction.installment_number = parseInt(installmentMatch[1]);
              transaction.installment_total = parseInt(installmentMatch[2]);
            }
            
            transactions.push(transaction);
            console.log(`[DIRECT] Found transaction: ${description} - R$ ${Math.abs(amount).toFixed(2)}`);
          }
        }
      }
    }
  }
  
  console.log(`[DIRECT] Extracted ${transactions.length} transactions directly`);
  return transactions;
};

export const processTextWithOpenAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[GPT] Starting transaction processing...');
    console.log(`[GPT] Processing text of ${extractedText.length} characters`);
    console.log(`[GPT] Sample text:`, extractedText.slice(0, 500));
    
    // First try direct extraction
    const directTransactions = extractDirectTransactions(extractedText);
    
    if (directTransactions.length > 0) {
      console.log(`[GPT] Direct extraction successful: ${directTransactions.length} transactions`);
      return directTransactions;
    }
    
    // If direct extraction fails, try OpenAI
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.log('[GPT] No OpenAI key, returning direct results');
      return directTransactions;
    }
    
    console.log('[GPT] Trying OpenAI extraction...');
    
    const prompt = `Analise este extrato bancário do NUBANK e extraia APENAS as transações de DÉBITO (saídas/gastos).

TEXTO DO EXTRATO:
${extractedText}

REGRAS IMPORTANTES:
1. IGNORE completamente: IOF, "Pagamento recebido", "Crédito", "USD refund", transferências recebidas
2. EXTRAIA apenas: compras, pagamentos feitos, saques, transferências enviadas, parcelas
3. Para cada transação de débito encontrada:
   - Data no formato YYYY-MM-DD
   - Descrição clara
   - Valor SEMPRE NEGATIVO (ex: -150.50)
   - Categoria apropriada

CATEGORIAS VÁLIDAS: "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Compras", "Outros"

FORMATO DE RESPOSTA (JSON):
[
  {
    "date": "2025-06-12",
    "description": "Descrição da transação",
    "amount": -150.50,
    "category": "Categoria"
  }
]

Retorne APENAS o JSON array. Se não encontrar transações de débito, retorne [].`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de extratos bancários. Extraia apenas transações de débito reais. Retorne sempre um JSON array válido.'
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
    
    console.log('[GPT] OpenAI response:', responseText);
    
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
    
    console.log(`[GPT] OpenAI found ${validTransactions.length} valid transactions`);
    
    // Return the better result
    return validTransactions.length > directTransactions.length ? validTransactions : directTransactions;
    
  } catch (error) {
    console.error('[GPT] Error in processing:', error);
    return [];
  }
};
