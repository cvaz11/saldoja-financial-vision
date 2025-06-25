
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { DateRange } from "@/components/DateRangePicker";

export const useTransactions = (dateRange: DateRange) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transactions', user?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!user) {
        console.log('[TRANSACTIONS] No user found, returning empty array');
        return [];
      }
      
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      console.log('[TRANSACTIONS] Fetching for user:', user.id);
      console.log('[TRANSACTIONS] Date range:', fromDate, 'to', toDate);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', fromDate)
        .lte('transaction_date', toDate)
        .order('transaction_date', { ascending: false });
      
      if (error) {
        console.error('[TRANSACTIONS] Error fetching:', error);
        throw error;
      }
      
      console.log(`[TRANSACTIONS] Fetched ${data?.length || 0} transactions`);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 3000, // Check for new transactions every 3 seconds
    staleTime: 1000, // Consider data stale after 1 second
  });
};
