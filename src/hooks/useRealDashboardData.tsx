import { useMemo } from "react";
import { useTransactions } from "./useTransactions";
import { useInstallmentTransactions } from "./useInstallmentTransactions";
import { useUserProfile } from "./useUserProfile";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";

export const useRealDashboardData = (selectedMonth?: number, selectedYear?: number) => {
  const { profile } = useUserProfile();
  
  // Se mês/ano específicos são fornecidos, usar eles; senão usar o período atual
  const currentCycle = profile && selectedMonth && selectedYear ? 
    calculateInvoiceCycle(profile.invoice_closing_day, new Date(selectedYear, selectedMonth - 1)) :
    profile ? calculateInvoiceCycle(profile.invoice_closing_day) : null;
    
  const currentCycleRange = currentCycle ? { from: currentCycle.startDate, to: currentCycle.endDate } : null;
  
  // Próximo período
  const nextMonthDate = new Date();
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextCycle = profile ? calculateInvoiceCycle(profile.invoice_closing_day, nextMonthDate) : null;
  
  // Dados reais
  const fallbackRange = { from: new Date(), to: new Date() };
  const { data: currentTransactions = [] } = useTransactions(
    currentCycleRange || fallbackRange, 
    false, // Incluir créditos e débitos
    false
  );

  // Dados de parcelas
  const { data: currentInstallments = [] } = useInstallmentTransactions(
    currentCycle?.startDate.getMonth() + 1,
    currentCycle?.startDate.getFullYear()
  );

  const { data: nextInstallments = [] } = useInstallmentTransactions(
    nextCycle?.startDate.getMonth() + 1,
    nextCycle?.startDate.getFullYear()
  );

  const metrics = useMemo(() => {
    console.log('[DASHBOARD] Processing transactions:', currentTransactions.length);
    console.log('[DASHBOARD] Sample transactions:', currentTransactions.slice(0, 3));
    
    // USAR EXATAMENTE A MESMA LÓGICA DA ABA MOVIMENTAÇÕES (TransactionTableFooter)
    // Débitos = !is_credit (despesas)
    // Créditos = is_credit (receitas) 
    const totalDebits = currentTransactions
      .filter(t => !t.is_credit)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalCredits = currentTransactions
      .filter(t => t.is_credit)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Resultado = receitas - despesas (igual ao saldo do footer)
    const balance = totalCredits - totalDebits;

    console.log('[DASHBOARD] Debits (Despesas):', totalDebits, 'Credits (Receitas):', totalCredits, 'Balance:', balance);

    // Parcelas executadas no mês atual (transações com installment_number)
    const currentMonthInstallments = currentTransactions
      .filter(t => t.installment_number && !t.is_credit)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Parcelas do próximo mês (projetadas)
    const nextMonthInstallments = nextInstallments
      .filter(t => t.is_projected)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Total de parcelas pendentes (futuras, não executadas ainda)
    const totalPendingInstallments = nextInstallments
      .filter(t => t.is_projected)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Dados por categoria (apenas despesas - débitos)
    const categoryData: { [key: string]: number } = {};
    currentTransactions
      .filter(t => !t.is_credit) // Só despesas
      .forEach(transaction => {
        const category = transaction.category || 'Sem categoria';
        categoryData[category] = (categoryData[category] || 0) + Number(transaction.amount);
      });

    const realCategoryData = Object.entries(categoryData)
      .map(([category, value]) => ({
        category,
        value,
        label: `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        color: getCategoryColor(category)
      }))
      .sort((a, b) => b.value - a.value);

    // Dados por banco - extrair de statements reais ou usar dados dinâmicos
    const bankData: { [key: string]: number } = {};
    
    // Primeiro, tentar agrupar por statement_id para pegar banco real
    const expenseTransactions = currentTransactions.filter(t => !t.is_credit);
    const statementGroups: { [key: string]: number } = {};
    
    expenseTransactions.forEach(transaction => {
      if (transaction.statement_id) {
        statementGroups[transaction.statement_id] = 
          (statementGroups[transaction.statement_id] || 0) + Number(transaction.amount);
      }
    });

    // Se temos statements, assumir banco baseado no contexto
    // Se não, usar "Sem banco" para transações manuais
    if (Object.keys(statementGroups).length === 0 && expenseTransactions.length > 0) {
      // Transações sem statement = transações manuais
      bankData['Transações Manuais'] = totalDebits;
    } else {
      // Com statements, assumir Nubank (expandir futuramente com dados reais de banco)
      Object.values(statementGroups).forEach(amount => {
        bankData['Nubank'] = (bankData['Nubank'] || 0) + amount;
      });
      
      // Adicionar transações manuais se existirem
      const manualTransactions = expenseTransactions.filter(t => !t.statement_id);
      if (manualTransactions.length > 0) {
        const manualTotal = manualTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        bankData['Transações Manuais'] = manualTotal;
      }
    }

    const realBankData = Object.entries(bankData).map(([bank, amount]) => ({
      name: bank,
      value: totalDebits > 0 ? Math.round((amount / totalDebits) * 100) : 0,
      amount,
      color: getBankColor(bank)
    }));

    // Dados de fluxo de caixa - usar o mês da transação, não do ciclo
    const monthlyData: { [key: string]: { receitas: number; despesas: number } } = {};
    
    if (currentTransactions.length > 0) {
      // Pegar o mês das transações reais
      const transactionDate = new Date(currentTransactions[0].transaction_date);
      const monthName = transactionDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      
      monthlyData[monthName] = {
        receitas: totalCredits,
        despesas: totalDebits
      };
    }

    const realMonthlyData = Object.entries(monthlyData).map(([mes, data]) => ({
      mes,
      receitas: data.receitas,
      despesas: data.despesas
    }));

    console.log('[DASHBOARD] Final metrics (same as TransactionTableFooter):', {
      totalDebits,
      totalCredits,
      balance,
      categoriesCount: realCategoryData.length,
      banksCount: realBankData.length,
      transactionsCount: currentTransactions.length
    });

    return {
      // Cards de resumo (usando mesmos nomes que TransactionTableFooter)
      totalExpenses: totalDebits,
      totalIncomes: totalCredits,
      monthResult: balance,
      currentMonthInstallments,
      nextMonthInstallments,
      totalPendingInstallments,
      
      // Dados para gráficos
      categoryData: realCategoryData,
      bankData: realBankData,
      monthlyData: realMonthlyData,
      
      // Estados
      hasData: currentTransactions.length > 0,
      hasCategories: realCategoryData.length > 0,
      hasBanks: realBankData.length > 0,
      hasMonthlyData: realMonthlyData.length > 0,
      
      // Período atual
      currentPeriodName: currentCycle?.displayName || 'Período Atual'
    };
  }, [currentTransactions, currentInstallments, nextInstallments, currentCycle]);

  return metrics;
};

// Cores para categorias
const getCategoryColor = (category: string) => {
  const colors = [
    '#A7BFAC', // Verde sage
    '#8ba290', // Verde médio
    '#6d8471', // Verde escuro
    '#DDD5CC', // Bege
    '#c5bdb4', // Bege escuro
    '#9d9085', // Marrom claro
  ];
  
  const hash = category.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Cores para bancos
const getBankColor = (bank: string) => {
  const bankColors: { [key: string]: string } = {
    'Nubank': '#8A05BE',
    'Itaú': '#EC7000',
    'Bradesco': '#CC092F',
    'Santander': '#E50000',
    'Banco do Brasil': '#FDF200',
    'Caixa': '#0066CC',
    'Transações Manuais': '#6d8471'
  };
  
  return bankColors[bank] || '#A7BFAC';
};