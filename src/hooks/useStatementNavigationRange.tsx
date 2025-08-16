import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook para determinar o range de navegação baseado nos extratos
 * (primeiro ao último extrato, independente de competência)
 */
export const useStatementNavigationRange = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['statement-navigation-range', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: statements, error } = await supabase
        .from('statements')
        .select('month, year')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (error) {
        console.error('[NAVIGATION_RANGE] Error:', error);
        throw error;
      }

      if (!statements || statements.length === 0) return null;

      const result = {
        firstMonth: statements[0].month as number,
        firstYear: statements[0].year as number,
        lastMonth: statements[statements.length - 1].month as number,
        lastYear: statements[statements.length - 1].year as number,
        totalStatements: statements.length
      };

      if (import.meta.env.DEV) {
        console.log('[NAVIGATION_RANGE] Statement range for navigation:', result);
      }
      
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};