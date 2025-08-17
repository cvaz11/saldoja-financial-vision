
import { useUserProfile } from "./useUserProfile";
import { useTransactions } from "./useTransactions";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
import { shouldIncludeInTotals } from "@/utils/paymentClassifier";
import { useMemo } from "react";

export const useTransactionMetrics = () => {
  const { profile } = useUserProfile();
  
  // Ciclo atual
  const currentCycle = profile ? calculateInvoiceCycle(profile.invoice_closing_day) : null;
  const currentCycleRange = currentCycle ? { from: currentCycle.startDate, to: currentCycle.endDate } : null;
  
  // Ciclo anterior 
  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousCycle = profile ? calculateInvoiceCycle(profile.invoice_closing_day, previousMonthDate) : null;
  const previousCycleRange = previousCycle ? { from: previousCycle.startDate, to: previousCycle.endDate } : null;

  // Buscar transações dos períodos - com fallback seguro
  const fallbackRange = { from: new Date(), to: new Date() };
  
  const { data: currentTransactions = [] } = useTransactions(
    currentCycleRange || fallbackRange, 
    false, // Incluir créditos e débitos
    false
  );
  
  const { data: previousTransactions = [] } = useTransactions(
    previousCycleRange || fallbackRange, 
    false,
    false
  );

  const metrics = useMemo(() => {
    console.log('[METRICS] Calculating metrics...');

    // Usar EXATAMENTE a mesma lógica da tabela de transações + filtro de pagamentos neutros
    const totalCurrentDebits = currentTransactions
      .filter(t => !t.is_credit && shouldIncludeInTotals(t))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalCurrentCredits = currentTransactions
      .filter(t => t.is_credit && shouldIncludeInTotals(t))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const currentBalance = totalCurrentCredits - totalCurrentDebits;

    // Métricas do ciclo anterior - mesma lógica
    const totalPreviousDebits = previousTransactions
      .filter(t => !t.is_credit && shouldIncludeInTotals(t))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalPreviousCredits = previousTransactions
      .filter(t => t.is_credit && shouldIncludeInTotals(t))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Calcular variações percentuais
    const debitVariation = totalPreviousDebits > 0 ? 
      ((totalCurrentDebits - totalPreviousDebits) / totalPreviousDebits) * 100 : 0;
    
    const creditVariation = totalPreviousCredits > 0 ? 
      ((totalCurrentCredits - totalPreviousCredits) / totalPreviousCredits) * 100 : 0;

    const hasCurrentData = currentTransactions.length > 0;
    const hasPreviousData = previousTransactions.length > 0;

    return {
      totalDebits: totalCurrentDebits,
      totalCredits: totalCurrentCredits,
      balance: currentBalance,
      
      previousTotalDebits: totalPreviousDebits,
      previousTotalCredits: totalPreviousCredits,
      
      debitVariation,
      creditVariation,
      
      currentCycleName: currentCycle?.displayName || 'Mês Atual',
      previousCycleName: previousCycle?.displayName || 'Mês Anterior',
      
      hasCurrentData,
      hasPreviousData,
    };
  }, [currentTransactions, previousTransactions, currentCycle, previousCycle]);

  return metrics;
};
