/**
 * Utilities for calculating invoice competency based on closing day
 */

/**
 * Calculate the competency month for a transaction based on the closing day
 * REGRA FIXA: A fatura de um mês SEMPRE representa gastos do mês ANTERIOR
 * Exemplo: Fatura de Agosto = Gastos de Julho
 * Esta lógica é aplicada independente da data da transação
 */
export const calculateCompetencyMonth = (
  transactionDate: Date | string,
  closingDay: number
): { month: number; year: number } => {
  const date = typeof transactionDate === 'string' ? new Date(transactionDate) : transactionDate;
  const transactionDay = date.getDate();
  
  console.log('[COMPETENCY] Calculating for transaction:', {
    date: date.toISOString().split('T')[0],
    day: transactionDay,
    closingDay
  });
  
  // REGRA FIXA: Transação SEMPRE pertence ao mês ANTERIOR ao da sua data
  // Isso representa que a fatura do mês seguinte conterá esses gastos
  const prevMonth = date.getMonth(); // JavaScript months são 0-based, então getMonth() já é o mês anterior
  const prevYear = prevMonth === -1 ? date.getFullYear() - 1 : date.getFullYear();
  const adjustedMonth = prevMonth === -1 ? 12 : prevMonth + 1;
  
  console.log('[COMPETENCY] Transaction belongs to previous month (FIXED RULE):', {
    originalMonth: date.getMonth() + 1,
    competencyMonth: adjustedMonth,
    competencyYear: prevYear
  });
  
  return {
    month: adjustedMonth,
    year: prevYear
  };
};

/**
 * Filter transactions by competency month
 */
export const filterTransactionsByCompetency = (
  transactions: any[],
  targetMonth: number,
  targetYear: number,
  closingDay: number
) => {
  return transactions.filter(transaction => {
    const competency = calculateCompetencyMonth(transaction.transaction_date, closingDay);
    return competency.month === targetMonth && competency.year === targetYear;
  });
};

/**
 * Get the range of competency months from transactions
 */
export const getCompetencyRange = (
  transactions: any[],
  closingDay: number
): { first: { month: number; year: number } | null; last: { month: number; year: number } | null } => {
  if (!transactions || transactions.length === 0) {
    return { first: null, last: null };
  }

  const competencyMonths = transactions.map(transaction => 
    calculateCompetencyMonth(transaction.transaction_date, closingDay)
  );

  // Sort by year then month
  competencyMonths.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  return {
    first: competencyMonths[0],
    last: competencyMonths[competencyMonths.length - 1]
  };
};