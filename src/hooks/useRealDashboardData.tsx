import { useUserProfile } from "@/hooks/useUserProfile";
import { useInvoiceTransactions } from "@/hooks/useInvoiceTransactions";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
import { useInstallmentTransactions } from "@/hooks/useInstallmentTransactions";
import { useStatementRange } from "@/hooks/useStatementRange";
import { useMemo } from "react";

export const useRealDashboardData = (selectedMonth?: number, selectedYear?: number) => {
  const { profile } = useUserProfile();
  const { data: statementRange } = useStatementRange();
  
  // Usar mês/ano selecionado ou maio 2025 como fallback
  const targetMonth = selectedMonth || 5;
  const targetYear = selectedYear || 2025;
  
  // Buscar transações do mês/ano selecionado
  const { data: transactions, isLoading } = useInvoiceTransactions({
    month: targetMonth,
    year: targetYear,
    selectedStatements: [] // Usar todos os statements do mês
  });
  
  // Debug com informações dinâmicas
  if (import.meta.env.DEV) {
    console.log('[DASHBOARD] Mês selecionado:', targetMonth, targetYear);
    console.log('[DASHBOARD] Range de extratos:', statementRange);
    console.log('[DASHBOARD] Transações encontradas:', transactions?.length);
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
  
  // Calcular parcelas futuras dinamicamente
  const totalPendingInstallments = useMemo(() => {
    if (!transactions || !statementRange) return 0;
    
    // Buscar todas as parcelas que são depois do próximo mês
    const afterNextMonth = nextMonth === 12 ? 1 : nextMonth + 1;
    const afterNextYear = nextMonth === 12 ? nextYear + 1 : nextYear;
    
    // Para calcular futuras, precisamos somar todas as parcelas de meses posteriores
    // que ainda não foram processadas (sem statement_id)
    const futureInstallments = transactions.filter(t => 
      t.installment_number && 
      !t.statement_id && 
      (
        (t.transaction_date && new Date(t.transaction_date) > new Date(afterNextYear, afterNextMonth - 1)) ||
        // Ou parcelas que sabemos que são futuras pelo installment_number
        (t.installment_total && t.installment_number && t.installment_number > 2)
      )
    );
    
    const totalFuture = futureInstallments.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    if (import.meta.env.DEV) {
      console.log('[DASHBOARD] Parcelas futuras calculadas:', futureInstallments.length, 'valor:', totalFuture);
    }
    
    return totalFuture;
  }, [transactions, statementRange, nextMonth, nextYear]);
  
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