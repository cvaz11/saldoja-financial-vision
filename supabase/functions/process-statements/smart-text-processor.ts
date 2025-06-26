
interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

export const processWithSmartText = async (pdfBuffer: ArrayBuffer): Promise<Transaction[]> => {
  try {
    console.log(`[SMART] ===== INICIANDO PROCESSAMENTO INTELIGENTE =====`);
    console.log(`[SMART] PDF Buffer size: ${pdfBuffer.byteLength} bytes`);
    
    // Extrair texto do PDF usando pdf-parse
    const pdfText = await extractTextFromPDF(pdfBuffer);
    console.log(`[SMART] Texto extraído do PDF (${pdfText.length} chars)`);
    
    if (!pdfText || pdfText.length < 50) {
      console.log(`[SMART] ❌ Texto muito curto ou vazio`);
      return [];
    }

    // Processar com análise inteligente de padrões
    const transactions = await analyzeNubankText(pdfText);
    
    console.log(`[SMART] ✅ ${transactions.length} transações encontradas`);
    
    if (transactions.length > 0) {
      console.log(`[SMART] Primeiras 3 transações:`);
      transactions.slice(0, 3).forEach((tx, i) => {
        console.log(`[SMART]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${tx.amount.toFixed(2)} (${tx.category})`);
      });
    }
    
    return transactions;
    
  } catch (error) {
    console.error(`[SMART] ❌ Erro no processamento:`, error.message);
    return [];
  }
};

async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Usar pdf-parse para extrair texto
    const pdfParseModule = await import('https://esm.sh/pdf-parse@1.1.1');
    const pdfParse = pdfParseModule.default;
    
    const data = await pdfParse(pdfBuffer);
    console.log(`[SMART] PDF parsed: ${data.numpages} páginas, ${data.text.length} chars`);
    
    return data.text;
    
  } catch (error) {
    console.error(`[SMART] Erro ao extrair texto:`, error.message);
    
    // Fallback: tentar extrair texto básico
    try {
      const text = new TextDecoder().decode(pdfBuffer);
      const cleanText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
      console.log(`[SMART] Fallback text extraction: ${cleanText.length} chars`);
      return cleanText;
    } catch (fallbackError) {
      console.error(`[SMART] Fallback também falhou:`, fallbackError.message);
      return '';
    }
  }
}

