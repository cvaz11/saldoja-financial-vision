
import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useLatestStatementNavigationMonth } from "./useLatestStatementNavigationMonth";
import { type FilterConfig } from "@/components/FilterButton";

interface DefaultFilterResult {
  filterConfig: FilterConfig;
  isLoading: boolean;
}

export const useDefaultInvoiceFilter = (): DefaultFilterResult => {
  const { user } = useAuth();
  const { data: latestStatementMonth, isLoading: latestStatementLoading } = useLatestStatementNavigationMonth();
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
    if (latestStatementLoading || !user) {
      return;
    }

    console.log('[DEFAULT_FILTER] Using latest statement month as default');
    
    const targetMonth = latestStatementMonth?.month || new Date().getMonth() + 1;
    const targetYear = latestStatementMonth?.year || new Date().getFullYear();
    
    console.log('[DEFAULT_FILTER] Default filter set to latest statement:', targetMonth, targetYear);

    setFilterConfig({
      type: 'invoices',
      invoiceConfig: {
        month: targetMonth,
        year: targetYear,
        selectedStatements: []
      }
    });
    
    setIsLoading(false);
  }, [user, latestStatementMonth, latestStatementLoading]);

  return { filterConfig, isLoading };
};
