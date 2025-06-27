
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
    // Métricas do ciclo atual
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
    
    // Calcular variações percentuais
    const debitVariation = totalPreviousDebits > 0 ? 
      ((totalCurrentDebits - totalPreviousDebits) / totalPreviousDebits) * 100 : 0;
    
    const creditVariation = totalPreviousCredits > 0 ? 
      ((totalCurrentCredits - totalPreviousCredits) / totalPreviousCredits) * 100 : 0;
    
    const installmentVariation = totalPreviousInstallments > 0 ? 
      ((totalCurrentInstallments - totalPreviousInstallments) / totalPreviousInstallments) * 100 : 0;

    return {
      // Ciclo atual
      totalDebits: totalCurrentDebits,
      totalCredits: totalCurrentCredits,
      totalInstallments: totalCurrentInstallments,
      balance: currentBalance,
      
      // Ciclo anterior (para comparação)
      previousTotalDebits: totalPreviousDebits,
      previousTotalCredits: totalPreviousCredits,
      previousTotalInstallments: totalPreviousInstallments,
      
      // Variações
      debitVariation,
      creditVariation,
      installmentVariation,
      
      // Metadados
      currentCycleName: currentCycle?.displayName || 'Mês Atual',
      previousCycleName: previousCycle?.displayName || 'Mês Anterior',
      
      // Simplificado
      nextTotalInstallments: 0,
      totalAllInstallments: totalCurrentInstallments,
      nextCycleName: 'Próximo Mês',
    };
  }, [currentTransactions, previousTransactions, currentCycle, previousCycle]);

  return metrics;
};
