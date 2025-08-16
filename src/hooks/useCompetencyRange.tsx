import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserProfile } from "./useUserProfile";
import { getCompetencyRange } from "@/lib/invoice-competency";

export const useCompetencyRange = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['competency-range', user?.id, profile?.invoice_closing_day],
    queryFn: async () => {
      if (!user || !profile?.invoice_closing_day) return null;

      // Buscar todas as transações do usuário
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: true });

      if (error) {
        console.error('[COMPETENCY_RANGE] Error fetching transactions:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) return null;

      const range = getCompetencyRange(transactions, profile.invoice_closing_day);
      
      if (import.meta.env.DEV) {
        console.log('[COMPETENCY_RANGE] Competency range:', range);
      }
      
      return range.first && range.last ? {
        firstMonth: range.first.month,
        firstYear: range.first.year,
        lastMonth: range.last.month,
        lastYear: range.last.year
      } : null;
    },
    enabled: !!user && !!profile?.invoice_closing_day,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLatestCompetencyMonth = () => {
  const competencyRange = useCompetencyRange();
  
  return {
    data: competencyRange.data ? {
      month: competencyRange.data.lastMonth,
      year: competencyRange.data.lastYear
    } : null,
    isLoading: competencyRange.isLoading,
    error: competencyRange.error
  };
};