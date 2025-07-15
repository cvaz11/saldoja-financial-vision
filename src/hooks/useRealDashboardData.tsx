import { useUserProfile } from "@/hooks/useUserProfile";
import { useInvoiceTransactions } from "@/hooks/useInvoiceTransactions";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
import { useInstallmentTransactions } from "@/hooks/useInstallmentTransactions";
import { useMemo } from "react";

export const useRealDashboardData = (selectedMonth?: number, selectedYear?: number) => {
  const { profile } = useUserProfile();
  
  // PERÍODO FIXO - maio 2025 - usar exatamente como nas Movimentações
  const { data: transactions, isLoading } = useInvoiceTransactions({
    month: 5,
    year: 2025,
    selectedStatements: [] // Usar todos os statements
  });
  
  // Debug
  console.log('[DASHBOARD] Transações encontradas:', transactions?.length);
  console.log('[DASHBOARD] Loading:', isLoading);
  
  // Calcular ciclo para maio 2025
  const currentCycle = profile ? 
    calculateInvoiceCycle(profile.invoice_closing_day, new Date(2025, 4)) : null;
    
  const currentCycleRange = currentCycle ? { from: currentCycle.startDate, to: currentCycle.endDate } : null;
  
  // Próximo período (junho 2025)
  const nextCycle = profile ? 
    calculateInvoiceCycle(profile.invoice_closing_day, new Date(2025, 5)) : null;
  
  // Dados reais usando as mesmas transações das Movimentações
  const fallbackRange = { from: new Date(), to: new Date() };
  
  // Parcelas do período atual - passar apenas 5 (maio)
  const { data: currentInstallments = [] } = useInstallmentTransactions(5);
  
  // Parcelas do próximo período - passar apenas 6 (junho)  
  const { data: nextInstallments = [] } = useInstallmentTransactions(6);
  
  // Todas as parcelas pendentes - passar mês atual para frente
  const { data: allPendingInstallments = [] } = useInstallmentTransactions(5);

  // CALCULAR TOTAIS USANDO AS MESMAS TRANSAÇÕES DAS MOVIMENTAÇÕES
  const calculatedData = useMemo(() => {
    if (!transactions) {
      console.log('[DASHBOARD] Sem transações, retornando zeros');
      return {
        totalExpenses: 0,
        totalIncomes: 0,
        monthResult: 0,
        hasData: false,
        categoryData: [],
        hasCategories: false,
        bankData: [],
        hasBanks: false,
        monthlyData: [],
        hasMonthlyData: false
      };
    }

    console.log('[DASHBOARD] Calculando com', transactions.length, 'transações');
    
    // Filtrar e calcular exatamente como nas Movimentações
    const expenses = transactions.filter(t => !t.is_credit && t.amount > 0);
    const incomes = transactions.filter(t => t.is_credit && t.amount > 0);
    
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalIncomes = incomes.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const monthResult = totalIncomes - totalExpenses;
    
    console.log('[DASHBOARD] Despesas:', expenses.length, 'transações =', totalExpenses);
    console.log('[DASHBOARD] Receitas:', incomes.length, 'transações =', totalIncomes);
    console.log('[DASHBOARD] Resultado:', monthResult);
    
    // Dados para gráficos
    const categoryData = expenses.reduce((acc: any[], transaction) => {
      const category = transaction.category || 'Sem categoria';
      const existing = acc.find(item => item.category === category);
      
      if (existing) {
        existing.amount += transaction.amount;
      } else {
        acc.push({
          category,
          amount: transaction.amount,
          count: 1
        });
      }
      
      return acc;
    }, []).sort((a, b) => b.amount - a.amount);

    const bankData = expenses.reduce((acc: any[], transaction) => {
      // Extrair banco do statement_id ou usar 'Não identificado'
      const bank = 'Nubank'; // Por enquanto fixo, pode ser melhorado
      const existing = acc.find(item => item.bank === bank);
      
      if (existing) {
        existing.amount += transaction.amount;
      } else {
        acc.push({
          bank,
          amount: transaction.amount,
          count: 1
        });
      }
      
      return acc;
    }, []);

    const monthlyData = [
      {
        month: 'Mai 2025',
        receitas: totalIncomes,
        despesas: totalExpenses,
        resultado: monthResult
      }
    ];
    
    return {
      totalExpenses,
      totalIncomes,
      monthResult,
      hasData: transactions.length > 0,
      categoryData,
      hasCategories: categoryData.length > 0,
      bankData,
      hasBanks: bankData.length > 0,
      monthlyData,
      hasMonthlyData: monthlyData.length > 0
    };
  }, [transactions]);

  // Calcular parcelas
  const currentMonthInstallments = currentInstallments.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const nextMonthInstallments = nextInstallments.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalPendingInstallments = allPendingInstallments.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    ...calculatedData,
    currentMonthInstallments,
    nextMonthInstallments, 
    totalPendingInstallments,
    currentPeriodName: 'Maio 2025'
  };
};