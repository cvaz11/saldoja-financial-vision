
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

  // Próximo ciclo
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextCycle = profile ? calculateInvoiceCycle(profile.invoice_closing_day, nextMonthDate) : null;
  const nextCycleRange = nextCycle ? { from: nextCycle.startDate, to: nextCycle.endDate } : null;

  // Fallback para ranges válidos se não houver perfil
  const safeCurrentRange = currentCycleRange || { from: new Date(), to: new Date() };
  const safePreviousRange = previousCycleRange || { from: new Date(), to: new Date() };
  const safeNextRange = nextCycleRange || { from: new Date(), to: new Date() };

  // Buscar transações dos períodos
  const { data: currentTransactions = [], isLoading: currentLoading } = useTransactions(
    safeCurrentRange, 
    false, // Incluir créditos e débitos
    false
  );
  
  const { data: previousTransactions = [], isLoading: previousLoading } = useTransactions(
    safePreviousRange, 
    false,
    false
  );

  const { data: nextTransactions = [], isLoading: nextLoading } = useTransactions(
    safeNextRange, 
    true, // Apenas débitos para próximo mês
    false
  );

  const metrics = useMemo(() => {
    // Se ainda está carregando, retornar valores zerados
    if (currentLoading || previousLoading || nextLoading) {
      return {
        totalDebits: 0,
        totalCredits: 0,
        totalInstallments: 0,
        balance: 0,
        previousTotalDebits: 0,
        previousTotalCredits: 0,
        previousTotalInstallments: 0,
        nextTotalInstallments: 0,
        debitVariation: 0,
        creditVariation: 0,
        installmentVariation: 0,
        totalAllInstallments: 0,
        currentCycleName: 'Mês Atual',
        previousCycleName: 'Mês Anterior',
        nextCycleName: 'Próximo Mês',
        isLoading: true,
      };
    }

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
    
    // Métricas do próximo ciclo (parcelas futuras)
    const totalNextInstallments = nextTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    
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
      
      // Próximo ciclo
      nextTotalInstallments: totalNextInstallments,
      
      // Variações
      debitVariation,
      creditVariation,
      installmentVariation,
      
      // Totais de parcelas (todas as transações parceladas)
      totalAllInstallments: totalCurrentInstallments + totalNextInstallments,
      
      // Metadados
      currentCycleName: currentCycle?.displayName || 'Mês Atual',
      previousCycleName: previousCycle?.displayName || 'Mês Anterior',
      nextCycleName: nextCycle?.displayName || 'Próximo Mês',
      isLoading: false,
    };
  }, [currentTransactions, previousTransactions, nextTransactions, currentCycle, previousCycle, nextCycle, currentLoading, previousLoading, nextLoading]);

  return metrics;
};
