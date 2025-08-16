import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useStatementRange } from "./useStatementRange";
import { useMemo } from "react";

export const useHistoricalCashFlow = () => {
  const { user } = useAuth();
  const { data: statementRange } = useStatementRange();

  return useQuery({
    queryKey: ['historical-cash-flow', user?.id, statementRange],
    queryFn: async () => {
      if (!user || !statementRange) return [];

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

      // Criar array de todos os meses do primeiro ao último extrato
      const monthlyData: Record<string, { receitas: number; despesas: number }> = {};
      
      // Inicializar todos os meses no range com zeros
      let currentDate = new Date(statementRange.firstYear, statementRange.firstMonth - 1, 1);
      const lastDate = new Date(statementRange.lastYear, statementRange.lastMonth - 1, 1);
      
      while (currentDate <= lastDate) {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const key = `${month}/${year}`;
        
        monthlyData[key] = { receitas: 0, despesas: 0 };
        
        // Próximo mês
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Agrupar transações por mês/ano
      transactions.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const key = `${month}/${year}`;
        
        if (monthlyData[key]) {
          if (transaction.is_credit) {
            monthlyData[key].receitas += Math.abs(transaction.amount);
          } else {
            monthlyData[key].despesas += Math.abs(transaction.amount);
          }
        }
      });

      // Converter para array com formato do gráfico
      const chartData = [];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      currentDate = new Date(statementRange.firstYear, statementRange.firstMonth - 1, 1);
      
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
        console.log('[HISTORICAL_CASH_FLOW] Dados históricos calculados:', {
          primeiroMes: `${statementRange.firstMonth}/${statementRange.firstYear}`,
          ultimoMes: `${statementRange.lastMonth}/${statementRange.lastYear}`,
          totalMesesPlotados: chartData.length,
          transacoesProcessadas: transactions.length
        });
      }

      return chartData;
    },
    enabled: !!user && !!statementRange,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};