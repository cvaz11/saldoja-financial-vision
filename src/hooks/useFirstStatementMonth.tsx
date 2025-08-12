import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useFirstStatementMonth = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['first-statement-month', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('statements')
        .select('month, year')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .order('year', { ascending: true })
        .order('month', { ascending: true })
        .limit(1);

      if (error) {
        console.error('[FIRST_STATEMENT] Error fetching:', error);
        throw error;
      }

      if (!data?.[0]) return null;

      const result = { month: data[0].month as number, year: data[0].year as number };
      if (import.meta.env.DEV) {
        console.log('[FIRST_STATEMENT] First statement month:', result);
      }
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};
