import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useStatementRange = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['statement-range', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('statements')
        .select('month, year')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (error) {
        console.error('[STATEMENT_RANGE] Error fetching:', error);
        throw error;
      }

      if (!data || data.length === 0) return null;

      const first = data[0];
      const last = data[data.length - 1];
      
      const result = {
        firstMonth: first.month as number,
        firstYear: first.year as number,
        lastMonth: last.month as number,
        lastYear: last.year as number,
        totalStatements: data.length
      };

      if (import.meta.env.DEV) {
        console.log('[STATEMENT_RANGE] Statement range:', result);
      }
      
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};