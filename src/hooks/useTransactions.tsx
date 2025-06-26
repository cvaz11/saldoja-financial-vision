
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { DateRange } from "@/components/DateRangePicker";
import { useEffect } from "react";

export const useTransactions = (dateRange: DateRange, showOnlyDebits: boolean = true) => {
  const { user } = useAuth();

  // Query para buscar transações
  const query = useQuery({
    queryKey: ['transactions', user?.id, dateRange.from.toISOString(), dateRange.to.toISOString(), showOnlyDebits],
    queryFn: async () => {
      if (!user) {
        console.log('[TRANSACTIONS] No user found, returning empty array');
        return [];
      }
      
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      console.log('[TRANSACTIONS] Fetching for user:', user.id);
      console.log('[TRANSACTIONS] Date range:', fromDate, 'to', toDate);
      console.log('[TRANSACTIONS] Show only debits:', showOnlyDebits);
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', fromDate)
        .lte('transaction_date', toDate);
        
      // Filtrar apenas débitos se solicitado
      if (showOnlyDebits) {
        query = query.eq('is_credit', false);
      }
      
      const { data, error } = await query.order('transaction_date', { ascending: false });
      
      if (error) {
        console.error('[TRANSACTIONS] Error fetching:', error);
        throw error;
      }
      
      console.log(`[TRANSACTIONS] Fetched ${data?.length || 0} transactions`);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 5000, // Verificar novas transações a cada 5 segundos
    staleTime: 2000, // Considerar dados obsoletos após 2 segundos
  });

  // Escutar eventos realtime para atualizações de transações
  useEffect(() => {
    if (!user) return;

    console.log('[TRANSACTIONS] Setting up realtime subscription');
    
    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[TRANSACTIONS] Realtime update received:', payload);
          // Invalidar query para refetch
          query.refetch();
        }
      )
      .on(
        'broadcast',
        { event: 'statement_ready' },
        (payload) => {
          console.log('[TRANSACTIONS] Statement ready broadcast received:', payload);
          if (payload.payload.user_id === user.id) {
            // Refetch transações quando extrato estiver pronto
            query.refetch();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[TRANSACTIONS] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, query]);

  return query;
};
