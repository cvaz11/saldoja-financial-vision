import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useLatestStatementMonth = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['latest-statement-month', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('statements')
        .select('month, year')
        .eq('user_id', user.id)
        .not('month', 'is', null)
        .not('year', 'is', null)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[LATEST_STATEMENT] Error fetching:', error);
        throw error;
      }

      console.log('[LATEST_STATEMENT] Latest statement month:', data?.[0]);
      return data?.[0] || null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};