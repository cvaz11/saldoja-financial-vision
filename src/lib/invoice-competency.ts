/**
 * Utilities for calculating invoice competency based on statement date
 */

/**
 * NEW LOGIC: Calculate competency based on statement month/year
 * REGRA FIXA: A fatura de um mês SEMPRE representa gastos do mês ANTERIOR
 * Exemplo: Fatura/Extrato de Agosto = Competência de Julho
 * Esta lógica é aplicada baseada no mês do extrato, não na data da transação
 */
export const calculateStatementCompetency = (
  statementMonth: number,
  statementYear: number
): { month: number; year: number } => {
  // REGRA FIXA: Extrato de mês X = Competência de mês X-1
  const competencyMonth = statementMonth === 1 ? 12 : statementMonth - 1;
  const competencyYear = statementMonth === 1 ? statementYear - 1 : statementYear;
  
  if (import.meta.env.DEV) {
    console.log('[STATEMENT_COMPETENCY] Calculated competency:', {
      statementMonth,
      statementYear,
      competencyMonth,
      competencyYear
    });
  }
  
  return {
    month: competencyMonth,
    year: competencyYear
  };
};

/**
 * DEPRECATED: Old transaction-based competency logic
 * Kept for backward compatibility but will be replaced by statement-based logic
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
 * Filter transactions by statement competency (NEW LOGIC)
 */
export const filterTransactionsByStatementCompetency = (
  transactions: any[],
  targetMonth: number,
  targetYear: number
) => {
  return transactions.filter(transaction => {
    if (!transaction.statement) return false;
    
    const competency = calculateStatementCompetency(
      transaction.statement.month,
      transaction.statement.year
    );
    
    return competency.month === targetMonth && competency.year === targetYear;
  });
};

/**
 * DEPRECATED: Filter transactions by competency month (old logic)
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
 * Get the range of competency months from statements (NEW LOGIC)
 */
export const getStatementCompetencyRange = (
  statements: any[]
): { first: { month: number; year: number } | null; last: { month: number; year: number } | null } => {
  if (!statements || statements.length === 0) {
    return { first: null, last: null };
  }

  const competencyMonths = statements.map(statement => 
    calculateStatementCompetency(statement.month, statement.year)
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

/**
 * DEPRECATED: Get the range of competency months from transactions (old logic)
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