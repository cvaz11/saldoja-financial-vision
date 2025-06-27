
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
    // Estratégia 1: Extração de texto otimizada
    const extractedText = await extractOptimizedText(fileData);
    console.log(`[HYBRID] Texto extraído: ${extractedText.length} caracteres`);
    
    if (extractedText.length < 100) {
      console.log('[HYBRID] ⚠️ Texto insuficiente extraído');
      return [];
    }
    
    // Estratégia 2: Regex otimizado para bancos brasileiros
    const regexResults = await tryBrazilianBankPatterns(extractedText);
    if (regexResults.length > 0) {
      console.log(`[HYBRID] ✅ Regex brasileiro encontrou ${regexResults.length} transações`);
      return regexResults;
    }
    
    // Estratégia 3: OpenAI como backup
    const openAIResults = await tryOpenAIExtraction(extractedText);
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

async function extractOptimizedText(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('[HYBRID] Extraindo texto otimizado...');
    
    // Extrair caracteres de forma mais inteligente
    const chars: string[] = [];
    let lastWasSpace = false;
    
    for (let i = 0; i < Math.min(uint8Array.length, 1000000); i++) {
      const byte = uint8Array[i];
      
      if (byte >= 32 && byte <= 126) {
        // ASCII printável
        chars.push(String.fromCharCode(byte));
        lastWasSpace = false;
      } else if (byte >= 128 && byte <= 255) {
        // Caracteres latinos
        chars.push(String.fromCharCode(byte));
        lastWasSpace = false;
      } else if ((byte === 10 || byte === 13 || byte === 9) && !lastWasSpace) {
        // Quebras de linha e tabs (evitar espaços duplos)
        chars.push(' ');
        lastWasSpace = true;
      } else if (byte === 0 && !lastWasSpace) {
        chars.push(' ');
        lastWasSpace = true;
      }
    }
    
    return chars.join('')
      .replace(/\s{3,}/g, ' ') // Reduzir múltiplos espaços
      .trim();
    
  } catch (error) {
    console.error('[HYBRID] Erro na extração:', error);
    return '';
  }
}

