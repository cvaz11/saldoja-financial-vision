
import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { type FilterConfig } from "@/components/FilterButton";

interface DefaultFilterResult {
  filterConfig: FilterConfig;
  isLoading: boolean;
}

export const useDefaultInvoiceFilter = (): DefaultFilterResult => {
  const { user } = useAuth();
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    type: 'invoices',
    invoiceConfig: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      selectedStatements: []
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDefaultFilter = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('[DEFAULT_FILTER] Finding month with most transactions...');
        
        // Primeiro, buscar todos os extratos disponíveis
        const { data: allStatements, error: statementsError } = await supabase
          .from('statements')
          .select('id, month, year, bank')
          .eq('user_id', user.id)
          .eq('status', 'ready');

        if (statementsError) {
          console.error('[DEFAULT_FILTER] Error fetching statements:', statementsError);
          setIsLoading(false);
          return;
        }

        if (!allStatements || allStatements.length === 0) {
          console.log('[DEFAULT_FILTER] No statements found, using current month');
          setIsLoading(false);
          return;
        }

        // Buscar transações reais agrupadas por mês/ano para encontrar o mês com mais gastos
        const { data: transactionCounts, error: transError } = await supabase
          .from('transactions')
          .select('transaction_date')
          .eq('user_id', user.id)
          .not('statement_id', 'is', null); // Apenas transações reais do extrato

        if (transError) {
          console.error('[DEFAULT_FILTER] Error fetching transactions:', transError);
          setIsLoading(false);
          return;
        }

        if (!transactionCounts || transactionCounts.length === 0) {
          console.log('[DEFAULT_FILTER] No transactions found, using current month');
          setIsLoading(false);
          return;
        }

        // Agrupar transações por mês/ano e contar
        const monthCounts = new Map<string, { month: number; year: number; count: number }>();
        
        transactionCounts.forEach(t => {
          const date = new Date(t.transaction_date);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          const key = `${year}-${month}`;
          
          if (monthCounts.has(key)) {
            monthCounts.get(key)!.count++;
          } else {
            monthCounts.set(key, { month, year, count: 1 });
          }
        });

        // Encontrar o mês com mais transações
        let maxCount = 0;
        let targetMonth = new Date().getMonth() + 1;
        let targetYear = new Date().getFullYear();

        for (const [, data] of monthCounts) {
          if (data.count > maxCount) {
            maxCount = data.count;
            targetMonth = data.month;
            targetYear = data.year;
          }
        }

        console.log('[DEFAULT_FILTER] Month with most transactions:', targetMonth, targetYear, 'count:', maxCount);

        // Buscar extratos que correspondem a esse período ou próximo
        const relevantStatements = allStatements.filter(s => {
          // Buscar extratos do mesmo mês ou mês anterior/posterior (para casos de ciclo de fatura)
          return (s.year === targetYear && Math.abs((s.month || 0) - targetMonth) <= 1) ||
                 (s.year === targetYear - 1 && s.month === 12 && targetMonth === 1) ||
                 (s.year === targetYear + 1 && s.month === 1 && targetMonth === 12);
        });

        // Se não encontrar extratos próximos, usar qualquer extrato disponível
        const selectedStatements = relevantStatements.length > 0 
          ? relevantStatements.map(s => s.id)
          : allStatements.map(s => s.id);
        
        console.log('[DEFAULT_FILTER] Selected statements:', selectedStatements.length);

        setFilterConfig({
          type: 'invoices',
          invoiceConfig: {
            month: targetMonth,
            year: targetYear,
            selectedStatements
          }
        });
      } catch (error) {
        console.error('[DEFAULT_FILTER] Error in loadDefaultFilter:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDefaultFilter();
  }, [user]);

  return { filterConfig, isLoading };
};
