import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserProfile } from "./useUserProfile";
import { getCompetencyRange } from "@/lib/invoice-competency";

export const useStatementRange = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['statement-range', user?.id, profile?.invoice_closing_day],
    queryFn: async () => {
      if (!user || !profile) return null;

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user.id)
        .not('statement_id', 'is', null)
        .order('transaction_date', { ascending: true });

      if (error) {
        console.error('[STATEMENT_RANGE] Error:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) return null;

      const closingDay = profile.invoice_closing_day || 5;
      const competencyRange = getCompetencyRange(transactions, closingDay);

      if (!competencyRange) return null;

      const result = {
        firstMonth: competencyRange.firstMonth,
        firstYear: competencyRange.firstYear,
        lastMonth: competencyRange.lastMonth,
        lastYear: competencyRange.lastYear,
        totalStatements: transactions.length
      };

      if (import.meta.env.DEV) {
        console.log('[STATEMENT_RANGE] Competency range:', result, 'with closing day:', closingDay);
      }
      
      return result;
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
  });
};