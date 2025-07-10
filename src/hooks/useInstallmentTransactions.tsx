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
        .not('installment_id', 'is', null)
        .order('installment_id', { ascending: true })
        .order('installment_number', { ascending: true })
        .order('transaction_date', { ascending: true });

      if (error) {
        console.error('[INSTALLMENTS] Error fetching:', error);
        throw error;
      }

      console.log('[INSTALLMENTS] Raw transactions found:', data?.length || 0);

      // Agrupar transações por série de parcelas e eliminar duplicatas
      const seriesMap = new Map<string, any[]>();
      const seenCombinations = new Set<string>();
      
      (data || []).forEach(transaction => {
        const installmentId = transaction.installment_id;
        const uniqueKey = `${installmentId}-${transaction.installment_number}`;
        
        // Evitar duplicatas - só adicionar se não vimos esta combinação antes
        if (!seenCombinations.has(uniqueKey)) {
          seenCombinations.add(uniqueKey);
          
          if (!seriesMap.has(installmentId)) {
            seriesMap.set(installmentId, []);
          }
          seriesMap.get(installmentId)!.push({ ...transaction, installment_id: installmentId });
        }
      });

      const allInstallments: InstallmentTransaction[] = [];

      // Processar cada série uma única vez
      seriesMap.forEach((transactions, installmentId) => {
        // Pegar a primeira transação como base para gerar a série
        const baseTransaction = transactions[0];
        
        // Gerar todas as parcelas da série
        for (let i = 1; i <= baseTransaction.installment_total; i++) {
          const installmentDate = new Date(baseTransaction.transaction_date);
          // Ajustar o mês baseado no número da parcela
          installmentDate.setMonth(installmentDate.getMonth() + (i - baseTransaction.installment_number));
          
          const month = installmentDate.getMonth() + 1;
          const year = installmentDate.getFullYear();
          
          // Se temos filtro de mês/ano, aplicar
          if (filterMonth && filterYear && (month !== filterMonth || year !== filterYear)) {
            continue;
          }
          
          // Verificar se já existe uma transação real para esta parcela
          const existingTransaction = transactions.find(t => 
            t.installment_number === i &&
            t.installment_total === baseTransaction.installment_total
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
            const baseDescription = baseTransaction.description?.replace(/- Parcela \d+\/\d+/, '').trim() || '';
            allInstallments.push({
              id: `projected-${installmentId}-${i}`,
              description: `${baseDescription} - Parcela ${i}/${baseTransaction.installment_total}`,
              amount: baseTransaction.amount,
              transaction_date: installmentDate.toISOString().split('T')[0],
              is_credit: baseTransaction.is_credit,
              installment_number: i,
              installment_total: baseTransaction.installment_total,
              category: baseTransaction.category,
              user_id: baseTransaction.user_id,
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