async function tryBrazilianBankPatterns(text: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  
  // Padrões específicos para bancos brasileiros
  const patterns = [
    // Nubank: DD MMM ESTABELECIMENTO R$ VALOR
    {
      pattern: /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+([A-ZÀ-ÿ\s\d&*•\-\.]{5,60}?)\s+R\$\s*([\d.,]+)/gi,
      name: 'Nubank'
    },
    
    // C6 Bank: DD/MM ESTABELECIMENTO R$ VALOR
    {
      pattern: /(\d{1,2})\/(\d{1,2})\s+([A-ZÀ-ÿ\s\d&*\-\.]{5,60}?)\s+R\$\s*([\d.,]+)/gi,
      name: 'C6'
    },
    
    // Padrão geral: ESTABELECIMENTO R$ VALOR (com validação)
    {
      pattern: /(UBER|IFOOD|NETFLIX|SPOTIFY|AMAZON|MERCADO|POSTO|FARMACIA|SHOPPING|MAGAZINE|RESTAURANTE|LANCHONETE|PADARIA)([A-ZÀ-ÿ\s\d&*\-\.]*?)\s+R\$\s*([\d.,]+)/gi,
      name: 'Estabelecimentos'
    },
    
    // IOF
    {
      pattern: /IOF.*?R\$\s*([\d.,]+)/gi,
      name: 'IOF'
    }
  ];
  
  for (const { pattern, name } of patterns) {
    console.log(`[HYBRID] Testando padrão ${name}...`);
    const matches = Array.from(text.matchAll(pattern));
    console.log(`[HYBRID] ${name}: ${matches.length} matches encontrados`);
    
    for (const match of matches) {
      try {
        const transaction = parseTransaction(match, name);
        if (transaction && validateTransaction(transaction)) {
          // Verificar se valor é razoável (entre R$ 0,10 e R$ 10.000)
          const absAmount = Math.abs(transaction.amount);
          if (absAmount >= 0.10 && absAmount <= 10000) {
            transactions.push(transaction);
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return deduplicateTransactions(transactions).slice(0, 100);
}

function parseTransaction(match: RegExpMatchArray, patternType: string): Transaction | null {
  try {
    let day = '15', month = '06', description = '', amountStr = '';
    
    if (patternType === 'Nubank') {
      [, day, month, description, amountStr] = match;
      month = convertMonthToNumber(month);
    } else if (patternType === 'C6') {
      [, day, month, description, amountStr] = match;
      month = month.padStart(2, '0');
    } else if (patternType === 'Estabelecimentos') {
      [, description, , amountStr] = match;
      description = match[0].replace(/R\$\s*[\d.,]+/, '').trim();
    } else if (patternType === 'IOF') {
      [, amountStr] = match;
      description = 'IOF';
    }
    
    // Limpar descrição
    description = description
      .replace(/[•*]{2,}/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
      .trim()
      .slice(0, 80);
    
    if (!description || description.length < 3) {
      return null;
    }
    
    // Converter valor
    const amount = -Math.abs(parseFloat(amountStr.replace(/\./g, '').replace(',', '.')));
    if (isNaN(amount) || amount >= 0) {
      return null;
    }
    
    return {
      date: `2025-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      description,
      amount,
      category: determineCategory(description)
    };
    
  } catch (error) {
    return null;
  }
}

async function tryOpenAIExtraction(text: string): Promise<Transaction[]> {
  try {
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) return [];
    
    const prompt = `Analise este extrato bancário brasileiro e extraia APENAS transações de DÉBITO (gastos/compras).

TEXTO DO EXTRATO:
${text.slice(0, 12000)}

INSTRUÇÕES:
1. Extraia apenas DÉBITOS (gastos, compras, taxas)
2. IGNORE pagamentos de fatura, transferências recebidas, cashback
3. Para cada transação, extraia: data, descrição do estabelecimento, valor (sempre negativo)
4. Categorize adequadamente cada transação
5. Se não encontrar débitos, retorne array vazio []

Formato de resposta (apenas JSON):
[{"date": "2025-06-15", "description": "UBER EATS", "amount": -35.90, "category": "Alimentação"}]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
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
    return Array.isArray(transactions) ? 
      transactions.filter(validateTransaction).slice(0, 50) : [];
    
  } catch (error) {
    console.error('[HYBRID] OpenAI error:', error);
    return [];
  }
}

function convertMonthToNumber(month: string): string {
  const months: { [key: string]: string } = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
    'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
  };
  return months[month.toUpperCase()] || '06';
}

function determineCategory(description: string): string {
  const desc = description.toUpperCase();
  
  const categories = {
    'Transporte': ['UBER', '99', 'TAXI', 'POSTO', 'COMBUSTIVEL', 'GASOLINA', 'SHELL', 'PETROBRAS'],
    'Alimentação': ['IFOOD', 'RESTAURANTE', 'MERCADO', 'PADARIA', 'LANCHONETE', 'CAFE', 'BAR', 'BURGUER', 'PIZZA'],
    'Tecnologia': ['NETFLIX', 'SPOTIFY', 'AMAZON', 'GOOGLE', 'APPLE', 'MICROSOFT', 'STEAM'],
    'Saúde': ['FARMACIA', 'DROGARIA', 'HOSPITAL', 'CLINICA', 'MEDICO', 'DROGA'],
    'Compras': ['SHOPPING', 'LOJA', 'MAGAZINE', 'AMERICANAS', 'CASAS BAHIA'],
    'Financeiro': ['IOF', 'TAXA', 'JUROS', 'ANUIDADE', 'TARIFA'],
    'Lazer': ['CINEMA', 'TEATRO', 'SHOW', 'PARQUE', 'INGRESSO'],
    'Serviços': ['SALAO', 'BARBEIRO', 'MANUTENCAO', 'TELEFONE', 'INTERNET', 'CORREIOS']
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
