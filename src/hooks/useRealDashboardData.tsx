import { useMemo } from "react";
import { useTransactions } from "./useTransactions";
import { useInstallmentTransactions } from "./useInstallmentTransactions";
import { useUserProfile } from "./useUserProfile";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";

export const useRealDashboardData = () => {
  const { profile } = useUserProfile();
  
  // Período atual
  const currentCycle = profile ? calculateInvoiceCycle(profile.invoice_closing_day) : null;
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
    // Separar receitas e despesas
    const expenses = currentTransactions.filter(t => !t.is_credit);
    const incomes = currentTransactions.filter(t => t.is_credit);
    
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalIncomes = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
    const monthResult = totalIncomes - totalExpenses;

    // Parcelas do mês atual
    const currentMonthInstallments = currentInstallments
      .filter(t => !t.is_projected)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Parcelas do próximo mês
    const nextMonthInstallments = nextInstallments
      .filter(t => !t.is_projected)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Total de parcelas pendentes (todas não pagas)
    const totalPendingInstallments = currentInstallments
      .filter(t => t.is_projected)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Dados por categoria (apenas categorias reais)
    const categoryData: { [key: string]: number } = {};
    expenses.forEach(transaction => {
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

    // Dados por banco (apenas bancos reais)
    const bankData: { [key: string]: number } = {};
    currentTransactions.forEach(transaction => {
      // Inferir banco a partir do statement ou usar 'Não identificado'
      const bank = 'Nubank'; // Por enquanto, assumindo Nubank baseado no contexto
      bankData[bank] = (bankData[bank] || 0) + Number(transaction.amount);
    });

    const realBankData = Object.entries(bankData).map(([bank, amount]) => ({
      name: bank,
      value: Object.keys(bankData).length === 1 ? 100 : 0, // Se só um banco, 100%
      amount,
      color: getBankColor(bank)
    }));

    // Dados de fluxo de caixa (apenas meses com dados)
    const monthlyData: { [key: string]: { receitas: number; despesas: number } } = {};
    
    // Por enquanto, apenas o mês atual
    const currentMonth = currentCycle?.startDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    monthlyData[currentMonth || 'Mai'] = {
      receitas: totalIncomes,
      despesas: totalExpenses
    };

    const realMonthlyData = Object.entries(monthlyData).map(([mes, data]) => ({
      mes,
      receitas: data.receitas,
      despesas: data.despesas
    }));

    return {
      // Cards de resumo
      totalExpenses,
      totalIncomes,
      monthResult,
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
    'Caixa': '#0066CC'
  };
  
  return bankColors[bank] || '#A7BFAC';
};