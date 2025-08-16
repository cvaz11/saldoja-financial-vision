
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserProfile } from "./useUserProfile";
import type { FilterConfig } from "@/components/FilterButton";
import { useEffect, useRef } from "react";
import { filterTransactionsByCompetency } from "@/lib/invoice-competency";

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
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  const query = useQuery({
    queryKey: ['filtered-transactions', config, user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user) {
        console.log('[FILTERED_QUERY] No user found');
        return [];
      }

      console.log('[FILTERED_QUERY] Fetching transactions with config:', config);

      if (config.type === 'date-range' && config.dateRange) {
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
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[FILTERED_QUERY] Error fetching date range transactions:', error);
          throw error;
        }

        console.log('[FILTERED_QUERY] Found date range transactions:', data?.length || 0);
        return data as Transaction[] || [];
      } 
      
      if (config.type === 'invoices' && config.invoiceConfig) {
        const { selectedStatements, month, year } = config.invoiceConfig;
        
        console.log('[FILTERED_QUERY] Fetching transactions for competency period:', month, year);
        console.log('[FILTERED_QUERY] Closing day:', profile?.invoice_closing_day);
        
        // Buscar TODAS as transações do usuário para aplicar filtro de competência
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id);

        if (selectedStatements.length > 0) {
          // Usar extratos específicos se selecionados
          console.log('[FILTERED_QUERY] Fetching transactions for statements:', selectedStatements);
          query = query.in('statement_id', selectedStatements);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('[FILTERED_QUERY] Error fetching invoice transactions:', error);
          throw error;
        }

        console.log('[FILTERED_QUERY] Raw query result:', data?.length || 0);
        
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

        // Aplicar filtro de competência se temos o closing day
        if (profile?.invoice_closing_day !== undefined) {
          const filteredByCompetency = filterTransactionsByCompetency(
            transformedData,
            month,
            year,
            profile.invoice_closing_day
          );
          
          console.log('[FILTERED_QUERY] After competency filter:', filteredByCompetency.length);
          console.log('[FILTERED_QUERY] Income transactions:', filteredByCompetency.filter(t => t.is_credit).length);
          console.log('[FILTERED_QUERY] Expense transactions:', filteredByCompetency.filter(t => !t.is_credit).length);
          
          return filteredByCompetency;
        }

        console.log('[FILTERED_QUERY] No closing day, returning all transactions');
        console.log('[FILTERED_QUERY] Income transactions:', transformedData.filter(t => t.is_credit).length);
        console.log('[FILTERED_QUERY] Expense transactions:', transformedData.filter(t => !t.is_credit).length);
        
        return transformedData;
      }

      console.log('[FILTERED_QUERY] No valid config provided');
      return [];
    },
    enabled: enabled && !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Configurar realtime updates
  useEffect(() => {
    if (!user) return;

    // Limpar canal anterior se existir
    if (channelRef.current) {
      console.log('[FILTERED_QUERY] Cleaning up previous channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('[FILTERED_QUERY] Setting up realtime subscription for user:', user.id);
    
    const channel = supabase
      .channel(`filtered-transactions-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[FILTERED_QUERY] Realtime update received:', payload.eventType, payload);
          
          // Invalidar queries para atualização imediata
          queryClient.invalidateQueries({ queryKey: ['filtered-transactions'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          
          // Refetch imediato
          setTimeout(() => {
            query.refetch();
          }, 200);
        }
      )
      .subscribe((status) => {
        console.log('[FILTERED_QUERY] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[FILTERED_QUERY] Cleaning up realtime subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient, query.refetch]);

  return query;
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
