import { useUserProfile } from "@/hooks/useUserProfile";
import { useInvoiceTransactions } from "@/hooks/useInvoiceTransactions";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
import { useInstallmentTransactions } from "@/hooks/useInstallmentTransactions";
import { useStatementRange } from "@/hooks/useStatementRange";
import { useStatementNavigationRange } from "@/hooks/useStatementNavigationRange";
import { filterTransactionsByCompetency, calculateCompetencyMonth } from "@/lib/invoice-competency";
import { useMemo } from "react";

export const useRealDashboardData = (selectedMonth?: number, selectedYear?: number) => {
  const { profile } = useUserProfile();
  const { data: statementRange } = useStatementRange();
  const { data: navigationRange } = useStatementNavigationRange();
  
  // Usar mês/ano selecionado ou maio 2025 como fallback
  const targetMonth = selectedMonth || 5;
  const targetYear = selectedYear || 2025;
  
  // Dia de fechamento da fatura do perfil
  const closingDay = profile?.invoice_closing_day || 5;
  
  // Buscar TODAS as transações para poder filtrar por competência
  const { data: allTransactions, isLoading } = useInvoiceTransactions({
    month: targetMonth,
    year: targetYear,
    selectedStatements: [] // Usar todos os statements do mês
  });
  
  // Filtrar transações por competência usando o dia de fechamento
  const transactions = useMemo(() => {
    if (!allTransactions || !profile) return [];
    return filterTransactionsByCompetency(allTransactions, targetMonth, targetYear, closingDay);
  }, [allTransactions, targetMonth, targetYear, closingDay, profile]);

  // Debug com informações dinâmicas
  if (import.meta.env.DEV) {
    console.log('[DASHBOARD] Mês selecionado:', targetMonth, targetYear);
    console.log('[DASHBOARD] Dia de fechamento:', closingDay);
    console.log('[DASHBOARD] Range de extratos:', statementRange);
    console.log('[DASHBOARD] Todas as transações:', allTransactions?.length);
    console.log('[DASHBOARD] Transações por competência:', transactions?.length);
    console.log('[DASHBOARD] Loading:', isLoading);
  }
  
  // Próximo mês para cálculo de parcelas
  const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
  const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
  
  // Buscar TODAS as parcelas e filtrar por competência
  const { data: allCurrentInstallments = [] } = useInstallmentTransactions(targetMonth, targetYear);
  const { data: allNextInstallments = [] } = useInstallmentTransactions(nextMonth, nextYear);
  
  // Filtrar parcelas por competência
  const currentInstallments = useMemo(() => {
    if (!allCurrentInstallments || !profile) return [];
    return filterTransactionsByCompetency(allCurrentInstallments, targetMonth, targetYear, closingDay);
  }, [allCurrentInstallments, targetMonth, targetYear, closingDay, profile]);
  
  const nextInstallments = useMemo(() => {
    if (!allNextInstallments || !profile) return [];
    return filterTransactionsByCompetency(allNextInstallments, nextMonth, nextYear, closingDay);
  }, [allNextInstallments, nextMonth, nextYear, closingDay, profile]);
  
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
    
    // Filtrar e calcular exatamente como nas Movimentações
    const expenses = transactions.filter(t => !t.is_credit && t.amount > 0);
    const incomes = transactions.filter(t => t.is_credit && t.amount > 0);
    
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
  
  // Calcular parcelas futuras dinamicamente (M+1 em diante) por competência
  const totalPendingInstallments = useMemo(() => {
    if (!allTransactions || !statementRange || !profile) return 0;
    
    // Buscar todas as parcelas pendentes (sem statement_id)
    const pendingInstallments = allTransactions.filter(t => {
      return t.installment_number && !t.statement_id;
    });
    
    // Filtrar por competência: a partir do próximo mês (M+1)
    const futureInstallments = pendingInstallments.filter(t => {
      const competency = calculateCompetencyMonth(t.transaction_date, closingDay);
      
      // Verificar se a competência é a partir do próximo mês
      if (competency.year > targetYear) return true;
      if (competency.year === targetYear && competency.month > targetMonth) return true;
      
      return false;
    });
    
    const totalFuture = futureInstallments.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    if (import.meta.env.DEV) {
      const competencies = futureInstallments.map(t => calculateCompetencyMonth(t.transaction_date, closingDay));
      const firstComp = competencies.length > 0 ? 
        Math.min(...competencies.map(c => c.year * 12 + c.month)) : nextYear * 12 + nextMonth;
      const lastComp = competencies.length > 0 ? 
        Math.max(...competencies.map(c => c.year * 12 + c.month)) : nextYear * 12 + nextMonth;
      
      console.log('[DASHBOARD] Parcelas futuras (M+1 em diante por competência):', {
        mesSelecionado: `${targetMonth}/${targetYear}`,
        corteDe: `${nextMonth}/${nextYear}`,
        diaFechamento: closingDay,
        parcelasEncontradas: futureInstallments.length,
        valorTotal: totalFuture,
        intervaloCompetencia: `${Math.floor(firstComp / 12)}/${(firstComp % 12) || 12} a ${Math.floor(lastComp / 12)}/${(lastComp % 12) || 12}`
      });
    }
    
    return totalFuture;
  }, [allTransactions, statementRange, nextMonth, nextYear, targetMonth, targetYear, closingDay, profile]);
  
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

  // Debug info temporário
  if (import.meta.env.DEV) {
    console.log('[DASHBOARD] RANGES:', {
      navegacao: navigationRange ? `${navigationRange.firstMonth}/${navigationRange.firstYear} - ${navigationRange.lastMonth}/${navigationRange.lastYear}` : null,
      competencia: statementRange ? `${statementRange.firstMonth}/${statementRange.firstYear} - ${statementRange.lastMonth}/${statementRange.lastYear}` : null
    });
  }

  return {
    ...calculatedData,
    currentMonthInstallments,
    nextMonthInstallments, 
    totalPendingInstallments,
    currentPeriodName,
    statementRange,
    navigationRange
  };
};