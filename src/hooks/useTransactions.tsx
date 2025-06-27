
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserProfile } from "./useUserProfile";
import type { DateRange } from "@/components/DateRangePicker";
import { calculateInvoiceCycle, isDateInInvoiceCycle } from "@/lib/invoice-utils";
import { useEffect, useRef } from "react";

export const useTransactions = (
  dateRange: DateRange, 
  showOnlyDebits: boolean = true,
  useInvoiceCycle: boolean = false
) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const channelRef = useRef<any>(null);

  // Calcular range baseado no ciclo de fatura se solicitado
  const getEffectiveDateRange = () => {
    if (!useInvoiceCycle || !profile) {
      return dateRange;
    }

    const cycle = calculateInvoiceCycle(profile.invoice_closing_day, dateRange.from);
    return {
      from: cycle.startDate,
      to: cycle.endDate
    };
  };

  const effectiveRange = getEffectiveDateRange();

  // Query para buscar transações
  const query = useQuery({
    queryKey: [
      'transactions', 
      user?.id, 
      effectiveRange.from.toISOString(), 
      effectiveRange.to.toISOString(), 
      showOnlyDebits,
      useInvoiceCycle,
      profile?.invoice_closing_day
    ],
    queryFn: async () => {
      if (!user) {
        console.log('[TRANSACTIONS] No user found, returning empty array');
        return [];
      }
      
      const fromDate = effectiveRange.from.toISOString().split('T')[0];
      const toDate = effectiveRange.to.toISOString().split('T')[0];
      
      console.log('[TRANSACTIONS] Fetching for user:', user.id);
      console.log('[TRANSACTIONS] Date range:', fromDate, 'to', toDate);
      console.log('[TRANSACTIONS] Show only debits:', showOnlyDebits);
      console.log('[TRANSACTIONS] Use invoice cycle:', useInvoiceCycle);
      
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
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: false,
  });

  // Escutar eventos realtime para atualizações de transações
  useEffect(() => {
    if (!user) return;

    // Limpar canal anterior se existir
    if (channelRef.current) {
      console.log('[TRANSACTIONS] Cleaning up previous channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('[TRANSACTIONS] Setting up new realtime subscription');
    
    const channel = supabase
      .channel(`transactions-${user.id}-${Date.now()}`)
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
          // Refetch imediatamente quando houver mudanças
          query.refetch();
        }
      )
      .subscribe((status) => {
        console.log('[TRANSACTIONS] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[TRANSACTIONS] Cleaning up realtime subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, query.refetch]);

  return query;
};

// Hook específico para buscar transações do ciclo atual
export const useCurrentInvoiceCycleTransactions = () => {
  const { profile } = useUserProfile();
  const currentCycle = profile ? calculateInvoiceCycle(profile.invoice_closing_day) : null;
  
  return useTransactions(
    currentCycle ? { from: currentCycle.startDate, to: currentCycle.endDate } : { from: new Date(), to: new Date() },
    true, // Apenas débitos
    true  // Usar ciclo de fatura
  );
};
