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

      // Agrupar transações por série de parcelas e eliminar duplicatas
      const seriesMap = new Map<string, any[]>();
      const seenCombinations = new Set<string>();
      
      (data || []).forEach(transaction => {
        // Gerar installment_id se não existe (baseado na descrição)
        const installmentId = transaction.installment_id || 
          `auto_${transaction.description?.replace(/[^a-zA-Z0-9]/g, '_')}_${transaction.installment_total}`;
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
        
        // Gerar apenas as parcelas do mês específico filtrado
        for (let i = 1; i <= baseTransaction.installment_total; i++) {
          // Calcular a data desta parcela específica
          const baseDate = new Date(baseTransaction.transaction_date);
          const parcelsFromBase = i - baseTransaction.installment_number; // Quantos meses à frente/atrás da base
          const installmentDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + parcelsFromBase, baseDate.getDate());
          
          const month = installmentDate.getMonth() + 1;
          const year = installmentDate.getFullYear();
          
          console.log(`[INSTALLMENTS] Parcela ${i}/${baseTransaction.installment_total} -> ${month}/${year} (filterMonth: ${filterMonth}/${filterYear})`);
          
          // FILTRO CRÍTICO: Se não é o mês que estamos visualizando, pular
          if (filterMonth && filterYear && (month !== filterMonth || year !== filterYear)) {
            console.log(`[INSTALLMENTS] Parcela ${i}/${baseTransaction.installment_total} PULA - não é ${filterMonth}/${filterYear}`);
            continue;
          }
          
          console.log(`[INSTALLMENTS] Parcela ${i}/${baseTransaction.installment_total} INCLUÍDA no mês ${month}/${year}`);
          
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
            // Criar projeção apenas se não existe no banco E está no mês correto
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
      console.log(`[INSTALLMENTS] Breakdown:`, allInstallments.map(i => `${i.installment_number}/${i.installment_total} (${i.transaction_date})`));
      
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