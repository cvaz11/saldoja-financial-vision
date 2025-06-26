
export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  installment_number?: number;
  installment_total?: number;
}

const validateTransaction = (transaction: any): transaction is Transaction => {
  return (
    transaction &&
    typeof transaction.date === 'string' &&
    typeof transaction.description === 'string' &&
    transaction.description.trim().length > 0 &&
    typeof transaction.amount === 'number' &&
    !isNaN(transaction.amount) &&
    transaction.amount < 0 && // Only negative amounts (debits)
    typeof transaction.category === 'string' &&
    transaction.category.trim().length > 0
  );
};

export const processWithHybridApproach = async (fileData: Blob): Promise<Transaction[]> => {
  console.log('[HYBRID] ===== INICIANDO PROCESSAMENTO HÍBRIDO =====');
  
  try {
    // Abordagem 1: Tentar com OpenAI Vision (mais confiável)
    const openAIResult = await tryOpenAIVision(fileData);
    if (openAIResult.length > 0) {
      console.log(`[HYBRID] ✅ OpenAI Vision encontrou ${openAIResult.length} transações`);
      return openAIResult;
    }
    
    // Abordagem 2: Parser nativo melhorado
    console.log('[HYBRID] Tentando parser nativo...');
    const nativeResult = await tryNativeParser(fileData);
    if (nativeResult.length > 0) {
      console.log(`[HYBRID] ✅ Parser nativo encontrou ${nativeResult.length} transações`);
      return nativeResult;
    }
    
    // Abordagem 3: Regex patterns diretos nos bytes
    console.log('[HYBRID] Tentando análise direta de bytes...');
    const bytesResult = await tryBytesAnalysis(fileData);
    if (bytesResult.length > 0) {
      console.log(`[HYBRID] ✅ Análise de bytes encontrou ${bytesResult.length} transações`);
      return bytesResult;
    }
    
    console.log('[HYBRID] ❌ Todas as abordagens falharam');
    return [];
    
  } catch (error) {
    console.error('[HYBRID] Erro geral:', error);
    return [];
  }
};

async function tryOpenAIVision(fileData: Blob): Promise<Transaction[]> {
  try {
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.log('[HYBRID] OpenAI key não disponível');
      return [];
    }
    
    // Converter PDF para base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log('[HYBRID] Enviando PDF para OpenAI Vision...');
    
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
            content: `Você é um especialista em análise de extratos Nubank. Analise este PDF e extraia APENAS as transações de DÉBITO (gastos). 

RETORNE APENAS um array JSON com as transações encontradas no formato:
[{"date": "2025-06-12", "description": "UBER EATS", "amount": -45.50, "category": "Alimentação"}]

REGRAS IMPORTANTES:
- Valores sempre negativos (débitos)
- Ignore pagamentos, créditos, cashback
- Data no formato YYYY-MM-DD
- Categorias: Alimentação, Transporte, Tecnologia, Saúde, Compras, Lazer, Financeiro, Serviços, Outros`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise este extrato Nubank e extraia apenas as transações de débito:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });
    
    if (!response.ok) {
      console.error('[HYBRID] OpenAI Vision API error:', response.status);
      return [];
    }
    
    const result = await response.json();
    let responseText = result.choices[0].message.content.trim();
    
    // Limpar resposta
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^[{]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    
    if (!responseText || responseText === '[]') {
      return [];
    }
    
    const transactions = JSON.parse(responseText);
    if (!Array.isArray(transactions)) {
      return [];
    }
    
    return transactions.filter(validateTransaction);
    
  } catch (error) {
    console.error('[HYBRID] OpenAI Vision error:', error);
    return [];
  }
}

