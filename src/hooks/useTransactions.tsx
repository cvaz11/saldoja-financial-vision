
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
        console.log('No user found, returning empty array');
        return [];
      }
      
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      
      console.log('Fetching transactions for user:', user.id);
      console.log('Date range:', fromDate, 'to', toDate);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', fromDate)
        .lte('transaction_date', toDate)
        .order('transaction_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }
      
      console.log('Fetched transactions:', data);
      return data || [];
    },
    enabled: !!user
  });
};
