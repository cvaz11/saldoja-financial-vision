import { format, addMonths, subMonths } from 'date-fns';

/**
 * Calcula o mês de competência de uma transação baseado no dia de fechamento da fatura
 * @param transactionDate - Data da transação
 * @param closingDay - Dia de fechamento da fatura (ex: 12)
 * @returns Objeto com mês e ano de competência
 */
export const calculateCompetencyMonth = (transactionDate: string | Date, closingDay: number) => {
  const date = new Date(transactionDate);
  const day = date.getDate();
  
  // Se o dia da transação > fechamento, competência = mês atual
  // Se o dia da transação ≤ fechamento, competência = mês anterior
  const competencyDate = day > closingDay ? date : subMonths(date, 1);
  
  return {
    month: competencyDate.getMonth() + 1, // 1-12
    year: competencyDate.getFullYear()
  };
};

/**
 * Filtra transações por mês de competência
 * @param transactions - Lista de transações
 * @param targetMonth - Mês alvo (1-12)
 * @param targetYear - Ano alvo
 * @param closingDay - Dia de fechamento da fatura
 * @returns Transações filtradas por competência
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
 * Agrupa transações por mês de competência
 * @param transactions - Lista de transações
 * @param closingDay - Dia de fechamento da fatura
 * @returns Objeto com transações agrupadas por "YYYY-MM"
 */
export const groupTransactionsByCompetency = (transactions: any[], closingDay: number) => {
  const grouped: { [key: string]: any[] } = {};
  
  transactions.forEach(transaction => {
    const competency = calculateCompetencyMonth(transaction.transaction_date, closingDay);
    const key = `${competency.year}-${competency.month.toString().padStart(2, '0')}`;
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(transaction);
  });
  
  return grouped;
};

/**
 * Calcula o range de meses com dados baseado na competência
 * @param transactions - Lista de transações
 * @param closingDay - Dia de fechamento da fatura
 * @returns Primeiro e último mês com dados
 */
export const getCompetencyRange = (transactions: any[], closingDay: number) => {
  if (!transactions.length) return null;
  
  const competencies = transactions.map(t => {
    const comp = calculateCompetencyMonth(t.transaction_date, closingDay);
    return new Date(comp.year, comp.month - 1, 1);
  });
  
  const firstDate = new Date(Math.min(...competencies.map(d => d.getTime())));
  const lastDate = new Date(Math.max(...competencies.map(d => d.getTime())));
  
  return {
    firstMonth: firstDate.getMonth() + 1,
    firstYear: firstDate.getFullYear(),
    lastMonth: lastDate.getMonth() + 1,
    lastYear: lastDate.getFullYear()
  };
};