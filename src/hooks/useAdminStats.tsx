import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  adminUsers: number;
  monthlyRevenue: number;
  mrr: number;
}

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      try {
        // Buscar todos os perfis de usuários
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('plan, role');

        if (error) {
          console.error('Error fetching profiles:', error);
          throw error;
        }

        const totalUsers = profiles?.length || 0;
        const proUsers = profiles?.filter(p => p.plan === 'pro').length || 0;
        const freeUsers = profiles?.filter(p => p.plan === 'free').length || 0;
        const adminUsers = profiles?.filter(p => p.role === 'admin' || p.role === 'super_admin').length || 0;

        // Calcular receita baseada nos usuários Pro (assumindo R$ 29,90/mês)
        const proPlanPrice = 29.90;
        const monthlyRevenue = proUsers * proPlanPrice;
        const mrr = monthlyRevenue; // MRR é a mesma coisa que receita mensal

        return {
          totalUsers,
          proUsers,
          freeUsers,
          adminUsers,
          monthlyRevenue,
          mrr
        };
      } catch (error) {
        console.error('Error in useAdminStats:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};