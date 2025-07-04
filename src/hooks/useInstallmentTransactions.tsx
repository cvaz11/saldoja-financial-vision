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

      // Buscar todas as transações com dados de parcela válidos
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .not('installment_number', 'is', null)
        .not('installment_total', 'is', null)
        .order('transaction_date', { ascending: true });

      if (error) {
        console.error('[INSTALLMENTS] Error fetching:', error);
        throw error;
      }

      console.log('[INSTALLMENTS] Raw transactions found:', data?.length || 0);

      // Gerar todas as parcelas (reais + projetadas) usando installment_id
      const allInstallments: InstallmentTransaction[] = [];
      const processedSeries = new Set<string>();

      (data || []).forEach(transaction => {
        // Verificar se já tem installment_id válido
        if (!transaction.installment_id) return;
        
        const installmentId = transaction.installment_id;
        
        // Evitar processar a mesma série múltiplas vezes
        if (processedSeries.has(installmentId)) return;
        processedSeries.add(installmentId);

        // Gerar todas as parcelas da série
        for (let i = 1; i <= transaction.installment_total; i++) {
          const installmentDate = new Date(transaction.transaction_date);
          // Ajustar o mês baseado no número da parcela
          installmentDate.setMonth(installmentDate.getMonth() + (i - transaction.installment_number));
          
          const month = installmentDate.getMonth() + 1;
          const year = installmentDate.getFullYear();
          
          // Se temos filtro de mês/ano, aplicar
          if (filterMonth && filterYear && (month !== filterMonth || year !== filterYear)) {
            continue;
          }
          
          // Verificar se já existe uma transação real para esta parcela
          const existingTransaction = data.find(t => 
            t.installment_id === installmentId &&
            t.installment_number === i &&
            t.installment_total === transaction.installment_total
          );

          if (existingTransaction) {
            // Usar a transação real
            allInstallments.push({
              ...existingTransaction,
              installment_id: installmentId,
              is_projected: false
            });
          } else {
            // Criar projeção apenas se não existe no banco
            const baseDescription = transaction.description?.replace(/- Parcela \d+\/\d+/, '').trim() || '';
            allInstallments.push({
              id: `projected-${installmentId}-${i}`,
              description: `${baseDescription} - Parcela ${i}/${transaction.installment_total}`,
              amount: transaction.amount,
              transaction_date: installmentDate.toISOString().split('T')[0],
              is_credit: transaction.is_credit,
              installment_number: i,
              installment_total: transaction.installment_total,
              category: transaction.category,
              user_id: transaction.user_id,
              statement_id: undefined,
              installment_id: installmentId,
              is_projected: true
            });
          }
        }
      });

      console.log(`[INSTALLMENTS] Generated ${allInstallments.length} installments for month ${filterMonth}/${filterYear}`);
      
      return allInstallments.sort((a, b) => 
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );
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