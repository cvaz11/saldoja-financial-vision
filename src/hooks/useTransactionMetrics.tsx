
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
    // Verificar se realmente há transações - só conta se tem dados válidos
    const hasCurrentTransactions = currentTransactions && currentTransactions.length > 0;
    const hasPreviousTransactions = previousTransactions && previousTransactions.length > 0;

    console.log('[METRICS] Current transactions:', currentTransactions?.length || 0);
    console.log('[METRICS] Previous transactions:', previousTransactions?.length || 0);
    console.log('[METRICS] Has current data:', hasCurrentTransactions);
    console.log('[METRICS] Has previous data:', hasPreviousTransactions);

    // Se não há transações atuais, retornar tudo zerado
    if (!hasCurrentTransactions || !currentTransactions || currentTransactions.length === 0) {
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

    // Filtrar e calcular apenas transações válidas
    const validCurrentTransactions = currentTransactions.filter(t => t && t.amount !== null && t.amount !== undefined);
    
    const currentDebits = validCurrentTransactions.filter(t => !t.is_credit);
    const currentCredits = validCurrentTransactions.filter(t => t.is_credit);
    const currentInstallments = validCurrentTransactions.filter(t => t.installment_number && t.installment_total);
    
    const totalCurrentDebits = currentDebits.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    const totalCurrentCredits = currentCredits.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    const totalCurrentInstallments = currentInstallments.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    const currentBalance = totalCurrentCredits - totalCurrentDebits;
    
    console.log('[METRICS] Calculated debits:', totalCurrentDebits);
    console.log('[METRICS] Calculated credits:', totalCurrentCredits);
    console.log('[METRICS] Calculated balance:', currentBalance);

    // Métricas do ciclo anterior - só calcular se há dados
    let totalPreviousDebits = 0;
    let totalPreviousCredits = 0;
    let totalPreviousInstallments = 0;
    
    if (hasPreviousTransactions && previousTransactions && previousTransactions.length > 0) {
      const validPreviousTransactions = previousTransactions.filter(t => t && t.amount !== null && t.amount !== undefined);
      
      const previousDebits = validPreviousTransactions.filter(t => !t.is_credit);
      const previousCredits = validPreviousTransactions.filter(t => t.is_credit);
      const previousInstallments = validPreviousTransactions.filter(t => t.installment_number && t.installment_total);
      
      totalPreviousDebits = previousDebits.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
      totalPreviousCredits = previousCredits.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
      totalPreviousInstallments = previousInstallments.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    }
    
    // Calcular variações percentuais - apenas se houver dados anteriores válidos
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
      
      hasCurrentData: true, // Só chega aqui se tem dados válidos
      hasPreviousData: hasPreviousTransactions,
    };
  }, [currentTransactions, previousTransactions, currentCycle, previousCycle]);

  return metrics;
};
