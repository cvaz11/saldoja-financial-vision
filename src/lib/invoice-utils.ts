
import { format, addMonths, startOfMonth, endOfMonth, isBefore, isAfter, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface InvoiceCycle {
  startDate: Date;
  endDate: Date;
  displayName: string;
  month: number;
  year: number;
}

/**
 * Calcula o ciclo de fatura baseado no dia de fechamento
 * @param closingDay Dia do mês em que a fatura fecha (1-31)
 * @param referenceDate Data de referência para calcular o ciclo
 * @returns Objeto com dados do ciclo de fatura
 */
export const calculateInvoiceCycle = (closingDay: number, referenceDate: Date = new Date()): InvoiceCycle => {
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();
  const currentDay = referenceDate.getDate();
  
  let cycleStartDate: Date;
  let cycleEndDate: Date;
  let displayMonth: number;
  let displayYear: number;

  // Se estamos antes do dia de fechamento, o ciclo atual começou no mês anterior
  if (currentDay <= closingDay) {
    // Ciclo atual: mês anterior até dia de fechamento do mês atual
    cycleStartDate = new Date(currentYear, currentMonth - 1, closingDay + 1);
    cycleEndDate = new Date(currentYear, currentMonth, closingDay);
    displayMonth = currentMonth + 1; // Mês da fatura (1-12)
    displayYear = currentYear;
  } else {
    // Ciclo atual: depois do fechamento, então começou no dia de fechamento + 1
    cycleStartDate = new Date(currentYear, currentMonth, closingDay + 1);
    cycleEndDate = new Date(currentYear, currentMonth + 1, closingDay);
    displayMonth = currentMonth + 2; // Próximo mês será a fatura (1-12)
    displayYear = currentYear;
    
    // Ajustar ano se necessário
    if (displayMonth > 12) {
      displayMonth = 1;
      displayYear++;
    }
  }

  // Ajustar ano do ciclo se necessário
  if (cycleStartDate.getMonth() === 11 && currentMonth === 0) {
    cycleStartDate.setFullYear(currentYear - 1);
  }
  if (cycleEndDate.getMonth() === 0 && currentMonth === 11) {
    cycleEndDate.setFullYear(currentYear + 1);
  }

  const displayName = format(new Date(displayYear, displayMonth - 1), 'MMMM/yyyy', { locale: ptBR });

  return {
    startDate: cycleStartDate,
    endDate: cycleEndDate,
    displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
    month: displayMonth,
    year: displayYear
  };
};

/**
 * Calcula o ciclo de fatura para um mês específico
 */
export const calculateInvoiceCycleForMonth = (closingDay: number, month: number, year: number): InvoiceCycle => {
  const cycleStartDate = new Date(year, month - 2, closingDay + 1);
  const cycleEndDate = new Date(year, month - 1, closingDay);
  
  // Ajustar anos se necessário
  if (month === 1) {
    cycleStartDate.setFullYear(year - 1);
  }

  const displayName = format(new Date(year, month - 1), 'MMMM/yyyy', { locale: ptBR });

  return {
    startDate: cycleStartDate,
    endDate: cycleEndDate,
    displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
    month,
    year
  };
};

/**
 * Verifica se uma data está dentro de um ciclo de fatura
 */
export const isDateInInvoiceCycle = (date: Date, cycle: InvoiceCycle): boolean => {
  return (isEqual(date, cycle.startDate) || isAfter(date, cycle.startDate)) && 
         (isEqual(date, cycle.endDate) || isBefore(date, cycle.endDate));
};

/**
 * Calcula próximos ciclos de fatura
 */
export const getUpcomingInvoiceCycles = (closingDay: number, count: number = 6): InvoiceCycle[] => {
  const cycles: InvoiceCycle[] = [];
  const today = new Date();
  
  // Ciclo atual
  const currentCycle = calculateInvoiceCycle(closingDay, today);
  cycles.push(currentCycle);
  
  // Próximos ciclos
  for (let i = 1; i < count; i++) {
    const futureDate = addMonths(today, i);
    const futureCycle = calculateInvoiceCycle(closingDay, futureDate);
    cycles.push(futureCycle);
  }
  
  return cycles;
};

/**
 * Formata período do ciclo para exibição
 */
export const formatInvoiceCyclePeriod = (cycle: InvoiceCycle): string => {
  const startFormatted = format(cycle.startDate, 'dd/MM', { locale: ptBR });
  const endFormatted = format(cycle.endDate, 'dd/MM/yyyy', { locale: ptBR });
  return `${startFormatted} a ${endFormatted}`;
};
