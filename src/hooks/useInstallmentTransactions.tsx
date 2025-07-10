import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface InstallmentTransaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  is_credit: boolean;
  installment_number: number;
  installment_total: number;
  category?: string;
  user_id: string;
  statement_id?: string;
  is_projected?: boolean;
  installment_id?: string;
}

export const useInstallmentTransactions = (filterMonth?: number, filterYear?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['installment-transactions', user?.id, filterMonth, filterYear],
    queryFn: async () => {
      if (!user) return [];

      console.log('[INSTALLMENTS] Fetching for month/year:', filterMonth, filterYear);

      // Buscar apenas transações do mês específico filtrado
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .not('installment_number', 'is', null)
        .not('installment_total', 'is', null);

      // FILTRO CRÍTICO: Adicionar filtro de data se especificado
      if (filterMonth && filterYear) {
        const startDate = new Date(filterYear, filterMonth - 1, 1);
        const endDate = new Date(filterYear, filterMonth, 0); // Último dia do mês
        
        query = query
          .gte('transaction_date', startDate.toISOString().split('T')[0])
          .lte('transaction_date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query.order('transaction_date', { ascending: true });

      if (error) {
        console.error('[INSTALLMENTS] Error fetching:', error);
        throw error;
      }

      console.log('[INSTALLMENTS] Raw transactions found:', data?.length || 0);

      // Transformar diretamente as transações encontradas
      const installments: InstallmentTransaction[] = (data || []).map(transaction => ({
        id: transaction.id,
        description: transaction.description || '',
        amount: transaction.amount,
        transaction_date: transaction.transaction_date,
        is_credit: transaction.is_credit || false,
        installment_number: transaction.installment_number,
        installment_total: transaction.installment_total,
        category: transaction.category,
        user_id: transaction.user_id,
        statement_id: transaction.statement_id,
        installment_id: transaction.installment_id || `auto_${transaction.description?.replace(/[^a-zA-Z0-9]/g, '_')}_${transaction.installment_total}`,
        is_projected: !transaction.statement_id // Se não tem statement_id, é projetada
      }));

      console.log(`[INSTALLMENTS] Generated ${installments.length} installments for month ${filterMonth}/${filterYear}`);
      console.log(`[INSTALLMENTS] Details:`, installments.map(i => `${i.installment_number}/${i.installment_total} on ${i.transaction_date}`));
      
      return installments;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useInstallmentStats = (filterMonth?: number, filterYear?: number) => {
  const { data: transactions = [] } = useInstallmentTransactions(filterMonth, filterYear);

  const stats = {
    totalInstallments: 0,
    monthlyAmount: 0,
    pendingAmount: 0,
    pendingInstallments: 0,
  };

  // Calcular estatísticas baseadas apenas nas parcelas do mês atual
  transactions.forEach(transaction => {
    stats.totalInstallments++;
    stats.monthlyAmount += transaction.amount;
    
    if (transaction.is_projected) {
      stats.pendingAmount += transaction.amount;
      stats.pendingInstallments++;
    }
  });

  return stats;
};