/**
 * Utilities for calculating invoice competency based on closing day
 */

/**
 * Calculate the competency month for a transaction based on the closing day
 * Rules:
 * - If transaction day > closing day: belongs to current month
 * - If transaction day <= closing day: belongs to previous month
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
  
  if (transactionDay > closingDay) {
    // Transaction belongs to current month
    console.log('[COMPETENCY] Transaction belongs to current month');
    return {
      month: date.getMonth() + 1, // JavaScript months are 0-based
      year: date.getFullYear()
    };
  } else {
    // Transaction belongs to previous month
    const prevMonth = date.getMonth(); // Already 0-based, so this is previous month
    const prevYear = prevMonth === -1 ? date.getFullYear() - 1 : date.getFullYear();
    const adjustedMonth = prevMonth === -1 ? 12 : prevMonth + 1;
    
    console.log('[COMPETENCY] Transaction belongs to previous month:', {
      prevMonth: adjustedMonth,
      prevYear
    });
    
    return {
      month: adjustedMonth,
      year: prevYear
    };
  }
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