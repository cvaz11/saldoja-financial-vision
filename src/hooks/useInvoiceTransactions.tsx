
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { FilterConfig } from "@/components/FilterButton";

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
  user_id: string;
  created_at: string;
  statements?: {
    bank: string;
    closing_day: number;
  };
}

export const useFilteredTransactions = (config: FilterConfig, enabled: boolean = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['filtered-transactions', config, user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user) {
        console.log('[FILTERED_QUERY] No user found');
        return [];
      }

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
          console.log('[FILTERED_QUERY] No statements selected');
          return [];
        }

        console.log('[FILTERED_QUERY] Fetching transactions for statements:', selectedStatements);

        // FIX: Query simplificada para evitar problemas com join
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .in('statement_id', selectedStatements)
          .order('created_at', { ascending: false }); // FIX: Usar created_at para ordem mais confiável

        if (error) {
          console.error('[FILTERED_QUERY] Error fetching invoice transactions:', error);
          throw error;
        }

        console.log('[FILTERED_QUERY] Raw query result:', data?.length || 0);
        console.log('[FILTERED_QUERY] Sample transactions:', data?.slice(0, 2));
        
        // FIX: Transformar dados para garantir formato correto
        const transformedData: Transaction[] = (data || []).map(transaction => ({
          id: transaction.id,
          description: transaction.description || '',
          amount: Number(transaction.amount),
          transaction_date: transaction.transaction_date,
          is_credit: Boolean(transaction.is_credit),
          installment_number: transaction.installment_number,
          installment_total: transaction.installment_total,
          category: transaction.category || 'Outros',
          statement_id: transaction.statement_id || '',
          user_id: transaction.user_id,
          created_at: transaction.created_at
        }));

        console.log('[FILTERED_QUERY] Transformed transactions:', transformedData.length);
        console.log('[FILTERED_QUERY] Income transactions:', transformedData.filter(t => t.is_credit).length);
        console.log('[FILTERED_QUERY] Expense transactions:', transformedData.filter(t => !t.is_credit).length);
        
        return transformedData;
      }

      console.log('[FILTERED_QUERY] No valid config provided');
      return [];
    },
    enabled: enabled && !!user,
    staleTime: 0, // FIX: Sempre buscar dados atualizados
    gcTime: 0, // FIX: Não manter cache
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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
