
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
    transaction.amount < 0 && // Sempre negativo para gastos
    typeof transaction.category === 'string' &&
    transaction.category.trim().length > 0
  );
};

export const processWithHybridStrategy = async (fileData: Blob): Promise<Transaction[]> => {
  console.log('[HYBRID] ===== PROCESSAMENTO CARTÃO DE CRÉDITO INICIADO =====');
  
  try {
    // Estratégia 1: Extração de texto otimizada
    const extractedText = await extractOptimizedText(fileData);
    console.log(`[HYBRID] Texto extraído: ${extractedText.length} caracteres`);
    
    if (extractedText.length < 100) {
      console.log('[HYBRID] ⚠️ Texto insuficiente extraído');
      return [];
    }
    
    // Estratégia 2: Regex para cartão de crédito brasileiro
    const regexResults = await tryBrazilianCreditCardPatterns(extractedText);
    if (regexResults.length > 0) {
      console.log(`[HYBRID] ✅ Regex encontrou ${regexResults.length} compras no cartão`);
      return regexResults;
    }
    
    // Estratégia 3: OpenAI como backup
    const openAIResults = await tryOpenAIExtraction(extractedText);
    if (openAIResults.length > 0) {
      console.log(`[HYBRID] ✅ OpenAI encontrou ${openAIResults.length} compras no cartão`);
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
    
    console.log('[HYBRID] Extraindo texto do cartão de crédito...');
    
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
        // Quebras de linha e tabs
        chars.push(' ');
        lastWasSpace = true;
      } else if (byte === 0 && !lastWasSpace) {
        chars.push(' ');
        lastWasSpace = true;
      }
    }
    
    return chars.join('')
      .replace(/\s{3,}/g, ' ')
      .trim();
    
  } catch (error) {
    console.error('[HYBRID] Erro na extração:', error);
    return '';
  }
}

