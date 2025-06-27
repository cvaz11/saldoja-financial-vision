
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
    console.log('[METRICS] Raw current transactions:', currentTransactions);
    console.log('[METRICS] Raw previous transactions:', previousTransactions);

    // Usar EXATAMENTE a mesma lógica da tabela de transações
    const totalCurrentDebits = currentTransactions
      .filter(t => !t.is_credit)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalCurrentCredits = currentTransactions
      .filter(t => t.is_credit)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const currentInstallments = currentTransactions.filter(t => t.installment_number && t.installment_total);
    const totalCurrentInstallments = currentInstallments.reduce((sum, t) => sum + Number(t.amount), 0);
    
    const currentBalance = totalCurrentCredits - totalCurrentDebits;
    
    console.log('[METRICS] Using table logic - Current debits:', totalCurrentDebits);
    console.log('[METRICS] Using table logic - Current credits:', totalCurrentCredits);
    console.log('[METRICS] Using table logic - Current balance:', currentBalance);

    // Métricas do ciclo anterior - mesma lógica
    const totalPreviousDebits = previousTransactions
      .filter(t => !t.is_credit)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalPreviousCredits = previousTransactions
      .filter(t => t.is_credit)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const previousInstallments = previousTransactions.filter(t => t.installment_number && t.installment_total);
    const totalPreviousInstallments = previousInstallments.reduce((sum, t) => sum + Number(t.amount), 0);
    
    console.log('[METRICS] Using table logic - Previous debits:', totalPreviousDebits);
    console.log('[METRICS] Using table logic - Previous credits:', totalPreviousCredits);
    
    // Calcular variações percentuais
    const debitVariation = totalPreviousDebits > 0 ? 
      ((totalCurrentDebits - totalPreviousDebits) / totalPreviousDebits) * 100 : 0;
    
    const creditVariation = totalPreviousCredits > 0 ? 
      ((totalCurrentCredits - totalPreviousCredits) / totalPreviousCredits) * 100 : 0;
    
    const installmentVariation = totalPreviousInstallments > 0 ? 
      ((totalCurrentInstallments - totalPreviousInstallments) / totalPreviousInstallments) * 100 : 0;

    const hasCurrentData = currentTransactions.length > 0;
    const hasPreviousData = previousTransactions.length > 0;

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
      
      hasCurrentData,
      hasPreviousData,
    };
  }, [currentTransactions, previousTransactions, currentCycle, previousCycle]);

  return metrics;
};
