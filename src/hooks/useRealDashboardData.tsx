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
  
  // Parcelas do período atual - passar mês e ano (maio 2025)
  const { data: currentInstallments = [] } = useInstallmentTransactions(5, 2025);
  
  // Parcelas do próximo período - passar mês e ano (junho 2025)  
  const { data: nextInstallments = [] } = useInstallmentTransactions(6, 2025);
  
  // Todas as parcelas pendentes - passar mês e ano atual para frente
  const { data: allPendingInstallments = [] } = useInstallmentTransactions(5, 2025);
  
  // Debug parcelas
  console.log('[DASHBOARD] Parcelas atuais (maio):', currentInstallments?.length, 'valor:', currentInstallments?.reduce((sum, t) => sum + Math.abs(t.amount), 0));
  console.log('[DASHBOARD] Parcelas próximo mês (junho):', nextInstallments?.length, 'valor:', nextInstallments?.reduce((sum, t) => sum + Math.abs(t.amount), 0));

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
  
  // Calcular valor total das parcelas futuras (após período atual)
  const { data: allInstallmentTransactions = [] } = useInstallmentTransactions();
  const totalPendingInstallments = useMemo(() => {
    if (!allInstallmentTransactions.length) return 0;
    
    // Agrupar por installment_id e calcular parcelas restantes
    const installmentGroups = new Map<string, any[]>();
    
    allInstallmentTransactions.forEach(transaction => {
      const installmentId = transaction.installment_id || `auto_${transaction.description?.replace(/[^a-zA-Z0-9]/g, '_')}_${transaction.installment_total}`;
      
      if (!installmentGroups.has(installmentId)) {
        installmentGroups.set(installmentId, []);
      }
      installmentGroups.get(installmentId)!.push(transaction);
    });
    
    let futureAmount = 0;
    
    installmentGroups.forEach((groupTransactions) => {
      // Encontrar a parcela detectada no período atual (maio 2025)
      const currentInstallment = groupTransactions.find(t => t.statement_id);
      if (!currentInstallment) return;
      
      const totalParcelas = currentInstallment.installment_total;
      const parcelaAtual = currentInstallment.installment_number;
      const valorParcela = Math.abs(currentInstallment.amount);
      
      // Calcular parcelas futuras após o período atual
      // Se detectamos parcela 9/12 em maio, restam 3 parcelas (10, 11, 12)
      const parcelasRestantes = totalParcelas - parcelaAtual;
      
      if (parcelasRestantes > 0) {
        futureAmount += parcelasRestantes * valorParcela;
      }
    });
    
    console.log('[DASHBOARD] Valor de Parcelas Futuras calculado:', futureAmount);
    return futureAmount;
  }, [allInstallmentTransactions]);
  
  console.log('[DASHBOARD] Parcelas calculadas:', {
    atual: currentMonthInstallments,
    proximo: nextMonthInstallments,
    futuras: totalPendingInstallments
  });

  return {
    ...calculatedData,
    currentMonthInstallments,
    nextMonthInstallments, 
    totalPendingInstallments,
    currentPeriodName: 'Maio 2025'
  };
};