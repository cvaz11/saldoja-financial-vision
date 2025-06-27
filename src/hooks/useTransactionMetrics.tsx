
import { useUserProfile } from "./useUserProfile";
import { useTransactions } from "./useTransactions";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
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
    // Verificar se realmente há transações
    const hasCurrentTransactions = currentTransactions.length > 0;
    const hasPreviousTransactions = previousTransactions.length > 0;

    if (!hasCurrentTransactions) {
      return {
        totalDebits: 0,
        totalCredits: 0,
        totalInstallments: 0,
        balance: 0,
        previousTotalDebits: 0,
        previousTotalCredits: 0,
        previousTotalInstallments: 0,
        debitVariation: 0,
        creditVariation: 0,
        installmentVariation: 0,
        currentCycleName: currentCycle?.displayName || 'Mês Atual',
        previousCycleName: previousCycle?.displayName || 'Mês Anterior',
        nextTotalInstallments: 0,
        totalAllInstallments: 0,
        nextCycleName: 'Próximo Mês',
        hasCurrentData: false,
        hasPreviousData: hasPreviousTransactions,
      };
    }

    // Métricas do ciclo atual - apenas valores reais
    const currentDebits = currentTransactions.filter(t => !t.is_credit);
    const currentCredits = currentTransactions.filter(t => t.is_credit);
    const currentInstallments = currentTransactions.filter(t => t.installment_number && t.installment_total);
    
    const totalCurrentDebits = currentDebits.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalCurrentCredits = currentCredits.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalCurrentInstallments = currentInstallments.reduce((sum, t) => sum + Number(t.amount), 0);
    const currentBalance = totalCurrentCredits - totalCurrentDebits;
    
    // Métricas do ciclo anterior
    const previousDebits = previousTransactions.filter(t => !t.is_credit);
    const previousCredits = previousTransactions.filter(t => t.is_credit);
    const previousInstallments = previousTransactions.filter(t => t.installment_number && t.installment_total);
    
    const totalPreviousDebits = previousDebits.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPreviousCredits = previousCredits.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPreviousInstallments = previousInstallments.reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Calcular variações percentuais - apenas se houver dados anteriores
    const debitVariation = totalPreviousDebits > 0 ? 
      ((totalCurrentDebits - totalPreviousDebits) / totalPreviousDebits) * 100 : 0;
    
    const creditVariation = totalPreviousCredits > 0 ? 
      ((totalCurrentCredits - totalPreviousCredits) / totalPreviousCredits) * 100 : 0;
    
    const installmentVariation = totalPreviousInstallments > 0 ? 
      ((totalCurrentInstallments - totalPreviousInstallments) / totalPreviousInstallments) * 100 : 0;

    return {
      totalDebits: totalCurrentDebits,
      totalCredits: totalCurrentCredits,
      totalInstallments: totalCurrentInstallments,
      balance: currentBalance,
      
      previousTotalDebits: totalPreviousDebits,
      previousTotalCredits: totalPreviousCredits,
      previousTotalInstallments: totalPreviousInstallments,
      
      debitVariation,
      creditVariation,
      installmentVariation,
      
      currentCycleName: currentCycle?.displayName || 'Mês Atual',
      previousCycleName: previousCycle?.displayName || 'Mês Anterior',
      
      nextTotalInstallments: 0,
      totalAllInstallments: totalCurrentInstallments,
      nextCycleName: 'Próximo Mês',
      
      hasCurrentData: hasCurrentTransactions,
      hasPreviousData: hasPreviousTransactions,
    };
  }, [currentTransactions, previousTransactions, currentCycle, previousCycle]);

  return metrics;
};
