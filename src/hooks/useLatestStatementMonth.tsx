import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserProfile } from "./useUserProfile";
import { getCompetencyRange } from "@/lib/invoice-competency";

export const useLatestStatementMonth = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['latest-statement-month', user?.id, profile?.invoice_closing_day],
    queryFn: async () => {
      if (!user || !profile) return null;
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user.id)
        .not('statement_id', 'is', null)
        .order('transaction_date', { ascending: false });
      
      if (error) {
        console.error('[LATEST_MONTH] Error:', error);
        throw error;
      }
      
      if (!transactions || transactions.length === 0) {
        return null;
      }
      
      // Calcular range de competência usando todas as transações
      const closingDay = profile.invoice_closing_day || 5;
      const competencyRange = getCompetencyRange(transactions, closingDay);
      
      if (!competencyRange) return null;
      
      const result = {
        month: competencyRange.lastMonth,
        year: competencyRange.lastYear
      };
      
      if (import.meta.env.DEV) {
        console.log('[LATEST_STATEMENT] Latest competency month:', result, 'with closing day:', closingDay);
      }
      
      return result;
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
  });
};