async function analyzeNubankText(text: string): Promise<Transaction[]> {
  console.log(`[SMART] Analisando texto Nubank...`);
  
  const transactions: Transaction[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log(`[SMART] Processando ${lines.length} linhas de texto`);
  
  // Padrões específicos do Nubank
  const patterns = {
    // Data no formato DD/MM ou DD MMM
    date: /\b(\d{1,2}\/\d{2}|\d{1,2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\b/gi,
    
    // Valores monetários R$ XX,XX ou -R$ XX,XX
    amount: /R\$\s*[\-]?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g,
    
    // Padrões de débito/saída
    debitKeywords: [
      'compra', 'pagamento', 'saque', 'transferência', 'pix enviado', 'débito',
      'mercado', 'supermercado', 'posto', 'farmácia', 'restaurante', 'loja',
      'shopping', 'combustível', 'gasolina', 'aluguel', 'conta de luz',
      'conta de água', 'internet', 'telefone', 'cartão de crédito'
    ],
    
    // Padrões de crédito (ignorar)
    creditKeywords: [
      'pix recebido', 'transferência recebida', 'depósito', 'crédito',
      'salário', 'rendimento', 'cashback', 'estorno'
    ]
  };

  let currentTransaction: Partial<Transaction> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const prevLine = i > 0 ? lines[i - 1] : '';
    
    // Buscar datas
    const dateMatch = line.match(patterns.date);
    if (dateMatch) {
      // Se já temos uma transação pendente, finalizar ela
      if (currentTransaction && currentTransaction.date && currentTransaction.description && currentTransaction.amount) {
        transactions.push(currentTransaction as Transaction);
      }
      
      // Iniciar nova transação
      currentTransaction = {
        date: normalizeDateString(dateMatch[0]),
        description: '',
        amount: 0,
        category: 'Outros'
      };
      
      // Buscar descrição na mesma linha ou próximas linhas
      let description = line.replace(patterns.date, '').trim();
      
      // Se a descrição está vazia, procurar nas próximas linhas
      if (!description && nextLine) {
        description = nextLine;
      }
      
      if (description) {
        currentTransaction.description = cleanDescription(description);
        currentTransaction.category = categorizeTransaction(description);
      }
    }
    
    // Buscar valores monetários
    const amountMatches = line.match(patterns.amount);
    if (amountMatches && currentTransaction) {
      for (const match of amountMatches) {
        const value = parseMonetaryValue(match);
        if (value > 0) {
          // Verificar se é débito ou crédito baseado no contexto
          const context = (prevLine + ' ' + line + ' ' + nextLine).toLowerCase();
          
          const isCredit = patterns.creditKeywords.some(keyword => 
            context.includes(keyword.toLowerCase())
          );
          
          const isDebit = patterns.debitKeywords.some(keyword => 
            context.includes(keyword.toLowerCase())
          ) || line.includes('-') || context.includes('saída');
          
          // Só incluir se for claramente um débito
          if (isDebit && !isCredit) {
            currentTransaction.amount = value;
            break;
          }
        }
      }
    }
    
    // Se encontramos descrição para transação atual
    if (currentTransaction && !currentTransaction.description && line.length > 3) {
      const cleanLine = line.replace(patterns.amount, '').replace(patterns.date, '').trim();
      if (cleanLine.length > 3) {
        currentTransaction.description = cleanDescription(cleanLine);
        currentTransaction.category = categorizeTransaction(cleanLine);
      }
    }
  }
  
  // Finalizar última transação se existir
  if (currentTransaction && currentTransaction.date && currentTransaction.description && currentTransaction.amount) {
    transactions.push(currentTransaction as Transaction);
  }
  
  // Filtrar e validar transações
  const validTransactions = transactions.filter(tx => 
    tx.date && 
    tx.description && 
    tx.description.length >= 3 && 
    tx.amount > 0
  );
  
  console.log(`[SMART] ${validTransactions.length} transações válidas de débito encontradas`);
  
  return validTransactions;
}

function normalizeDateString(dateStr: string): string {
  const currentYear = new Date().getFullYear();
  
  // Se já está no formato DD/MM, adicionar ano
  if (dateStr.includes('/')) {
    const [day, month] = dateStr.split('/');
    return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Se está no formato DD MMM, converter mês
  const monthMap: Record<string, string> = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
    'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
  };
  
  const parts = dateStr.split(' ');
  if (parts.length === 2) {
    const day = parts[0].padStart(2, '0');
    const month = monthMap[parts[1].toUpperCase()];
    if (month) {
      return `${currentYear}-${month}-${day}`;
    }
  }
  
  // Fallback: usar data atual
  return new Date().toISOString().split('T')[0];
}

function parseMonetaryValue(valueStr: string): number {
  // Remove R$, espaços e converte para número
  const cleaned = valueStr.replace(/R\$\s*[\-]?/, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

function cleanDescription(description: string): string {
  return description
    .replace(/R\$\s*[\-]?\d+[,.]?\d*/g, '') // Remove valores
    .replace(/\d{1,2}\/\d{2}/g, '') // Remove datas
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim()
    .slice(0, 255); // Limita tamanho
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('supermercado') || desc.includes('market') || desc.includes('mercado') || desc.includes('alimentação')) {
    return 'Alimentação';
  }
  if (desc.includes('posto') || desc.includes('combustível') || desc.includes('gasolina') || desc.includes('uber') || desc.includes('99')) {
    return 'Transporte';
  }
  if (desc.includes('farmácia') || desc.includes('hospital') || desc.includes('médico') || desc.includes('saúde')) {
    return 'Saúde';
  }
  if (desc.includes('aluguel') || desc.includes('luz') || desc.includes('água') || desc.includes('internet') || desc.includes('conta')) {
    return 'Contas';
  }
  if (desc.includes('shopping') || desc.includes('loja') || desc.includes('magazine') || desc.includes('americanas')) {
    return 'Compras';
  }
  if (desc.includes('restaurante') || desc.includes('bar') || desc.includes('cinema') || desc.includes('lazer')) {
    return 'Lazer';
  }
  
  return 'Outros';
}
