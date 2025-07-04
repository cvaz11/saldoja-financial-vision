import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useLatestTransactionMonth = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['latest-transaction-month', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Buscar mês da transação mais recente (não do upload do extrato)
      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[LATEST_TRANSACTION] Error fetching:', error);
        throw error;
      }

      if (!data?.[0]) return null;

      const latestDate = new Date(data[0].transaction_date);
      const result = {
        month: latestDate.getMonth() + 1,
        year: latestDate.getFullYear()
      };

      console.log('[LATEST_TRANSACTION] Latest transaction month:', result);
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};