async function tryBrazilianCreditCardPatterns(text: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  
  console.log('[HYBRID] 💳 Analisando padrões de CARTÃO DE CRÉDITO brasileiro...');
  
  // Padrões específicos para cartões brasileiros
  const patterns = [
    // Nubank: DD MMM ESTABELECIMENTO R$ VALOR
    {
      pattern: /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+([A-ZÀ-ÿ\s\d&*•\-\.]{5,60}?)\s+R\$\s*([\d.,]+)/gi,
      name: 'Nubank',
      type: 'compra'
    },
    
    // C6 Bank: DD/MM ESTABELECIMENTO R$ VALOR
    {
      pattern: /(\d{1,2})\/(\d{1,2})\s+([A-ZÀ-ÿ\s\d&*\-\.]{5,60}?)\s+R\$\s*([\d.,]+)/gi,
      name: 'C6',
      type: 'compra'
    },
    
    // Padrão de compras com estabelecimentos conhecidos
    {
      pattern: /(UBER|IFOOD|NETFLIX|SPOTIFY|AMAZON|MERCADO|POSTO|FARMACIA|SHOPPING|MAGAZINE|RESTAURANTE|LANCHONETE|PADARIA|SUPERMERCADO)([A-ZÀ-ÿ\s\d&*\-\.]*?)\s+R\$\s*([\d.,]+)/gi,
      name: 'Estabelecimentos',
      type: 'compra'
    },
    
    // Padrão genérico: DD/MM + DESCRIÇÃO + R$ VALOR
    {
      pattern: /(\d{1,2})\/(\d{1,2})\s+([^R$\n]{10,50}?)\s+R\$\s*([\d.,]+)/gi,
      name: 'Genérico',
      type: 'compra'
    },
    
    // IOF sobre compras
    {
      pattern: /IOF.*?R\$\s*([\d.,]+)/gi,
      name: 'IOF',
      type: 'taxa'
    },
    
    // Anuidade
    {
      pattern: /ANUIDADE.*?R\$\s*([\d.,]+)/gi,
      name: 'Anuidade',
      type: 'taxa'
    }
  ];
  
  // IGNORAR pagamentos de fatura
  const ignoredPatterns = [
    /PAGAMENTO.*FATURA/i,
    /PIX.*PAGAMENTO/i,
    /TED.*PAGAMENTO/i,
    /TRANSFERENCIA.*RECEBIDA/i,
    /CASHBACK/i,
    /ESTORNO/i,
    /DEVOLUCAO/i
  ];
  
  for (const { pattern, name, type } of patterns) {
    console.log(`[HYBRID] 🔍 Testando padrão ${name} (${type})...`);
    const matches = Array.from(text.matchAll(pattern));
    console.log(`[HYBRID] ${name}: ${matches.length} matches encontrados`);
    
    for (const match of matches) {
      try {
        const matchText = match[0];
        
        // Verificar se é um pagamento de fatura (IGNORAR)
        const isPayment = ignoredPatterns.some(ignorePattern => ignorePattern.test(matchText));
        if (isPayment) {
          console.log(`[HYBRID] ⏭️ Ignorando pagamento: ${matchText.slice(0, 50)}...`);
          continue;
        }
        
        const transaction = parseTransaction(match, name, type);
        if (transaction && validateTransaction(transaction)) {
          // Verificar se valor é razoável (entre R$ 1,00 e R$ 50.000)
          const absAmount = Math.abs(transaction.amount);
          if (absAmount >= 1.00 && absAmount <= 50000) {
            transactions.push(transaction);
            console.log(`[HYBRID] ✅ Compra encontrada: ${transaction.description} - R$ ${absAmount.toFixed(2)}`);
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return deduplicateTransactions(transactions).slice(0, 100);
}

function parseTransaction(match: RegExpMatchArray, patternType: string, transactionType: string): Transaction | null {
  try {
    let day = '15', month = '06', description = '', amountStr = '';
    
    if (patternType === 'Nubank') {
      [, day, month, description, amountStr] = match;
      month = convertMonthToNumber(month);
    } else if (patternType === 'C6' || patternType === 'Genérico') {
      [, day, month, description, amountStr] = match;
      month = month.padStart(2, '0');
    } else if (patternType === 'Estabelecimentos') {
      [, description, , amountStr] = match;
      description = match[0].replace(/R\$\s*[\d.,]+/, '').trim();
    } else if (patternType === 'IOF') {
      [, amountStr] = match;
      description = 'IOF - Taxa sobre compras internacionais';
    } else if (patternType === 'Anuidade') {
      [, amountStr] = match;
      description = 'Anuidade do cartão';
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
    
    // Converter valor - SEMPRE NEGATIVO (é um gasto)
    const amount = -Math.abs(parseFloat(amountStr.replace(/\./g, '').replace(',', '.')));
    if (isNaN(amount) || amount >= 0) {
      return null;
    }
    
    return {
      date: `2025-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      description,
      amount, // Sempre negativo = gasto
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
    
    const prompt = `Analise este extrato de CARTÃO DE CRÉDITO brasileiro e extraia APENAS as COMPRAS/GASTOS realizados.

IMPORTANTE: No cartão de crédito, "crédito" significa GASTO/COMPRA, não receita!

TEXTO DO EXTRATO:
${text.slice(0, 12000)}

INSTRUÇÕES:
1. Extraia apenas GASTOS/COMPRAS (débitos no cartão)
2. IGNORE completamente:
   - Pagamentos da fatura
   - Transferências recebidas
   - Cashback/estornos
   - Saldo anterior
   - Limite disponível

3. Para cada COMPRA encontrada, extraia:
   - Data no formato YYYY-MM-DD
   - Descrição do estabelecimento
   - Valor sempre NEGATIVO (ex: -150.00 para uma compra de R$ 150,00)
   - Categoria adequada

4. CATEGORIAS PERMITIDAS:
   - "Alimentação", "Transporte", "Tecnologia", "Saúde", "Compras", "Lazer", "Financeiro", "Serviços", "Outros"

Se não encontrar compras, retorne array vazio [].

Retorne APENAS o JSON:
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
    'Transporte': ['UBER', '99', 'TAXI', 'POSTO', 'COMBUSTIVEL', 'GASOLINA', 'SHELL', 'PETROBRAS', 'IPIRANGA', 'BR'],
    'Alimentação': ['IFOOD', 'RESTAURANTE', 'MERCADO', 'PADARIA', 'LANCHONETE', 'CAFE', 'BAR', 'BURGUER', 'PIZZA', 'SUPERMERCADO', 'EXTRA', 'PÃO DE AÇÚCAR'],
    'Tecnologia': ['NETFLIX', 'SPOTIFY', 'AMAZON', 'GOOGLE', 'APPLE', 'MICROSOFT', 'STEAM', 'PRIME'],
    'Saúde': ['FARMACIA', 'DROGARIA', 'HOSPITAL', 'CLINICA', 'MEDICO', 'DROGA'],
    'Compras': ['SHOPPING', 'LOJA', 'MAGAZINE', 'AMERICANAS', 'CASAS BAHIA', 'MERCADO LIVRE'],
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
