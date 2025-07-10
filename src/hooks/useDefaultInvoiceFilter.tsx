
import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLatestTransactionMonth } from "./useLatestTransactionMonth";
import { type FilterConfig } from "@/components/FilterButton";

interface DefaultFilterResult {
  filterConfig: FilterConfig;
  isLoading: boolean;
}

export const useDefaultInvoiceFilter = (): DefaultFilterResult => {
  const { user } = useAuth();
  const { data: latestTransactionMonth, isLoading: isLoadingLatest } = useLatestTransactionMonth();
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

      // Aguardar o carregamento do último mês de transação
      if (isLoadingLatest) return;

      try {
        console.log('[DEFAULT_FILTER] Using latest transaction month as default');
        
        // Usar o último mês de transação como padrão
        const targetMonth = latestTransactionMonth?.month || new Date().getMonth() + 1;
        const targetYear = latestTransactionMonth?.year || new Date().getFullYear();
        
        // Buscar extratos disponíveis para esse mês
        const { data: statements, error } = await supabase
          .from('statements')
          .select('id, month, year, bank')
          .eq('user_id', user.id)
          .eq('status', 'ready')
          .eq('month', targetMonth)
          .eq('year', targetYear);

        if (error) {
          console.error('[DEFAULT_FILTER] Error fetching statements:', error);
          setIsLoading(false);
          return;
        }

        const selectedStatements = statements?.map(s => s.id) || [];
        
        console.log('[DEFAULT_FILTER] Default filter set to:', targetMonth, targetYear, 'statements:', selectedStatements.length);

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
  }, [user, latestTransactionMonth, isLoadingLatest]);

  return { filterConfig, isLoading: isLoading || isLoadingLatest };
};
