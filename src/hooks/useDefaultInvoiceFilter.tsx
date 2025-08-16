
import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useUserProfile } from "./useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { type FilterConfig } from "@/components/FilterButton";
import { getCompetencyRange } from "@/lib/invoice-competency";

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
        console.log('[DEFAULT_FILTER] Using latest competency month as default');
        
        // Buscar todas as transações para calcular competência
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('transaction_date')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: true });

        if (transError) {
          console.error('[DEFAULT_FILTER] Error fetching transactions:', transError);
        }

        let targetMonth, targetYear;

        if (transactions && transactions.length > 0 && profile.invoice_closing_day) {
          // Usar competência baseada no closing day
          const range = getCompetencyRange(transactions, profile.invoice_closing_day);
          if (range.last) {
            targetMonth = range.last.month;
            targetYear = range.last.year;
            console.log('[DEFAULT_FILTER] Using competency range last:', targetMonth, targetYear);
          } else {
            // Fallback para data atual
            targetMonth = new Date().getMonth() + 1;
            targetYear = new Date().getFullYear();
            console.log('[DEFAULT_FILTER] No competency range, using current date:', targetMonth, targetYear);
          }
        } else {
          // Fallback para o último extrato se não tem transações
          const { data: latestStatement } = await supabase
            .from('statements')
            .select('month, year')
            .eq('user_id', user.id)
            .eq('status', 'ready')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(1);

          targetMonth = latestStatement?.[0]?.month || new Date().getMonth() + 1;
          targetYear = latestStatement?.[0]?.year || new Date().getFullYear();
          console.log('[DEFAULT_FILTER] Fallback to latest statement:', targetMonth, targetYear);
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