async function tryNativeParser(fileData: Blob): Promise<Transaction[]> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder('latin1').decode(uint8Array);
    
    // Patterns mais específicos para Nubank
    const patterns = [
      // Padrão principal: DD MMM •••• #### ESTABELECIMENTO R$ valor
      /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+[•*]{4}\s+\d{4}\s+([^R$]{10,50})\s+R\$\s*([\d.,]+)/gi,
      
      // Padrão alternativo: DD/MM ESTABELECIMENTO R$ valor
      /(\d{1,2})\/(\d{1,2})\s+([^R$]{5,40})\s+R\$\s*([\d.,]+)/gi,
      
      // Padrão para transações com IOF
      /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+.*?IOF.*?R\$\s*([\d.,]+)/gi
    ];
    
    const transactions: Transaction[] = [];
    
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        try {
          let day: string, month: string, description: string, amountStr: string;
          
          if (match.length === 5) {
            [, day, month, description, amountStr] = match;
          } else if (match.length === 4) {
            [, day, month, amountStr] = match;
            description = 'IOF Transação Internacional';
          } else {
            continue;
          }
          
          // Limpar descrição
          description = description
            .replace(/[•*]{4}\s*\d{4}\s*/, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 100);
          
          if (description.length < 3) continue;
          
          // Converter valores
          const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
          if (isNaN(amount) || amount === 0) continue;
          
          // Converter mês
          const monthMap: { [key: string]: string } = {
            'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
            'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
            'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
          };
          
          const monthNum = monthMap[month] || '01';
          const currentYear = new Date().getFullYear();
          const date = `${currentYear}-${monthNum}-${day.padStart(2, '0')}`;
          
          // Determinar categoria
          const category = determineCategory(description);
          
          transactions.push({
            date,
            description,
            amount: -Math.abs(amount), // Garantir negativo
            category
          });
          
        } catch (e) {
          continue;
        }
      }
    }
    
    return deduplicateTransactions(transactions);
    
  } catch (error) {
    console.error('[HYBRID] Native parser error:', error);
    return [];
  }
}

async function tryBytesAnalysis(fileData: Blob): Promise<Transaction[]> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Converter para string e buscar padrões monetários
    const text = Array.from(uint8Array)
      .map(byte => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : ' ')
      .join('');
    
    const moneyPattern = /R\$\s*([\d.,]+)/g;
    const datePattern = /(\d{1,2})\s*(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/g;
    
    const amounts = Array.from(text.matchAll(moneyPattern));
    const dates = Array.from(text.matchAll(datePattern));
    
    const transactions: Transaction[] = [];
    
    // Tentar associar datas com valores próximos
    for (let i = 0; i < Math.min(amounts.length, dates.length, 20); i++) {
      try {
        const amountStr = amounts[i][1];
        const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
        
        if (isNaN(amount) || amount === 0) continue;
        
        const day = dates[i][1];
        const month = dates[i][2];
        
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
          'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
          'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
        };
        
        const monthNum = monthMap[month] || '01';
        const currentYear = new Date().getFullYear();
        const date = `${currentYear}-${monthNum}-${day.padStart(2, '0')}`;
        
        transactions.push({
          date,
          description: `Transação ${i + 1}`,
          amount: -Math.abs(amount),
          category: 'Outros'
        });
        
      } catch (e) {
        continue;
      }
    }
    
    return transactions.slice(0, 10); // Limitar para evitar duplicatas
    
  } catch (error) {
    console.error('[HYBRID] Bytes analysis error:', error);
    return [];
  }
}

function determineCategory(description: string): string {
  const desc = description.toUpperCase();
  
  if (desc.includes('UBER') || desc.includes('99') || desc.includes('TAXI')) {
    return 'Transporte';
  }
  if (desc.includes('IFOOD') || desc.includes('RESTAURANTE') || desc.includes('MERCADO')) {
    return 'Alimentação';
  }
  if (desc.includes('NETFLIX') || desc.includes('SPOTIFY') || desc.includes('AMAZON')) {
    return 'Tecnologia';
  }
  if (desc.includes('FARMACIA') || desc.includes('DROGARIA')) {
    return 'Saúde';
  }
  if (desc.includes('SHOPPING') || desc.includes('LOJA')) {
    return 'Compras';
  }
  if (desc.includes('IOF')) {
    return 'Financeiro';
  }
  
  return 'Outros';
}

function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  const unique: Transaction[] = [];
  
  for (const transaction of transactions) {
    const key = `${transaction.date}_${transaction.description}_${transaction.amount}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(transaction);
    }
  }
  
  return unique;
}
