
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
    transaction.amount < 0 &&
    typeof transaction.category === 'string' &&
    transaction.category.trim().length > 0
  );
};

export const processWithHybridStrategy = async (fileData: Blob): Promise<Transaction[]> => {
  console.log('[HYBRID] ===== PROCESSAMENTO HÍBRIDO INICIADO =====');
  
  try {
    // Estratégia 1: Extração simples de texto
    const extractedText = await extractSimpleText(fileData);
    console.log(`[HYBRID] Texto extraído: ${extractedText.length} caracteres`);
    
    if (extractedText.length < 100) {
      console.log('[HYBRID] ⚠️ Texto insuficiente extraído');
      return [];
    }
    
    // Estratégia 2: Padrões regex otimizados
    const regexResults = await tryOptimizedRegexPatterns(extractedText);
    if (regexResults.length > 0) {
      console.log(`[HYBRID] ✅ Regex encontrou ${regexResults.length} transações`);
      return regexResults;
    }
    
    // Estratégia 3: Análise linha por linha
    const lineResults = await tryLineAnalysis(extractedText);
    if (lineResults.length > 0) {
      console.log(`[HYBRID] ✅ Análise por linha encontrou ${lineResults.length} transações`);
      return lineResults;
    }
    
    // Estratégia 4: OpenAI como fallback
    const openAIResults = await tryOpenAI(extractedText);
    if (openAIResults.length > 0) {
      console.log(`[HYBRID] ✅ OpenAI encontrou ${openAIResults.length} transações`);
      return openAIResults;
    }
    
    console.log('[HYBRID] ❌ Nenhuma estratégia funcionou');
    return [];
    
  } catch (error) {
    console.error('[HYBRID] Erro:', error);
    return [];
  }
};

async function extractSimpleText(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('[HYBRID] Extraindo texto simples...');
    
    // Extrair caracteres legíveis de forma segura
    const chars: string[] = [];
    for (let i = 0; i < Math.min(uint8Array.length, 500000); i++) { // Limitar para evitar problemas de memória
      const byte = uint8Array[i];
      
      if ((byte >= 32 && byte <= 126) || 
          (byte >= 128 && byte <= 255) || 
          byte === 10 || byte === 13) {
        chars.push(String.fromCharCode(byte));
      } else if (byte === 0) {
        chars.push(' ');
      }
    }
    
    return chars.join('')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00C0-\u00FF\s]/g, '')
      .trim();
    
  } catch (error) {
    console.error('[HYBRID] Erro na extração:', error);
    return '';
  }
}

