import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserProfile } from "./useUserProfile";
import { useStatementRange } from "./useStatementRange";
import { useStatementNavigationRange } from "./useStatementNavigationRange";
import { groupTransactionsByCompetency, getCompetencyRange } from "@/lib/invoice-competency";
import { useMemo } from "react";

export const useHistoricalCashFlow = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { data: statementRange } = useStatementRange();
  const { data: navigationRange } = useStatementNavigationRange();
  
  // Dia de fechamento da fatura do perfil
  const closingDay = profile?.invoice_closing_day || 5;

  return useQuery({
    queryKey: ['historical-cash-flow', user?.id, statementRange, closingDay],
    queryFn: async () => {
      if (!user || !navigationRange || !profile) return [];

      // Buscar todas as transações reais (com statement_id) do histórico completo
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('transaction_date, amount, is_credit')
        .eq('user_id', user.id)
        .not('statement_id', 'is', null) // Apenas transações reais
        .order('transaction_date', { ascending: true });

      if (error) {
        console.error('[HISTORICAL_CASH_FLOW] Error:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) return [];

      // Agrupar transações por competência usando o dia de fechamento
      const competencyGroups = groupTransactionsByCompetency(transactions, closingDay);
      
      // Calcular range de competências
      const competencyRange = getCompetencyRange(transactions, closingDay);
      
      if (!competencyRange) {
        console.log('[HISTORICAL_CASH_FLOW] No competency range found');
        return [];
      }

      // Criar array com todos os meses no intervalo dos extratos (navegação)
      const monthlyData: Record<string, { receitas: number; despesas: number }> = {};
      
      // Inicializar todos os meses no range de navegação com zeros
      let currentDate = new Date(navigationRange.firstYear, navigationRange.firstMonth - 1, 1);
      const lastDate = new Date(navigationRange.lastYear, navigationRange.lastMonth - 1, 1);
      
      while (currentDate <= lastDate) {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const key = `${month}/${year}`;
        
        monthlyData[key] = { receitas: 0, despesas: 0 };
        
        // Próximo mês
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Somar valores por competência
      Object.entries(competencyGroups).forEach(([monthKey, monthTransactions]) => {
        const [year, month] = monthKey.split('-');
        const key = `${parseInt(month)}/${year}`;
        
        if (monthlyData[key]) {
          monthTransactions.forEach(transaction => {
            if (transaction.is_credit) {
              monthlyData[key].receitas += Math.abs(transaction.amount);
            } else {
              monthlyData[key].despesas += Math.abs(transaction.amount);
            }
          });
        }
      });

      // Converter para array com formato do gráfico
      const chartData = [];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      currentDate = new Date(navigationRange.firstYear, navigationRange.firstMonth - 1, 1);
      
      while (currentDate <= lastDate) {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const key = `${month}/${year}`;
        const data = monthlyData[key];
        
        const shortYear = year.toString().slice(-2);
        
        chartData.push({
          month: `${monthNames[month - 1]}/${shortYear}`,
          monthKey: key,
          receitas: data.receitas,
          despesas: data.despesas ? -Math.abs(data.despesas) : 0,
          receitasDisplay: data.receitas,
          despesasDisplay: data.despesas
        });
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      if (import.meta.env.DEV) {
        console.log('[HISTORICAL_CASH_FLOW] Dados históricos por competência:', {
          diaFechamento: closingDay,
          intervaloNavegacao: `${navigationRange.firstMonth}/${navigationRange.firstYear} - ${navigationRange.lastMonth}/${navigationRange.lastYear}`,
          intervaloCompetencia: `${competencyRange.firstMonth}/${competencyRange.firstYear} - ${competencyRange.lastMonth}/${competencyRange.lastYear}`,
          totalMesesPlotados: chartData.length,
          transacoesProcessadas: transactions.length
        });
      }

      return chartData;
    },
    enabled: !!user && !!navigationRange && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};