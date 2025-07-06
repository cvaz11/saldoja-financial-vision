// Análise inteligente de período de faturas baseada em transações
interface Transaction {
  date: string;
  description: string;
  amount: number;
}

interface PeriodAnalysis {
  suggestedMonth: number;
  suggestedYear: number;
  confidence: number;
  reasoning: string;
  monthDistribution: Record<string, number>;
  closingDayPattern?: number;
  totalTransactions: number;
}

/**
 * Analisa as transações para determinar o período mais provável da fatura
 */
export function analyzeInvoicePeriod(
  transactions: Transaction[],
  profileClosingDay: number = 5
): PeriodAnalysis {
  console.log(`[PERIOD_ANALYZER] Analisando ${transactions.length} transações para detectar período...`);
  
  if (!transactions.length) {
    const now = new Date();
    return {
      suggestedMonth: now.getMonth() + 1,
      suggestedYear: now.getFullYear(),
      confidence: 0,
      reasoning: 'Nenhuma transação encontrada - usando período atual',
      monthDistribution: {},
      totalTransactions: 0
    };
  }

  // 1. Analisar distribuição de transações por mês/ano
  const monthYearDistribution = new Map<string, number>();
  const monthDistribution: Record<string, number> = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthYear = `${year}-${month.toString().padStart(2, '0')}`;
    const monthKey = `${month}/${year}`;
    
    monthYearDistribution.set(monthYear, (monthYearDistribution.get(monthYear) || 0) + 1);
    monthDistribution[monthKey] = (monthDistribution[monthKey] || 0) + 1;
  });

  console.log('[PERIOD_ANALYZER] Distribuição por mês:', monthDistribution);

  // 2. Encontrar o período predominante
  let maxCount = 0;
  let predominantPeriod = '';
  
  for (const [period, count] of monthYearDistribution) {
    if (count > maxCount) {
      maxCount = count;
      predominantPeriod = period;
    }
  }

  const [yearStr, monthStr] = predominantPeriod.split('-');
  const suggestedYear = parseInt(yearStr);
  const suggestedMonth = parseInt(monthStr);

  // 3. Calcular confiança baseada na concentração
  const totalTransactions = transactions.length;
  const confidence = Math.round((maxCount / totalTransactions) * 100);

  // 4. Analisar padrão de fechamento (opcional para versão futura)
  const closingPattern = analyzeClosingPattern(transactions, profileClosingDay);

  // 5. Gerar raciocínio
  const percentage = Math.round((maxCount / totalTransactions) * 100);
  let reasoning = `${percentage}% das transações (${maxCount}/${totalTransactions}) estão em ${getMonthName(suggestedMonth)} ${suggestedYear}`;
  
  if (confidence >= 80) {
    reasoning += ' - Alta confiança';
  } else if (confidence >= 60) {
    reasoning += ' - Confiança média';
  } else {
    reasoning += ' - Baixa confiança - pode precisar de revisão manual';
  }

  if (closingPattern.detectedClosingDay) {
    reasoning += `. Padrão de fechamento detectado: dia ${closingPattern.detectedClosingDay}`;
  }

  console.log(`[PERIOD_ANALYZER] Período sugerido: ${suggestedMonth}/${suggestedYear} (${confidence}% confiança)`);
  console.log(`[PERIOD_ANALYZER] Raciocínio: ${reasoning}`);

  return {
    suggestedMonth,
    suggestedYear,
    confidence,
    reasoning,
    monthDistribution,
    closingDayPattern: closingPattern.detectedClosingDay,
    totalTransactions
  };
}

/**
 * Analisa padrão de fechamento baseado na concentração de datas
 */
function analyzeClosingPattern(transactions: Transaction[], profileClosingDay: number) {
  const dayDistribution = new Map<number, number>();
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const day = date.getDate();
    dayDistribution.set(day, (dayDistribution.get(day) || 0) + 1);
  });

  // Procurar por concentrações significativas em torno do dia de fechamento
  const totalTransactions = transactions.length;
  let detectedClosingDay: number | undefined;
  
  // Verificar se há concentração significativa próximo ao dia de fechamento do perfil
  const rangeStart = Math.max(1, profileClosingDay - 3);
  const rangeEnd = Math.min(31, profileClosingDay + 3);
  
  let concentrationCount = 0;
  for (let day = rangeStart; day <= rangeEnd; day++) {
    concentrationCount += dayDistribution.get(day) || 0;
  }
  
  const concentrationPercentage = (concentrationCount / totalTransactions) * 100;
  
  if (concentrationPercentage > 40) {
    detectedClosingDay = profileClosingDay;
    console.log(`[PERIOD_ANALYZER] Padrão de fechamento detectado: ${concentrationPercentage.toFixed(1)}% das transações próximas ao dia ${profileClosingDay}`);
  }
  
  return {
    detectedClosingDay,
    concentrationPercentage
  };
}

/**
 * Retorna nome do mês em português
 */
function getMonthName(month: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1] || 'Mês Inválido';
}

/**
 * Detecta múltiplos períodos quando há distribuição equilibrada
 */
export function detectMultiplePeriods(
  transactions: Transaction[],
  minPercentageThreshold: number = 30
): Array<{ month: number; year: number; count: number; percentage: number }> {
  const monthYearDistribution = new Map<string, number>();
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthYear = `${year}-${month}`;
    
    monthYearDistribution.set(monthYear, (monthYearDistribution.get(monthYear) || 0) + 1);
  });

  const totalTransactions = transactions.length;
  const periods = [];
  
  for (const [period, count] of monthYearDistribution) {
    const percentage = (count / totalTransactions) * 100;
    if (percentage >= minPercentageThreshold) {
      const [yearStr, monthStr] = period.split('-');
      periods.push({
        month: parseInt(monthStr),
        year: parseInt(yearStr),
        count,
        percentage: Math.round(percentage)
      });
    }
  }
  
  return periods.sort((a, b) => b.count - a.count);
}