
// Parser especializado para transações Nubank
export interface NubankTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

export class NubankTransactionParser {
  
  // Mapeamento de meses em português
  private readonly monthMap: Record<string, number> = {
    'JAN': 1, 'FEV': 2, 'MAR': 3, 'ABR': 4, 'MAI': 5, 'JUN': 6,
    'JUL': 7, 'AGO': 8, 'SET': 9, 'OUT': 10, 'NOV': 11, 'DEZ': 12
  };
  
  parseTransactions(extractedText: string): NubankTransaction[] {
    console.log('[NUBANK-PARSER] ===== INICIANDO PARSE TRANSAÇÕES =====');
    console.log('[NUBANK-PARSER] Texto total:', extractedText.length, 'caracteres');
    
    // Encontrar seção de transações
    const transactionSection = this.findTransactionSection(extractedText);
    console.log('[NUBANK-PARSER] Seção de transações:', transactionSection.length, 'caracteres');
    
    if (transactionSection.length < 50) {
      console.log('[NUBANK-PARSER] Seção de transações muito pequena, tentando todo o texto');
      return this.extractTransactionsFromText(extractedText);
    }
    
    return this.extractTransactionsFromText(transactionSection);
  }
  
  private findTransactionSection(text: string): string {
    // Tentar encontrar seção específica de transações
    const patterns = [
      /TRANSAÇÕES DE.*?(?=PAGAMENTOS|Pagamentos|RESUMO|$)/is,
      /EXTRATO DETALHADO.*?(?=PAGAMENTOS|Pagamentos|RESUMO|$)/is,
      /LANÇAMENTOS.*?(?=PAGAMENTOS|Pagamentos|RESUMO|$)/is,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[0].length > 100) {
        console.log('[NUBANK-PARSER] Seção encontrada com padrão:', pattern.source.slice(0, 20));
        return match[0];
      }
    }
    
    // Se não encontrar seção específica, usar todo o texto
    return text;
  }
  
  private extractTransactionsFromText(text: string): NubankTransaction[] {
    const transactions: NubankTransaction[] = [];
    
    // Padrões para identificar transações Nubank
    const patterns = [
      // Padrão principal: DD MMM •••• NNNN Descrição R$ valor
      /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+[•*]+\s*\d+\s+([^R$]+)\s+R\$\s*([\d.,]+)/gi,
      
      // Padrão alternativo: DD/MM Descrição R$ valor
      /(\d{1,2})\/(\d{1,2})\s+([^R$]+)\s+R\$\s*([\d.,]+)/gi,
      
      // Padrão para compras: DD MMM Descrição R$ valor
      /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+([^R$]+?)\s+R\$\s*([\d.,]+)/gi,
      
      // Padrão mais flexível
      /(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+.*?R\$\s*([\d.,]+)/gi,
    ];
    
    let totalFound = 0;
    
    patterns.forEach((pattern, index) => {
      console.log(`[NUBANK-PARSER] Testando padrão ${index + 1}:`, pattern.source.slice(0, 50));
      
      const matches = text.matchAll(pattern);
      let patternMatches = 0;
      
      for (const match of matches) {
        try {
          const transaction = this.parseTransactionMatch(match, pattern);
          if (transaction && this.isValidDebitTransaction(transaction)) {
            transactions.push(transaction);
            patternMatches++;
            totalFound++;
          }
        } catch (error) {
          console.log('[NUBANK-PARSER] Erro ao processar match:', error.message);
        }
      }
      
      console.log(`[NUBANK-PARSER] Padrão ${index + 1} encontrou ${patternMatches} transações`);
    });
    
    console.log(`[NUBANK-PARSER] Total de transações válidas: ${totalFound}`);
    
    // Remover duplicatas baseado em data + descrição + valor
    const uniqueTransactions = this.removeDuplicates(transactions);
    console.log(`[NUBANK-PARSER] Transações após deduplicação: ${uniqueTransactions.length}`);
    
    return uniqueTransactions;
  }
  
  private parseTransactionMatch(match: RegExpMatchArray, pattern: RegExp): NubankTransaction | null {
    try {
      let day: number, month: number, description: string, amountStr: string;
      
      // Determinar formato baseado no padrão
      if (pattern.source.includes('DD MMM')) {
        day = parseInt(match[1]);
        month = this.monthMap[match[2]] || 1;
        description = match[3]?.trim() || '';
        amountStr = match[4] || '';
      } else if (pattern.source.includes('DD/MM')) {
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        description = match[3]?.trim() || '';
        amountStr = match[4] || '';
      } else {
        // Padrão mais flexível
        month = this.monthMap[match[1]] || 1;
        day = 1; // Default
        description = match[0]?.replace(/R\$\s*[\d.,]+/, '').trim() || '';
        amountStr = match[2] || '';
      }
      
      // Limpar e converter valor
      const amount = this.parseAmount(amountStr);
      if (amount === null) return null;
      
      // Limpar descrição
      description = this.cleanDescription(description);
      if (description.length < 3) return null;
      
      // Criar data (assumir ano atual)
      const year = new Date().getFullYear();
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      return {
        date,
        description,
        amount: -Math.abs(amount), // Sempre negativo para débitos
        category: this.categorizeTransaction(description)
      };
      
    } catch (error) {
      console.log('[NUBANK-PARSER] Erro ao processar match individual:', error.message);
      return null;
    }
  }
  
  private parseAmount(amountStr: string): number | null {
    if (!amountStr) return null;
    
    // Limpar string do valor
    const cleaned = amountStr
      .replace(/[^\d.,]/g, '')
      .replace(/\./g, '')  // Remover pontos (milhares)
      .replace(',', '.'); // Vírgula vira ponto decimal
    
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  }
  
  private cleanDescription(desc: string): string {
    return desc
      .replace(/[•*]+\s*\d+/g, '') // Remover bullets e números
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('parcela') || desc.includes('/')) return 'parcelamento';
    if (desc.includes('pix')) return 'pix';
    if (desc.includes('ted') || desc.includes('doc')) return 'transferencia';
    if (desc.includes('saque')) return 'saque';
    if (desc.includes('anuidade')) return 'taxa';
    
    return 'cartao';
  }
  
  private isValidDebitTransaction(transaction: NubankTransaction): boolean {
    // Filtrar apenas débitos (valores negativos)
    if (transaction.amount >= 0) {
      console.log('[NUBANK-PARSER] Descartando crédito:', transaction.description, transaction.amount);
      return false;
    }
    
    // Filtrar IOF (opcional)
    if (transaction.description.toLowerCase().includes('iof')) {
      console.log('[NUBANK-PARSER] Descartando IOF:', transaction.description);
      return false;
    }
    
    // Verificar se valor é razoável (entre R$ 0,01 e R$ 50.000)
    const absAmount = Math.abs(transaction.amount);
    if (absAmount < 0.01 || absAmount > 50000) {
      console.log('[NUBANK-PARSER] Valor fora do range:', transaction.description, transaction.amount);
      return false;
    }
    
    return true;
  }
  
  private removeDuplicates(transactions: NubankTransaction[]): NubankTransaction[] {
    const seen = new Set<string>();
    return transactions.filter(transaction => {
      const key = `${transaction.date}-${transaction.description}-${transaction.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
