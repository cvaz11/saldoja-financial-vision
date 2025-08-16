import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook para obter o último mês de extrato (para navegação inicial)
 * Baseado nos extratos, não na competência
 */
export const useLatestStatementNavigationMonth = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['latest-statement-navigation-month', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data: statements, error } = await supabase
        .from('statements')
        .select('month, year')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('[LATEST_NAVIGATION_MONTH] Error:', error);
        throw error;
      }
      
      if (!statements?.[0]) {
        return null;
      }
      
      const result = {
        month: statements[0].month as number,
        year: statements[0].year as number
      };
      
      if (import.meta.env.DEV) {
        console.log('[LATEST_NAVIGATION] Latest statement month for navigation:', result);
      }
      
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};