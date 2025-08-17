import { useUserProfile } from "@/hooks/useUserProfile";
import { useTransactionsByStatementCompetency } from "@/hooks/useStatementCompetency";
import { useInstallmentTransactions } from "@/hooks/useInstallmentTransactions";
import { useStatementRange } from "@/hooks/useStatementRange";
import { shouldIncludeInTotals } from "@/utils/paymentClassifier";
import { useMemo } from "react";

export const useRealDashboardData = (selectedMonth?: number, selectedYear?: number) => {
  const { profile } = useUserProfile();
  const { data: statementRange } = useStatementRange();
  
  // Usar mês/ano selecionado ou maio 2025 como fallback
  const targetMonth = selectedMonth || 5;
  const targetYear = selectedYear || 2025;
  
  // NEW LOGIC: Buscar transações baseado na competência de extratos
  const { data: transactions, isLoading } = useTransactionsByStatementCompetency(
    targetMonth, 
    targetYear
  );
  
  // Debug com informações dinâmicas
  if (import.meta.env.DEV) {
    console.log('[DASHBOARD] NEW LOGIC: Competência selecionada:', targetMonth, targetYear);
    console.log('[DASHBOARD] Range de extratos:', statementRange);
    console.log('[DASHBOARD] Transações por competência encontradas:', transactions?.length);
    console.log('[DASHBOARD] Loading:', isLoading);
  }
  
  // Próximo mês para cálculo de parcelas
  const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
  const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
  
  // Parcelas do período atual - mês dinâmico
  const { data: currentInstallments = [] } = useInstallmentTransactions(targetMonth, targetYear);
  
  // Parcelas do próximo período - mês dinâmico  
  const { data: nextInstallments = [] } = useInstallmentTransactions(nextMonth, nextYear);
  
  // Debug parcelas
  if (import.meta.env.DEV) {
    console.log(`[DASHBOARD] Parcelas atuais (${targetMonth}/${targetYear}):`, currentInstallments?.length, 'valor:', currentInstallments?.reduce((sum, t) => sum + Math.abs(t.amount), 0));
    console.log(`[DASHBOARD] Parcelas próximo mês (${nextMonth}/${nextYear}):`, nextInstallments?.length, 'valor:', nextInstallments?.reduce((sum, t) => sum + Math.abs(t.amount), 0));
  }

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
    
    // Filtrar e calcular exatamente como nas Movimentações + excluir pagamentos neutros
    const expenses = transactions.filter(t => !t.is_credit && t.amount > 0 && shouldIncludeInTotals(t));
    const incomes = transactions.filter(t => t.is_credit && t.amount > 0 && shouldIncludeInTotals(t));
    
    // Log para debug (apenas em dev)
    if (import.meta.env.DEV) {
      const neutralPayments = transactions.filter(t => !shouldIncludeInTotals(t));
      console.log(`[DASHBOARD] ${neutralPayments.length} pagamentos neutros excluídos dos totais`);
    }
    
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalIncomes = incomes.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const monthResult = totalIncomes - totalExpenses;
    
    console.log('[DASHBOARD] Despesas:', expenses.length, 'transações =', totalExpenses);
    console.log('[DASHBOARD] Receitas:', incomes.length, 'transações =', totalIncomes);
    console.log('[DASHBOARD] Resultado:', monthResult);
    
    // Dados para gráficos de categorias - formato correto para o component
    const categoryData = expenses.reduce((acc: any[], transaction) => {
      const category = transaction.category || 'Outros';
      const existing = acc.find(item => item.category === category);
      
      if (existing) {
        existing.amount += Math.abs(transaction.amount);
        existing.count += 1;
      } else {
        acc.push({
          category,
          amount: Math.abs(transaction.amount),
          count: 1
        });
      }
      
      return acc;
    }, []).sort((a, b) => b.amount - a.amount);

    // Dados para gráfico de bancos - formato correto para pie chart
    const bankData = [
      {
        name: 'Nubank',
        value: totalExpenses,
        color: '#8B5CF6'
      }
    ];
    
    console.log('[DASHBOARD] Category data:', categoryData);
    console.log('[DASHBOARD] Bank data:', bankData);

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

  // Calcular parcelas usando useInstallmentStats para futuras
  const currentMonthInstallments = currentInstallments.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const nextMonthInstallments = nextInstallments.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  // Calcular parcelas futuras dinamicamente (M+1 em diante)
  const totalPendingInstallments = useMemo(() => {
    if (!transactions || !statementRange) return 0;
    
    // Calcular o primeiro dia do próximo mês (M+1)
    const fromNextMonthDate = new Date(nextYear, nextMonth - 1, 1); // Primeiro dia de M+1
    
    // Buscar todas as parcelas pendentes (sem statement_id) a partir do próximo mês
    const futureInstallments = transactions.filter(t => {
      if (!shouldIncludeInTotals(t)) return false; // Excluir pagamentos neutros
      if (!t.installment_number || t.statement_id) return false;
      
      // Verificar se a data da transação é a partir do próximo mês (M+1)
      const transactionDate = new Date(t.transaction_date);
      return transactionDate >= fromNextMonthDate;
    });
    
    const totalFuture = futureInstallments.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    if (import.meta.env.DEV) {
      const firstMonth = futureInstallments.length > 0 ? 
        Math.min(...futureInstallments.map(t => new Date(t.transaction_date).getMonth() + 1)) : nextMonth;
      const lastMonth = futureInstallments.length > 0 ? 
        Math.max(...futureInstallments.map(t => new Date(t.transaction_date).getMonth() + 1)) : nextMonth;
      
      console.log('[DASHBOARD] Parcelas futuras (M+1 em diante):', {
        mesSelecionado: `${targetMonth}/${targetYear}`,
        corteDe: `${nextMonth}/${nextYear}`,
        parcelasEncontradas: futureInstallments.length,
        valorTotal: totalFuture,
        intervaloMeses: `${firstMonth}/${nextYear} a ${lastMonth}/${nextYear}`
      });
    }
    
    return totalFuture;
  }, [transactions, statementRange, nextMonth, nextYear, targetMonth, targetYear]);
  
  // Nome do período dinâmico
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const currentPeriodName = `${monthNames[targetMonth - 1]} ${targetYear}`;

  if (import.meta.env.DEV) {
    console.log('[DASHBOARD] Parcelas calculadas:', {
      atual: currentMonthInstallments,
      proximo: nextMonthInstallments,
      futuras: totalPendingInstallments,
      periodo: currentPeriodName
    });
  }

  return {
    ...calculatedData,
    currentMonthInstallments,
    nextMonthInstallments, 
    totalPendingInstallments,
    currentPeriodName,
    statementRange
  };
};