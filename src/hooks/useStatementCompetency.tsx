import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { calculateStatementCompetency, getStatementCompetencyRange } from "@/lib/invoice-competency";

export const useStatementCompetency = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['statement-competency', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Buscar todos os extratos do usuário
      const { data: statements, error } = await supabase
        .from('statements')
        .select('month, year')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (error) {
        console.error('[STATEMENT_COMPETENCY] Error fetching statements:', error);
        throw error;
      }

      if (!statements || statements.length === 0) return null;

      const range = getStatementCompetencyRange(statements);
      
      if (import.meta.env.DEV) {
        console.log('[STATEMENT_COMPETENCY] Competency range from statements:', range);
        console.log('[STATEMENT_COMPETENCY] Statements found:', statements.map(s => `${s.month}/${s.year}`));
      }
      
      return range.first && range.last ? {
        firstMonth: range.first.month,
        firstYear: range.first.year,
        lastMonth: range.last.month,
        lastYear: range.last.year,
        statements: statements
      } : null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLatestStatementCompetency = () => {
  const competencyRange = useStatementCompetency();
  
  return {
    data: competencyRange.data ? {
      month: competencyRange.data.lastMonth,
      year: competencyRange.data.lastYear
    } : null,
    isLoading: competencyRange.isLoading,
    error: competencyRange.error
  };
};

/**
 * Hook para buscar transações baseado na competência de extratos
 */
export const useTransactionsByStatementCompetency = (
  targetMonth: number, 
  targetYear: number
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transactions-by-statement-competency', user?.id, targetMonth, targetYear],
    queryFn: async () => {
      if (!user) return [];

      // Buscar transações com informações do extrato
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          statement:statements!inner(month, year, bank)
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('[TRANSACTIONS_BY_STATEMENT_COMPETENCY] Error:', error);
        throw error;
      }

      if (!transactions) return [];

      // Filtrar por competência de extrato
      const filteredTransactions = transactions.filter(transaction => {
        if (!transaction.statement) return false;
        
        const competency = calculateStatementCompetency(
          transaction.statement.month,
          transaction.statement.year
        );
        
        return competency.month === targetMonth && competency.year === targetYear;
      });

      if (import.meta.env.DEV) {
        console.log('[TRANSACTIONS_BY_STATEMENT_COMPETENCY] Results:', {
          targetCompetency: `${targetMonth}/${targetYear}`,
          totalTransactions: transactions.length,
          filteredCount: filteredTransactions.length,
          statements: [...new Set(transactions.map(t => t.statement ? `${t.statement.month}/${t.statement.year}` : 'no-statement'))]
        });
      }

      return filteredTransactions;
    },
    enabled: !!user && !!targetMonth && !!targetYear,
    staleTime: 30 * 1000, // 30 seconds
  });
};