async function tryOptimizedRegexPatterns(text: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  
  // Padrões otimizados para bancos brasileiros
  const patterns = [
    // Nubank: DD MMM ESTABELECIMENTO R$ VALOR
    /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+([A-ZÀ-ÿ\s\d&*•-]{8,50}?)\s+R\$\s*([\d.,]+)/gi,
    
    // C6 Bank: Similar ao Nubank
    /(\d{1,2})\/(\d{1,2})\s+([A-ZÀ-ÿ\s\d&*-]{8,50}?)\s+R\$\s*([\d.,]+)/gi,
    
    // Estabelecimentos conhecidos
    /(UBER|IFOOD|NETFLIX|SPOTIFY|AMAZON|MERCADO|POSTO|FARMACIA|SHOPPING|MAGAZINE)([A-ZÀ-ÿ\s\d&*-]*?)\s+R\$\s*([\d.,]+)/gi,
    
    // IOF
    /IOF.*?R\$\s*([\d.,]+)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    
    for (const match of matches) {
      try {
        let transaction: Partial<Transaction> = {};
        
        if (match.length >= 4) {
          // Padrão com data
          if (match[1] && match[2] && match[3] && match[4]) {
            const day = match[1].padStart(2, '0');
            const monthOrDay = match[2];
            const description = match[3].trim();
            const amountStr = match[4];
            
            // Verificar se é mês em texto ou número
            const monthMap: { [key: string]: string } = {
              'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
              'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
              'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
            };
            
            if (monthMap[monthOrDay]) {
              transaction.date = `2025-${monthMap[monthOrDay]}-${day}`;
            } else {
              const month = monthOrDay.padStart(2, '0');
              transaction.date = `2025-${month}-${day}`;
            }
            
            transaction.description = description
              .replace(/[•*]{2,}/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 80);
            
            transaction.amount = -parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
          } else if (match[1] && match[3]) {
            // Padrão sem data específica
            transaction.date = '2025-06-15';
            transaction.description = (match[1] + ' ' + (match[2] || '')).trim().slice(0, 80);
            transaction.amount = -parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
          }
          
          transaction.category = determineCategory(transaction.description || '');
          
          if (validateTransaction(transaction) && Math.abs(transaction.amount) < 50000) {
            transactions.push(transaction as Transaction);
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return deduplicateTransactions(transactions).slice(0, 100); // Limitar a 100 transações
}

async function tryLineAnalysis(text: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const lines = text.split('\n').slice(0, 1000); // Limitar linhas para performance
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.includes('R$') && trimmedLine.length > 20 && trimmedLine.length < 150) {
      const valueMatch = trimmedLine.match(/R\$\s*([\d.,]+)/);
      if (valueMatch) {
        const amount = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
        
        if (amount > 0 && amount < 10000) {
          let description = trimmedLine
            .replace(/R\$\s*[\d.,]+/g, '')
            .replace(/\d{1,2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/g, '')
            .replace(/\d{1,2}\/\d{1,2}/g, '')
            .replace(/[•*]{2,}/g, '')
            .trim();
          
          if (description.length > 5 && description.length < 100) {
            transactions.push({
              date: '2025-06-15',
              description: description.slice(0, 80),
              amount: -amount,
              category: determineCategory(description)
            });
          }
        }
      }
    }
  }
  
  return deduplicateTransactions(transactions).slice(0, 50);
}

async function tryOpenAI(text: string): Promise<Transaction[]> {
  try {
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) return [];
    
    const prompt = `Analise este extrato bancário e extraia APENAS transações de DÉBITO (gastos).

TEXTO:
${text.slice(0, 8000)}

Retorne JSON com transações de débito (valores negativos):
[{"date": "2025-06-12", "description": "UBER EATS", "amount": -45.50, "category": "Alimentação"}]

Se não encontrar, retorne: []`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.1
      }),
    });
    
    if (!response.ok) return [];
    
    const result = await response.json();
    const responseText = result.choices[0].message.content.trim();
    
    if (!responseText || responseText === '[]') return [];
    
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const transactions = JSON.parse(cleanedResponse);
    return Array.isArray(transactions) ? transactions.filter(validateTransaction).slice(0, 50) : [];
    
  } catch (error) {
    console.error('[HYBRID] OpenAI error:', error);
    return [];
  }
}

function determineCategory(description: string): string {
  const desc = description.toUpperCase();
  
  const categories = {
    'Transporte': ['UBER', '99', 'TAXI', 'POSTO', 'COMBUSTIVEL', 'GASOLINA'],
    'Alimentação': ['IFOOD', 'RESTAURANTE', 'MERCADO', 'PADARIA', 'LANCHONETE', 'CAFE', 'BAR'],
    'Tecnologia': ['NETFLIX', 'SPOTIFY', 'AMAZON', 'GOOGLE', 'APPLE', 'MICROSOFT'],
    'Saúde': ['FARMACIA', 'DROGARIA', 'HOSPITAL', 'CLINICA', 'MEDICO'],
    'Compras': ['SHOPPING', 'LOJA', 'MAGAZINE', 'MERCADO'],
    'Financeiro': ['IOF', 'TAXA', 'JUROS', 'ANUIDADE'],
    'Lazer': ['CINEMA', 'TEATRO', 'SHOW', 'PARQUE'],
    'Serviços': ['SALAO', 'BARBEIRO', 'MANUTENCAO', 'TELEFONE', 'INTERNET']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return category;
    }
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
