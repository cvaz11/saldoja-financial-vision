
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
        console.log('[DEFAULT_FILTER] Using latest statement month as default');
        
        // Buscar o último extrato processado (não a última transação)
        const { data: latestStatement, error } = await supabase
          .from('statements')
          .select('month, year')
          .eq('user_id', user.id)
          .eq('status', 'ready')
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1);

        if (error) {
          console.error('[DEFAULT_FILTER] Error fetching latest statement:', error);
          setIsLoading(false);
          return;
        }

        const targetMonth = latestStatement?.[0]?.month || new Date().getMonth() + 1;
        const targetYear = latestStatement?.[0]?.year || new Date().getFullYear();
        
        console.log('[DEFAULT_FILTER] Default filter set to latest statement:', targetMonth, targetYear);

        setFilterConfig({
          type: 'invoices',
          invoiceConfig: {
            month: targetMonth,
            year: targetYear,
            selectedStatements: []
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
