
export const extractTextFromPDFBytes = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF-PARSER] ===== INICIANDO PARSER AVANÇADO =====');
    
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`[PDF-PARSER] Analisando PDF de ${uint8Array.length} bytes`);
    
    // Converter para string ASCII/Latin-1 para buscar padrões de texto
    let textContent = '';
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      if (byte >= 32 && byte <= 126) {
        textContent += String.fromCharCode(byte);
      } else if (byte === 10 || byte === 13) {
        textContent += ' ';
      } else {
        textContent += ' ';
      }
    }
    
    console.log(`[PDF-PARSER] Texto bruto extraído: ${textContent.length} caracteres`);
    
    // Buscar por padrões específicos do Nubank
    const nubankPatterns = [
      /NUBANK/gi,
      /cartão de crédito/gi,
      /fatura/gi,
      /período/gi,
      /R\$\s*[\d.,]+/g,
      /\d{1,2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/gi,
      /parcela\s+\d+\/\d+/gi,
      /IOF/gi
    ];
    
    let relevantText = '';
    let matches = 0;
    
    for (const pattern of nubankPatterns) {
      const found = textContent.match(pattern);
      if (found) {
        matches += found.length;
        console.log(`[PDF-PARSER] Padrão encontrado: ${pattern.source} - ${found.length} matches`);
      }
    }
    
    console.log(`[PDF-PARSER] Total de padrões Nubank encontrados: ${matches}`);
    
    if (matches > 0) {
      // Extrair seções relevantes do texto
      const lines = textContent.split(/\s+/);
      let extractedLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Se a linha contém padrões relevantes, incluir ela e contexto
        if (
          /\d{1,2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/i.test(line) ||
          /R\$\s*[\d.,]+/.test(line) ||
          /parcela/i.test(line) ||
          /IOF/i.test(line)
        ) {
          // Incluir contexto (5 palavras antes e depois)
          const start = Math.max(0, i - 5);
          const end = Math.min(lines.length, i + 5);
          const context = lines.slice(start, end).join(' ');
          extractedLines.push(context);
        }
      }
      
      relevantText = extractedLines.join('\n');
      console.log(`[PDF-PARSER] Texto relevante extraído: ${relevantText.length} caracteres`);
    }
    
    // Se não encontrou padrões específicos, usar o texto completo (limitado)
    if (relevantText.length < 100) {
      relevantText = textContent.slice(0, 15000);
      console.log('[PDF-PARSER] Usando texto completo como fallback');
    }
    
    // Limpar e normalizar o texto
    relevantText = relevantText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00C0-\u00FF]/g, ' ')
      .trim();
    
    console.log(`[PDF-PARSER] Texto final processado: ${relevantText.length} caracteres`);
    console.log(`[PDF-PARSER] Preview: ${relevantText.slice(0, 200)}...`);
    
    return relevantText;
    
  } catch (error) {
    console.error('[PDF-PARSER] Erro no parser avançado:', error);
    return '';
  }
};

export const tryRegexExtraction = (text: string): Array<{date: string, description: string, amount: number, category: string}> => {
  console.log('[REGEX] ===== INICIANDO EXTRAÇÃO POR REGEX =====');
  
  const transactions: Array<{date: string, description: string, amount: number, category: string}> = [];
  
  // Padrões mais específicos para Nubank
  const patterns = [
    // Padrão: DD MMM ESTABELECIMENTO R$ valor
    /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+([A-Z\s]{3,40})\s+R\$\s*([\d.,]+)/gi,
    
    // Padrão: DD/MM ESTABELECIMENTO valor
    /(\d{1,2})\/(\d{1,2})\s+([A-Z\s]{3,30})\s+[\d.,]+/gi,
    
    // Padrão para valores monetários com contexto
    /([A-Z\s]{5,30})\s+R\$\s*([\d.,]+)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    console.log(`[REGEX] Padrão ${pattern.source}: ${matches.length} matches`);
    
    for (const match of matches.slice(0, 10)) { // Limitar para evitar spam
      try {
        let description = '';
        let amountStr = '';
        let day = '';
        let month = '';
        
        if (match.length >= 4) {
          if (match[2] && /JAN|FEV|MAR/i.test(match[2])) {
            day = match[1];
            month = match[2];
            description = match[3];
            amountStr = match[4];
          } else {
            description = match[1] || match[3] || 'Transação';
            amountStr = match[2] || match[4];
          }
        }
        
        // Limpar descrição
        description = description
          .replace(/[^A-Za-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 50);
        
        if (description.length < 3) continue;
        
        // Processar valor
        const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
        if (isNaN(amount) || amount === 0) continue;
        
        // Data padrão se não encontrada
        const currentYear = new Date().getFullYear();
        let date = `${currentYear}-06-15`; // Data padrão
        
        if (day && month) {
          const monthMap: {[key: string]: string} = {
            'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
            'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
            'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
          };
          const monthNum = monthMap[month.toUpperCase()] || '06';
          date = `${currentYear}-${monthNum}-${day.padStart(2, '0')}`;
        }
        
        // Determinar categoria
        const category = determineCategory(description);
        
        transactions.push({
          date,
          description,
          amount: -Math.abs(amount),
          category
        });
        
      } catch (e) {
        continue;
      }
    }
  }
  
  console.log(`[REGEX] Total de transações extraídas: ${transactions.length}`);
  return transactions;
};

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
  
  return 'Outros';
}
