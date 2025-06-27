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
    transaction.amount !== 0 &&
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
    
    // Debug: mostrar uma amostra do texto extraído
    console.log(`[HYBRID] 🔍 Amostra do texto extraído (primeiros 500 chars):`);
    console.log(extractedText.slice(0, 500));
    console.log(`[HYBRID] 🔍 Amostra do texto extraído (caracteres 1000-1500):`);
    console.log(extractedText.slice(1000, 1500));
    
    // Estratégia 2: Regex para cartão de crédito brasileiro - MELHORADOS
    const regexResults = await tryBrazilianCreditCardPatterns(extractedText);
    if (regexResults.length > 0) {
      console.log(`[HYBRID] ✅ Regex encontrou ${regexResults.length} gastos no cartão`);
      return regexResults;
    }
    
    // Estratégia 3: OpenAI como backup
    const openAIResults = await tryOpenAIExtraction(extractedText);
    if (openAIResults.length > 0) {
      console.log(`[HYBRID] ✅ OpenAI encontrou ${openAIResults.length} gastos no cartão`);
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
    
    for (let i = 0; i < Math.min(uint8Array.length, 2000000); i++) { // Aumentei o limite
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
  
  // Padrões específicos para C6 Bank baseados na imagem fornecida
  const patterns = [
    // C6 Bank - Padrão específico da imagem: DATA ESTABELECIMENTO VALOR
    {
      pattern: /(\d{1,2}\/\d{1,2})\s+([A-ZÀ-ÿ\s\d&*\-\.\,\'\"]{8,80}?)\s+([\d\.,]+)(?:\s|$)/gi,
      name: 'C6 Formato Principal',
      type: 'compra'
    },
    
    // C6 Bank - Padrão com mês abreviado: DD MMM ESTABELECIMENTO VALOR
    {
      pattern: /(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+([A-ZÀ-ÿ\s\d&*\-\.\,\'\"]{8,80}?)\s+([\d\.,]+)/gi,
      name: 'C6 Com Mês',
      type: 'compra'
    },
    
    // Nubank padrão
    {
      pattern: /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+([A-ZÀ-ÿ\s\d&*\-\.\,\'\"]{5,60}?)\s+R\$\s*([\d\.,]+)/gi,
      name: 'Nubank',
      type: 'compra'
    },
    
    // Padrão genérico para valores monetários com estabelecimentos
    {
      pattern: /([A-ZÀ-ÿ\s\d&*\-\.\,\'\"]{10,60}?)\s+([\d\.,]{3,10})(?:\s|$)/gi,
      name: 'Genérico Estabelecimento-Valor',
      type: 'compra'
    },
    
    // Valores isolados que podem ser transações
    {
      pattern: /([\d]{1,3}(?:\.\d{3})*,\d{2})/g,
      name: 'Valores Monetários',
      type: 'compra'
    }
  ];
  
  // IGNORAR estes padrões
  const ignoredPatterns = [
    /PAGAMENTO.*FATURA/i,
    /PIX.*PAGAMENTO/i,
    /TED.*PAGAMENTO/i,
    /TRANSFERENCIA.*RECEBIDA/i,
    /CASHBACK/i,
    /ESTORNO/i,
    /DEVOLUCAO/i,
    /SALDO.*ANTERIOR/i,
    /LIMITE.*DISPONIVEL/i,
    /TOTAL.*FATURA/i,
    /VENCIMENTO/i,
    /FECHAMENTO/i
  ];
  
  for (const { pattern, name, type } of patterns) {
    console.log(`[HYBRID] 🔍 Testando padrão ${name}...`);
    const matches = Array.from(text.matchAll(pattern));
    console.log(`[HYBRID] ${name}: ${matches.length} matches encontrados`);
    
    // Debug: mostrar alguns matches
    if (matches.length > 0) {
      console.log(`[HYBRID] 📋 Primeiros matches do padrão ${name}:`);
      matches.slice(0, 3).forEach((match, i) => {
        console.log(`[HYBRID]   ${i + 1}. "${match[0]}"`);
      });
    }
    
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
          // Para cartão de crédito, TODOS os gastos devem ser negativos
          const absAmount = Math.abs(transaction.amount);
          if (absAmount >= 0.50 && absAmount <= 50000) { // Valores entre 50 centavos e 50 mil
            // Garantir que seja negativo (gasto)
            transaction.amount = -absAmount;
            transactions.push(transaction);
            console.log(`[HYBRID] ✅ Gasto encontrado: ${transaction.description} - R$ ${absAmount.toFixed(2)}`);
          }
        }
      } catch (e) {
        console.log(`[HYBRID] ⚠️ Erro ao processar match: ${e.message}`);
        continue;
      }
    }
  }
  
  console.log(`[HYBRID] 📊 Total de transações encontradas antes da deduplic.: ${transactions.length}`);
  const deduplicated = deduplicateTransactions(transactions).slice(0, 100);
  console.log(`[HYBRID] 📊 Total após deduplicação: ${deduplicated.length}`);
  
  return deduplicated;
}

function parseTransaction(match: RegExpMatchArray, patternType: string, transactionType: string): Transaction | null {
  try {
    let day = '15', month = '06', description = '', amountStr = '';
    
    console.log(`[HYBRID] 🔧 Parseando match do tipo ${patternType}: "${match[0]}"`);
    
    if (patternType === 'C6 Formato Principal') {
      // Formato: DD/MM ESTABELECIMENTO VALOR
      if (match.length >= 4) {
        const dateStr = match[1]; // DD/MM
        description = match[2];
        amountStr = match[3];
        
        const dateParts = dateStr.split('/');
        if (dateParts.length === 2) {
          day = dateParts[0];
          month = dateParts[1];
        }
      }
    } else if (patternType === 'C6 Com Mês') {
      [, day, month, description, amountStr] = match;
      month = convertMonthToNumber(month);
    } else if (patternType === 'Nubank') {
      [, day, month, description, amountStr] = match;
      month = convertMonthToNumber(month);
    } else if (patternType === 'Genérico Estabelecimento-Valor') {
      [, description, amountStr] = match;
    } else if (patternType === 'Valores Monetários') {
      [, amountStr] = match;
      description = 'Transação identificada por valor';
    }
    
    // Limpar descrição
    description = description
      .replace(/[•*\|]{2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\W+|\W+$/g, '')
      .trim()
      .slice(0, 80);
    
    if (!description || description.length < 3) {
      // Se não temos descrição boa, tentar extrair do contexto
      description = `Compra cartão ${day}/${month}`;
    }
    
    // Converter valor - aceitar formato brasileiro
    const cleanAmount = amountStr.replace(/\./g, '').replace(',', '.');
    const positiveAmount = parseFloat(cleanAmount);
    
    console.log(`[HYBRID] 🔧 Valor parseado: "${amountStr}" -> ${positiveAmount}`);
    
    if (isNaN(positiveAmount) || positiveAmount <= 0) {
      console.log(`[HYBRID] ⚠️ Valor inválido: ${positiveAmount}`);
      return null;
    }
    
    const transaction = {
      date: `2025-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      description,
      amount: positiveAmount, // Será convertido para negativo depois da validação
      category: determineCategory(description)
    };
    
    console.log(`[HYBRID] 🔧 Transação criada:`, transaction);
    return transaction;
    
  } catch (error) {
    console.log(`[HYBRID] ❌ Erro no parse: ${error.message}`);
    return null;
  }
}

async function tryOpenAIExtraction(text: string): Promise<Transaction[]> {
  try {
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) return [];
    
    console.log('[HYBRID] 🤖 Tentando extração com OpenAI...');
    
    const prompt = `Analise este extrato de cartão de crédito brasileiro e extraia APENAS os GASTOS realizados.

IMPORTANTE: 
- Este é um extrato de CARTÃO DE CRÉDITO (não conta corrente)
- TODOS os gastos no cartão devem ser convertidos para valores NEGATIVOS
- Ignore completamente pagamentos de fatura, transferências e cashback

TEXTO DO EXTRATO:
${text.slice(0, 15000)}

Para cada GASTO encontrado, extraia:
- Data no formato YYYY-MM-DD  
- Descrição do estabelecimento
- Valor sempre NEGATIVO (ex: -150.00 para uma compra de R$ 150,00)
- Categoria adequada

CATEGORIAS: "Alimentação", "Transporte", "Tecnologia", "Saúde", "Compras", "Lazer", "Financeiro", "Serviços", "Outros"

IGNORE:
- Pagamentos da fatura
- Transferências 
- Cashback/estornos
- Saldos e limites
- Totais

Retorne APENAS o JSON:
[{"date": "2025-06-15", "description": "ESTABELECIMENTO", "amount": -100.00, "category": "Compras"}]`;

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
    
    if (!response.ok) {
      console.log('[HYBRID] OpenAI response não OK:', response.status);
      return [];
    }
    
    const result = await response.json();
    const responseText = result.choices[0].message.content.trim();
    
    console.log('[HYBRID] 🤖 Resposta do OpenAI:', responseText.slice(0, 500));
    
    if (!responseText || responseText === '[]') return [];
    
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const transactions = JSON.parse(cleanedResponse);
    const validTransactions = Array.isArray(transactions) ? 
      transactions.filter(validateTransaction).slice(0, 50) : [];
    
    console.log(`[HYBRID] 🤖 OpenAI encontrou ${validTransactions.length} transações válidas`);
    return validTransactions;
    
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
    const key = `${transaction.date}_${transaction.description}_${Math.abs(transaction.amount)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(transaction);
    }
  }
  
  return unique;
}
