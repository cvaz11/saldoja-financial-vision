import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useUserProfile } from "./useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { type FilterConfig } from "@/components/FilterButton";
import { calculateStatementCompetency } from "@/lib/invoice-competency";

interface DefaultFilterResult {
  filterConfig: FilterConfig;
  isLoading: boolean;
}

export const useDefaultInvoiceFilter = (): DefaultFilterResult => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
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
      if (!user || !profile) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('[DEFAULT_FILTER] NEW LOGIC: Using statement competency as default');
        
        // NEW LOGIC: Buscar o último extrato para calcular competência
        const { data: latestStatement } = await supabase
          .from('statements')
          .select('month, year')
          .eq('user_id', user.id)
          .eq('status', 'ready')
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1);

        let targetMonth, targetYear;

        if (latestStatement && latestStatement.length > 0) {
          // NEW LOGIC: Calcular competência baseada no mês do extrato
          const competency = calculateStatementCompetency(
            latestStatement[0].month, 
            latestStatement[0].year
          );
          
          targetMonth = competency.month;
          targetYear = competency.year;
          
          console.log('[DEFAULT_FILTER] NEW LOGIC: Statement competency calculated:', {
            statementMonth: latestStatement[0].month,
            statementYear: latestStatement[0].year,
            competencyMonth: targetMonth,
            competencyYear: targetYear
          });
        } else {
          // Fallback para mês atual se não há extratos
          targetMonth = new Date().getMonth() + 1;
          targetYear = new Date().getFullYear();
          console.log('[DEFAULT_FILTER] No statements found, using current date:', targetMonth, targetYear);
        }

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
  }, [user, profile]);

  return { filterConfig, isLoading };
};