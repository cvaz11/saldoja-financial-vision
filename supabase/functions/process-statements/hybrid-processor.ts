
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
    // Estratégia 1: Extração avançada de texto
    const extractedText = await extractAdvancedText(fileData);
    console.log(`[HYBRID] Texto extraído: ${extractedText.length} caracteres`);
    
    if (extractedText.length < 100) {
      console.log('[HYBRID] ⚠️ Texto insuficiente extraído');
      return [];
    }
    
    // Estratégia 2: Padrões regex específicos do Nubank
    const regexResults = await tryNubankRegexPatterns(extractedText);
    if (regexResults.length > 0) {
      console.log(`[HYBRID] ✅ Regex encontrou ${regexResults.length} transações`);
      return regexResults;
    }
    
    // Estratégia 3: Análise de linha por linha
    const lineResults = await tryLineByLineAnalysis(extractedText);
    if (lineResults.length > 0) {
      console.log(`[HYBRID] ✅ Análise por linha encontrou ${lineResults.length} transações`);
      return lineResults;
    }
    
    // Estratégia 4: Tentativa com GPT (se disponível)
    const gptResults = await tryGPTFallback(extractedText);
    if (gptResults.length > 0) {
      console.log(`[HYBRID] ✅ GPT encontrou ${gptResults.length} transações`);
      return gptResults;
    }
    
    console.log('[HYBRID] ❌ Nenhuma estratégia funcionou');
    return [];
    
  } catch (error) {
    console.error('[HYBRID] Erro:', error);
    return [];
  }
};

async function extractAdvancedText(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('[HYBRID] Extraindo texto avançado...');
    
    // Extrair todos os caracteres legíveis
    let text = '';
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      
      // Caracteres ASCII imprimíveis + acentos portugueses
      if ((byte >= 32 && byte <= 126) || 
          (byte >= 128 && byte <= 255) || 
          byte === 10 || byte === 13) {
        text += String.fromCharCode(byte);
      } else if (byte === 0) {
        text += ' '; // Substituir null por espaço
      }
    }
    
    // Limpar e normalizar
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00C0-\u00FF\s]/g, '')
      .trim();
    
  } catch (error) {
    console.error('[HYBRID] Erro na extração:', error);
    return '';
  }
}

async function tryNubankRegexPatterns(text: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  
  // Padrões específicos do Nubank
  const patterns = [
    // Padrão: DD MMM ESTABELECIMENTO R$ VALOR
    /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+([A-ZÀ-ÿ\s\d&*•-]{10,60}?)\s+R\$\s*([\d.,]+)/gi,
    
    // Padrão: ESTABELECIMENTO + valor na linha seguinte
    /(UBER|IFOOD|NETFLIX|SPOTIFY|AMAZON|MERCADO|POSTO|FARMACIA|DROGARIA|SHOPPING|MAGAZINE|CINEMA|RESTAURANTE|LANCHONETE|PADARIA|BAR|CAFE)([A-ZÀ-ÿ\s\d&*-]*?)[\s\n]*R\$\s*([\d.,]+)/gi,
    
    // Padrão com parcela: ESTABELECIMENTO PARCELA X/Y R$ VALOR
    /([A-ZÀ-ÿ\s\d&*]{10,50}?)\s*PARCELA\s*(\d+)\/(\d+)\s*R\$\s*([\d.,]+)/gi,
    
    // IOF específico
    /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ).*?IOF.*?R\$\s*([\d.,]+)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    
    for (const match of matches) {
      try {
        let transaction: Partial<Transaction> = {};
        
        if (match.length >= 4) {
          if (match[1] && match[2] && match[3] && match[4]) {
            // Padrão com data
            const day = match[1].padStart(2, '0');
            const monthName = match[2];
            const description = match[3].trim();
            const amountStr = match[4];
            
            const monthMap: { [key: string]: string } = {
              'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
              'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
              'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
            };
            
            transaction.date = `2025-${monthMap[monthName] || '06'}-${day}`;
            transaction.description = description.replace(/[•*]{2,}/g, '').trim();
            transaction.amount = -parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
            
            // Verificar se é parcela
            const parcelaMatch = description.match(/PARCELA\s*(\d+)\/(\d+)/i);
            if (parcelaMatch) {
              transaction.installment_number = parseInt(parcelaMatch[1]);
              transaction.installment_total = parseInt(parcelaMatch[2]);
            }
          } else if (match[1] && match[3]) {
            // Padrão sem data específica
            transaction.date = '2025-06-15';
            transaction.description = (match[1] + ' ' + (match[2] || '')).trim();
            transaction.amount = -parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
          }
          
          transaction.category = determineCategory(transaction.description || '');
          
          if (validateTransaction(transaction)) {
            transactions.push(transaction as Transaction);
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return deduplicateTransactions(transactions);
}

async function tryLineByLineAnalysis(text: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Procurar por linhas que contêm R$ e estabelecimentos conhecidos
    if (line.includes('R$') && line.length > 20) {
      // Tentar extrair valor
      const valueMatch = line.match(/R\$\s*([\d.,]+)/);
      if (valueMatch) {
        const amount = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
        
        if (amount > 0 && amount < 10000) {
          // Tentar extrair descrição
          let description = line
            .replace(/R\$\s*[\d.,]+/g, '')
            .replace(/\d{1,2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/g, '')
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
  
  return deduplicateTransactions(transactions.slice(0, 50)); // Limitar a 50
}

async function tryGPTFallback(text: string): Promise<Transaction[]> {
  try {
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) return [];
    
    const prompt = `Analise este extrato Nubank e extraia APENAS transações de DÉBITO.

TEXTO:
${text.slice(0, 15000)}

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
    return Array.isArray(transactions) ? transactions.filter(validateTransaction) : [];
    
  } catch (error) {
    console.error('[HYBRID] GPT fallback error:', error);
    return [];
  }
}

function determineCategory(description: string): string {
  const desc = description.toUpperCase();
  
  if (desc.includes('UBER') || desc.includes('99') || desc.includes('TAXI') || desc.includes('POSTO')) {
    return 'Transporte';
  }
  if (desc.includes('IFOOD') || desc.includes('RESTAURANTE') || desc.includes('MERCADO') || desc.includes('PADARIA')) {
    return 'Alimentação';
  }
  if (desc.includes('NETFLIX') || desc.includes('SPOTIFY') || desc.includes('AMAZON') || desc.includes('GOOGLE')) {
    return 'Tecnologia';
  }
  if (desc.includes('FARMACIA') || desc.includes('DROGARIA') || desc.includes('HOSPITAL')) {
    return 'Saúde';
  }
  if (desc.includes('SHOPPING') || desc.includes('LOJA') || desc.includes('MAGAZINE')) {
    return 'Compras';
  }
  if (desc.includes('IOF') || desc.includes('TAXA') || desc.includes('JUROS')) {
    return 'Financeiro';
  }
  if (desc.includes('CINEMA') || desc.includes('TEATRO') || desc.includes('SHOW')) {
    return 'Lazer';
  }
  if (desc.includes('SALAO') || desc.includes('BARBEIRO') || desc.includes('MANUTENCAO')) {
    return 'Serviços';
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
