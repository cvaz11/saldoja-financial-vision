
export interface NubankTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  installment_number?: number;
  installment_total?: number;
  installment_id?: string;
  is_installment?: boolean;
}

export class NubankTransactionParser {
  
  parseTransactions(text: string): NubankTransaction[] {
    console.log('[NUBANK-PARSER] ===== INICIANDO PARSE TRANSAÇÕES =====');
    console.log('[NUBANK-PARSER] Texto total:', text.length, 'caracteres');
    
    // Extrair seção de transações
    const transactionSection = this.extractTransactionSection(text);
    console.log('[NUBANK-PARSER] Seção de transações:', transactionSection.length, 'caracteres');
    
    const transactions: NubankTransaction[] = [];
    
    // Padrões para capturar transações Nubank
    const patterns = [
      // Padrão 1: DD MMM •••• #### Descrição R$ valor
      /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+[•*]{4}\s+\d{4}\s+([^R$]+)\s+R\$\s*([\d.,]+)/gi,
      
      // Padrão 2: DD/MM Descrição R$ valor
      /(\d{1,2})\/(\d{1,2})\s+([^R$]+)\s+R\$\s*([\d.,]+)/gi,
      
      // Padrão 3: DD MMM ... R$ valor (mais flexível)
      /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+.*?R\$\s*([\d.,]+)/gi,
      
      // Padrão 4: Somente mês e valor para capturar transações perdidas
      /(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+.*?R\$\s*([\d.,]+)/gi
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      console.log(`[NUBANK-PARSER] Testando padrão ${i + 1}:`, pattern.source.slice(0, 50) + '...');
      
      const matches = Array.from(transactionSection.matchAll(pattern));
      console.log(`[NUBANK-PARSER] Padrão ${i + 1} encontrou ${matches.length} transações`);
      
      for (const match of matches) {
        try {
          const transaction = this.parseTransactionMatch(match, i + 1);
          
          if (transaction) {
            // FILTRO: Só aceitar débitos (valores negativos)
            if (transaction.amount < 0) {
              transactions.push(transaction);
            } else {
              console.log(`[NUBANK-PARSER] Descartando crédito: ${transaction.description} R$ ${transaction.amount.toFixed(2)}`);
            }
          }
        } catch (e) {
          console.log(`[NUBANK-PARSER] Erro ao processar match do padrão ${i + 1}:`, e.message);
        }
      }
    }
    
    console.log(`[NUBANK-PARSER] Total de transações válidas:`, transactions.length);
    
    // Deduplicar transações
    const uniqueTransactions = this.deduplicateTransactions(transactions);
    console.log(`[NUBANK-PARSER] Transações após deduplicação:`, uniqueTransactions.length);
    
    return uniqueTransactions;
  }
  
  private extractTransactionSection(text: string): string {
    // Procurar por seções de transações
    const startMarkers = [
      'TRANSAÇÕES',
      'MOVIMENTAÇÃO',
      'EXTRATO',
      'COMPRAS',
      'GASTOS'
    ];
    
    const endMarkers = [
      'PAGAMENTOS',
      'RESUMO',
      'TOTAL',
      'SALDO',
      'NEXT',
      'PRÓXIMA'
    ];
    
    let bestSection = text;
    let maxLength = 0;
    
    for (const startMarker of startMarkers) {
      const startIndex = text.toUpperCase().indexOf(startMarker);
      if (startIndex !== -1) {
        let endIndex = text.length;
        
        // Procurar por marcador de fim
        for (const endMarker of endMarkers) {
          const potentialEnd = text.toUpperCase().indexOf(endMarker, startIndex + startMarker.length);
          if (potentialEnd !== -1 && potentialEnd < endIndex) {
            endIndex = potentialEnd;
          }
        }
        
        const section = text.slice(startIndex, endIndex);
        if (section.length > maxLength) {
          maxLength = section.length;
          bestSection = section;
        }
      }
    }
    
    return bestSection;
  }
  
  private parseTransactionMatch(match: RegExpMatchArray, patternIndex: number): NubankTransaction | null {
    try {
      let day: string, month: string, description: string, amountStr: string;
      
      if (patternIndex === 1) {
        // Padrão 1: DD MMM •••• #### Descrição R$ valor
        [, day, month, description, amountStr] = match;
      } else if (patternIndex === 2) {
        // Padrão 2: DD/MM Descrição R$ valor
        [, day, month, description, amountStr] = match;
        month = this.convertNumericMonth(month);
      } else if (patternIndex === 3) {
        // Padrão 3: DD MMM ... R$ valor
        [, day, month, amountStr] = match;
        description = match[0].replace(/(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+/, '').replace(/R\$\s*[\d.,]+/, '').trim();
      } else if (patternIndex === 4) {
        // Padrão 4: MMM ... R$ valor
        [, month, amountStr] = match;
        day = '01'; // Dia padrão
        description = match[0].replace(/(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+/, '').replace(/R\$\s*[\d.,]+/, '').trim();
      } else {
        return null;
      }
      
      // Limpar descrição
      description = description
        .replace(/[•*]{4}\s*\d{4}\s*/, '') // Remove •••• ####
        .replace(/\s+/g, ' ')
        .trim();
      
      // Filtrar descrições inválidas
      if (!description || description.length < 3) {
        return null;
      }
      
      // Descartar IOF e outras taxas
      if (description.toUpperCase().includes('IOF') || 
          description.toUpperCase().includes('TAXA') ||
          description.toUpperCase().includes('TARIFA')) {
        console.log(`[NUBANK-PARSER] Descartando taxa/IOF: ${description}`);
        return null;
      }
      
      // Converter valor para float
      const amount = this.parseAmount(amountStr);
      if (amount === 0) {
        return null;
      }
      
      // Converter mês para número
      const monthNumber = this.convertMonth(month);
      const currentYear = new Date().getFullYear();
      
      // Formar data
      const date = `${currentYear}-${monthNumber.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Detectar parcelas antes de determinar categoria
      const installmentInfo = this.detectInstallment(description);
      
      // Determinar categoria
      const category = this.determineCategory(description);
      
      const transaction: NubankTransaction = {
        date,
        description,
        amount: -Math.abs(amount), // Garantir que é negativo (débito)
        category
      };

      // Adicionar informações de parcelamento se detectadas
      if (installmentInfo) {
        transaction.installment_number = installmentInfo.current;
        transaction.installment_total = installmentInfo.total;
        transaction.installment_id = installmentInfo.id;
        transaction.is_installment = true;
      }
      
      return transaction;
      
    } catch (error) {
      console.log(`[NUBANK-PARSER] Erro ao processar transação:`, error.message);
      return null;
    }
  }
  
  private convertMonth(month: string): number {
    const months: { [key: string]: number } = {
      'JAN': 1, 'FEV': 2, 'MAR': 3, 'ABR': 4, 'MAI': 5, 'JUN': 6,
      'JUL': 7, 'AGO': 8, 'SET': 9, 'OUT': 10, 'NOV': 11, 'DEZ': 12
    };
    return months[month.toUpperCase()] || 1;
  }
  
  private convertNumericMonth(month: string): string {
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const monthNum = parseInt(month);
    return months[monthNum - 1] || 'JAN';
  }
  
  private parseAmount(amountStr: string): number {
    // Remove espaços e converte vírgula para ponto
    const cleanAmount = amountStr
      .replace(/\s/g, '')
      .replace(/\./g, '') // Remove pontos de milhares
      .replace(',', '.'); // Converte vírgula decimal para ponto
    
    return parseFloat(cleanAmount) || 0;
  }
  
  private determineCategory(description: string): string {
    const desc = description.toUpperCase();
    
    if (desc.includes('UBER') || desc.includes('99') || desc.includes('TAXI')) {
      return 'transporte';
    }
    
    if (desc.includes('IFOOD') || desc.includes('RESTAURANTE') || desc.includes('LANCHONETE')) {
      return 'alimentacao';
    }
    
    if (desc.includes('FARMACIA') || desc.includes('DROGARIA') || desc.includes('MEDIC')) {
      return 'saude';
    }
    
    if (desc.includes('POSTO') || desc.includes('COMBUSTIVEL') || desc.includes('GASOLINA')) {
      return 'combustivel';
    }
    
    if (desc.includes('SUPERMERCADO') || desc.includes('MERCADO') || desc.includes('EXTRA')) {
      return 'supermercado';
    }
    
    if (desc.includes('PARCELA') || desc.includes('/')) {
      return 'parcelado';
    }
    
    return 'cartao';
  }
  
  private detectInstallment(description: string): { current: number; total: number; id: string } | null {
    // Padrões para detectar parcelas
    const patterns = [
      /parcela\s+(\d{1,2})\/(\d{1,2})/i,        // "Parcela 9/12"
      /(\d{1,2})\s*de\s*(\d{1,2})/i,            // "9 de 12"
      /(\d{1,2})\/(\d{1,2})\s*parcela/i,        // "9/12 parcela"
      /(\d{1,2})\s*\/\s*(\d{1,2})/i             // "9/12" (genérico)
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        
        // Validar se os números fazem sentido
        if (current > 0 && total > 0 && current <= total && total <= 99) {
          // Gerar ID único baseado na descrição base (sem a parte da parcela)
          const baseDescription = description
            .replace(/parcela\s+\d{1,2}\/\d{1,2}/i, '')
            .replace(/\d{1,2}\s*de\s*\d{1,2}/i, '')
            .replace(/\d{1,2}\/\d{1,2}\s*parcela/i, '')
            .replace(/\d{1,2}\s*\/\s*\d{1,2}/i, '')
            .trim()
            .replace(/\s+/g, ' ');
          
          // Criar ID único baseado na descrição base + total de parcelas
          const installmentId = this.generateInstallmentId(baseDescription, total);
          
          console.log(`[NUBANK-PARSER] Parcela detectada: ${current}/${total} - ID: ${installmentId}`);
          
          return {
            current,
            total,
            id: installmentId
          };
        }
      }
    }
    
    return null;
  }

  private generateInstallmentId(baseDescription: string, total: number): string {
    // Criar hash simples da descrição base + total
    const text = `${baseDescription}_${total}`.toLowerCase();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `inst_${Math.abs(hash).toString(36)}`;
  }

  private deduplicateTransactions(transactions: NubankTransaction[]): NubankTransaction[] {
    const seen = new Set<string>();
    const unique: NubankTransaction[] = [];
    
    for (const transaction of transactions) {
      // Para parcelas, usar installment_id + number como chave única
      const key = transaction.is_installment 
        ? `${transaction.installment_id}_${transaction.installment_number}`
        : `${transaction.date}_${transaction.description}_${transaction.amount}`;
        
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(transaction);
      }
    }
    
    return unique;
  }
}
