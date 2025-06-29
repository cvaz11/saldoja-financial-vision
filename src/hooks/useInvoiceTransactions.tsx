
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { FilterConfig } from "@/components/InvoiceFilter";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  is_credit: boolean;
  installment_number?: number;
  installment_total?: number;
  category?: string;
  statement_id: string;
  statements: {
    bank: string;
    closing_day: number;
  };
}

export const useFilteredTransactions = (config: FilterConfig, enabled: boolean = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['filtered-transactions', config, user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user) return [];

      console.log('[FILTERED_QUERY] Fetching transactions with config:', config);

      if (config.type === 'date-range' && config.dateRange) {
        // Buscar por período de datas
        const { from, to } = config.dateRange;
        
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            statements!inner(bank, closing_day)
          `)
          .eq('user_id', user.id)
          .gte('transaction_date', from.toISOString().split('T')[0])
          .lte('transaction_date', to.toISOString().split('T')[0])
          .order('transaction_date', { ascending: false });

        if (error) {
          console.error('[FILTERED_QUERY] Error fetching date range transactions:', error);
          throw error;
        }

        console.log('[FILTERED_QUERY] Found date range transactions:', data?.length || 0);
        return data as Transaction[] || [];
      } 
      
      if (config.type === 'invoices' && config.invoiceConfig) {
        // Buscar por extratos específicos
        const { selectedStatements } = config.invoiceConfig;
        
        if (selectedStatements.length === 0) {
          return [];
        }

        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            statements!inner(bank, closing_day)
          `)
          .eq('user_id', user.id)
          .in('statement_id', selectedStatements)
          .order('transaction_date', { ascending: false });

        if (error) {
          console.error('[FILTERED_QUERY] Error fetching invoice transactions:', error);
          throw error;
        }

        console.log('[FILTERED_QUERY] Found invoice transactions:', data?.length || 0);
        return data as Transaction[] || [];
      }

      return [];
    },
    enabled: enabled && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Manter compatibilidade com o hook antigo
export const useInvoiceTransactions = (config: any, enabled: boolean = true) => {
  const filterConfig: FilterConfig = {
    type: 'invoices',
    invoiceConfig: {
      month: config.month,
      year: config.year,
      selectedStatements: config.selectedBanks || []
    }
  };
  
  return useFilteredTransactions(filterConfig, enabled);
};
