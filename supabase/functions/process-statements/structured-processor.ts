
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

export const processStructuredFile = async (fileData: Blob, filename: string): Promise<Transaction[]> => {
  console.log('[STRUCTURED] ===== PROCESSAMENTO ARQUIVOS ESTRUTURADOS =====');
  console.log(`[STRUCTURED] Arquivo: ${filename}, Tamanho: ${fileData.size} bytes`);
  
  try {
    const fileExtension = filename.toLowerCase().split('.').pop();
    console.log(`[STRUCTURED] 🔍 Processando extensão: ${fileExtension}`);
    
    switch (fileExtension) {
      case 'csv':
        return await processCSV(fileData);
      case 'ofx':
        return await processOFX(fileData);
      case 'xls':
      case 'xlsx':
        return await processExcel(fileData);
      default:
        throw new Error(`Formato de arquivo não suportado: ${fileExtension}. Aceito apenas CSV, OFX, XLS, XLSX`);
    }
  } catch (error) {
    console.error('[STRUCTURED] ❌ Erro no processamento estruturado:', error.message);
    throw error; // Re-lançar para que o caller receba o erro específico
  }
};

async function processCSV(fileData: Blob): Promise<Transaction[]> {
  console.log('[STRUCTURED] 📄 Processando arquivo CSV...');
  
  try {
    console.log('[STRUCTURED] 🔍 Convertendo arquivo para texto...');
    const text = await fileData.text();
    console.log(`[STRUCTURED] 📝 Texto obtido: ${text.length} caracteres`);
    console.log(`[STRUCTURED] 🎯 Primeiros 200 chars: ${text.substring(0, 200)}`);
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    console.log(`[STRUCTURED] 📋 Total de linhas: ${lines.length}`);
    
    if (lines.length < 2) {
      console.log('[STRUCTURED] ❌ CSV muito pequeno ou vazio');
      throw new Error('CSV deve ter pelo menos 2 linhas (cabeçalho + dados)');
    }
    
    const transactions: Transaction[] = [];
    const header = lines[0].toLowerCase();
    console.log(`[STRUCTURED] 📊 Cabeçalho original: ${header}`);
    
    // Detectar colunas baseado no cabeçalho
    const columns = header.split(',').map(col => col.trim().replace(/"/g, ''));
    
    console.log(`[STRUCTURED] 📋 Colunas detectadas (${columns.length}): ${columns.join(', ')}`);
    
    // Verificar se encontramos colunas essenciais
    const hasDate = columns.some(col => col.includes('data') || col.includes('date'));
    const hasDescription = columns.some(col => col.includes('descr') || col.includes('memo') || col.includes('estabelecimento') || col.includes('title'));
    const hasAmount = columns.some(col => col.includes('valor') || col.includes('amount') || col.includes('quantia'));
    
    console.log(`[STRUCTURED] 🔍 Validação de colunas: data=${hasDate}, descrição=${hasDescription}, valor=${hasAmount}`);
    
    if (!hasDate || !hasDescription || !hasAmount) {
      throw new Error(`CSV inválido - faltam colunas essenciais. Encontradas: ${columns.join(', ')}`);
    }
    
    for (let i = 1; i < lines.length; i++) {
      try {
        console.log(`[STRUCTURED] 📝 Processando linha ${i}: ${lines[i].substring(0, 100)}...`);
        const values = parseCSVLine(lines[i]);
        
        if (values.length !== columns.length) {
          console.log(`[STRUCTURED] ⚠️ Linha ${i} com número incorreto de colunas: esperado ${columns.length}, encontrado ${values.length}`);
          continue;
        }
        
        const transaction = parseTransactionFromCSV(columns, values);
        if (transaction && validateTransaction(transaction)) {
          transactions.push(transaction);
          console.log(`[STRUCTURED] ✅ Transação ${transactions.length} adicionada: ${transaction.description}`);
        } else {
          console.log(`[STRUCTURED] ⚠️ Transação linha ${i} não passou na validação`);
        }
      } catch (lineError) {
        console.log(`[STRUCTURED] ⚠️ Erro na linha ${i}: ${lineError.message}`);
        continue;
      }
    }
    
    console.log(`[STRUCTURED] ✅ CSV processado: ${transactions.length} transações válidas de ${lines.length - 1} linhas`);
    return transactions;
    
  } catch (error) {
    console.error('[STRUCTURED] ❌ Erro crítico no processamento CSV:', error.message);
    console.error('[STRUCTURED] ❌ Stack trace:', error.stack);
    throw error; // Re-lançar o erro para ser capturado pelo caller
  }
}

async function processOFX(fileData: Blob): Promise<Transaction[]> {
  console.log('[STRUCTURED] 💰 Processando arquivo OFX...');
  
  try {
    const text = await fileData.text();
    const transactions: Transaction[] = [];
    
    // Buscar por transações no formato OFX
    const transactionPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    const matches = text.matchAll(transactionPattern);
    
    for (const match of matches) {
      try {
        const transactionData = match[1];
        
        // Extrair campos OFX
        const dateMatch = transactionData.match(/<DTPOSTED>(\d{8})/);
        const amountMatch = transactionData.match(/<TRNAMT>([-\d.,]+)/);
        const memoMatch = transactionData.match(/<MEMO>(.*?)</) || transactionData.match(/<NAME>(.*?)</);
        
        if (dateMatch && amountMatch) {
          const date = formatOFXDate(dateMatch[1]);
          const amount = parseFloat(amountMatch[1]);
          const description = memoMatch ? memoMatch[1].trim() : 'Transação OFX';
          
          if (amount !== 0 && description) {
            transactions.push({
              date,
              description,
              amount,
              category: determineCategory(description)
            });
          }
        }
      } catch (transactionError) {
        console.log(`[STRUCTURED] ⚠️ Erro ao processar transação OFX: ${transactionError.message}`);
        continue;
      }
    }
    
    console.log(`[STRUCTURED] ✅ OFX processado: ${transactions.length} transações`);
    return transactions;
    
  } catch (error) {
    console.error('[STRUCTURED] Erro no processamento OFX:', error);
    return [];
  }
}

async function processExcel(fileData: Blob): Promise<Transaction[]> {
  console.log('[STRUCTURED] 📊 Processando arquivo Excel...');
  
  try {
    // Para simplicidade, vamos processar como CSV se for possível
    // Em produção, você usaria uma biblioteca como xlsx
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Tentar converter para texto (funciona para alguns arquivos Excel simples)
    const uint8Array = new Uint8Array(arrayBuffer);
    let text = '';
    
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      if (byte >= 32 && byte <= 126) {
        text += String.fromCharCode(byte);
      } else if (byte === 9 || byte === 10 || byte === 13) {
        text += String.fromCharCode(byte);
      }
    }
    
    // Tentar extrair dados estruturados
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10);
    
    console.log(`[STRUCTURED] 📋 ${lines.length} linhas extraídas do Excel`);
    
    const transactions: Transaction[] = [];
    
    for (const line of lines) {
      try {
        // Buscar padrões de data, valor e descrição
        const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/;
        const amountPattern = /([-+]?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/;
        
        const dateMatch = line.match(datePattern);
        const amountMatch = line.match(amountPattern);
        
        if (dateMatch && amountMatch) {
          const date = normalizeDate(dateMatch[1]);
          const amount = parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.'));
          const description = line
            .replace(datePattern, '')
            .replace(amountPattern, '')
            .trim()
            .slice(0, 100);
          
          if (amount !== 0 && description.length > 3) {
            transactions.push({
              date,
              description,
              amount,
              category: determineCategory(description)
            });
          }
        }
      } catch (lineError) {
        continue;
      }
    }
    
    console.log(`[STRUCTURED] ✅ Excel processado: ${transactions.length} transações`);
    return transactions;
    
  } catch (error) {
    console.error('[STRUCTURED] Erro no processamento Excel:', error);
    return [];
  }
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values.map(val => val.replace(/^"|"$/g, ''));
}

function parseTransactionFromCSV(columns: string[], values: string[]): Transaction | null {
  try {
    let date = '', description = '', amount = 0;
    let installment_number = 1;
    let installment_total = 1;
    
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const value = values[i];
      
      // Melhor detecção de colunas
      if (column.includes('data') || column.includes('date') || column === 'date') {
        date = normalizeDate(value);
      } else if (column.includes('descr') || column.includes('memo') || column.includes('estabelecimento') || column === 'title') {
        description = value;
        
        // Detectar parcelas na descrição
        const installmentPattern = /(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i;
        const parcelaPattern = /parcela\s+(\d{1,2})\s*\/\s*(\d{1,2})/i;
        
        let match = description.match(parcelaPattern) || description.match(installmentPattern);
        
        if (match) {
          installment_number = parseInt(match[1]);
          installment_total = parseInt(match[2]);
          console.log(`[STRUCTURED] Parcela detectada: ${installment_number}/${installment_total} na descrição: ${description}`);
        }
      } else if (column.includes('valor') || column.includes('amount') || column.includes('quantia') || column === 'amount') {
        // Melhor parsing de valores
        const cleanValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
        amount = parseFloat(cleanValue);
        
        // Se o valor é negativo, manter como negativo
        if (value.includes('-')) {
          amount = -Math.abs(amount);
        }
      }
    }
    
    if (date && description && !isNaN(amount) && amount !== 0) {
      return {
        date,
        description: description.slice(0, 255),
        amount,
        category: determineCategory(description),
        installment_number,
        installment_total
      };
    }
    
    return null;
  } catch (error) {
    console.error('[STRUCTURED] Erro ao parsear transação CSV:', error);
    return null;
  }
}

function formatOFXDate(dateStr: string): string {
  // Formato OFX: YYYYMMDD
  if (dateStr.length >= 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function normalizeDate(dateStr: string): string {
  try {
    // Vários formatos de data
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${month}-${day}`;
      }
    } else if (dateStr.includes('-')) {
      return dateStr; // Já no formato correto
    }
    
    return new Date().toISOString().split('T')[0];
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
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
