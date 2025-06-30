
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
        console.log('[DEFAULT_FILTER] Loading most recent statements...');
        
        // Buscar o mês mais recente com extratos
        const { data: recentStatements, error } = await supabase
          .from('statements')
          .select('id, month, year, bank')
          .eq('user_id', user.id)
          .eq('status', 'ready')
          .not('month', 'is', null)
          .not('year', 'is', null)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (error) {
          console.error('[DEFAULT_FILTER] Error fetching statements:', error);
          setIsLoading(false);
          return;
        }

        if (!recentStatements || recentStatements.length === 0) {
          console.log('[DEFAULT_FILTER] No statements found, using current month');
          setIsLoading(false);
          return;
        }

        // Pegar o mês/ano mais recente
        const mostRecent = recentStatements[0];
        console.log('[DEFAULT_FILTER] Most recent month:', mostRecent.month, mostRecent.year);

        // Buscar todos os extratos desse mês
        const statementsOfMonth = recentStatements.filter(
          s => s.month === mostRecent.month && s.year === mostRecent.year
        );

        const selectedStatements = statementsOfMonth.map(s => s.id);
        
        console.log('[DEFAULT_FILTER] Selected statements:', selectedStatements.length);

        setFilterConfig({
          type: 'invoices',
          invoiceConfig: {
            month: mostRecent.month,
            year: mostRecent.year,
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
