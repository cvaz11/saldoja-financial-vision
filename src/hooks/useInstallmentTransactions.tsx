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

      // Buscar TODAS as parcelas sem filtro de data primeiro
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .not('installment_number', 'is', null)
        .not('installment_total', 'is', null);

      const { data, error } = await query.order('transaction_date', { ascending: true });

      if (error) {
        console.error('[INSTALLMENTS] Error fetching:', error);
        throw error;
      }

      console.log('[INSTALLMENTS] Raw transactions found:', data?.length || 0);

      // Agrupar por installment_id e calcular qual parcela deve aparecer no período
      const installmentGroups = new Map<string, any[]>();
      
      (data || []).forEach(transaction => {
        const installmentId = transaction.installment_id || `auto_${transaction.description?.replace(/[^a-zA-Z0-9]/g, '_')}_${transaction.installment_total}`;
        
        if (!installmentGroups.has(installmentId)) {
          installmentGroups.set(installmentId, []);
        }
        installmentGroups.get(installmentId)!.push(transaction);
      });

      // Para cada grupo, determinar qual parcela deve aparecer no mês/ano filtrado
      const installments: InstallmentTransaction[] = [];
      
      installmentGroups.forEach((transactions, installmentId) => {
        // Ordenar por installment_number
        transactions.sort((a, b) => a.installment_number - b.installment_number);
        
        // Encontrar a primeira parcela paga (com statement_id)
        const firstPaidInstallment = transactions.find(t => t.statement_id);
        
        if (!firstPaidInstallment) return; // Pular se não há parcela paga
        
        // Calcular qual parcela deveria estar no período solicitado
        const firstPaidDate = new Date(firstPaidInstallment.transaction_date);
        const targetDate = new Date(filterYear!, filterMonth! - 1, firstPaidDate.getDate());
        
        // Calcular diferença em meses
        const monthsDiff = (filterYear! - firstPaidDate.getFullYear()) * 12 + (filterMonth! - 1 - firstPaidDate.getMonth());
        const targetInstallmentNumber = firstPaidInstallment.installment_number + monthsDiff;
        
        // Verificar se o installment_number calculado é válido
        if (targetInstallmentNumber < 1 || targetInstallmentNumber > firstPaidInstallment.installment_total) {
          console.log(`[INSTALLMENTS] Skipping installment ${targetInstallmentNumber} for ${installmentId} (out of range 1-${firstPaidInstallment.installment_total})`);
          return;
        }
        
        // Verificar se já existe essa parcela no banco
        const existingTransaction = transactions.find(t => t.installment_number === targetInstallmentNumber);
        
        if (existingTransaction) {
          // Usar transação existente
          installments.push({
            id: existingTransaction.id,
            description: existingTransaction.description || '',
            amount: existingTransaction.amount,
            transaction_date: existingTransaction.transaction_date,
            is_credit: existingTransaction.is_credit || false,
            installment_number: existingTransaction.installment_number,
            installment_total: existingTransaction.installment_total,
            category: existingTransaction.category,
            user_id: existingTransaction.user_id,
            statement_id: existingTransaction.statement_id,
            installment_id: installmentId,
            is_projected: !existingTransaction.statement_id
          });
        } else {
          // Criar parcela projetada
          const baseDescription = firstPaidInstallment.description?.replace(/- Parcela \d+\/\d+/, '').trim() || '';
          installments.push({
            id: `projected_${installmentId}_${targetInstallmentNumber}`,
            description: `${baseDescription} - Parcela ${targetInstallmentNumber}/${firstPaidInstallment.installment_total}`,
            amount: firstPaidInstallment.amount,
            transaction_date: targetDate.toISOString().split('T')[0],
            is_credit: firstPaidInstallment.is_credit || false,
            installment_number: targetInstallmentNumber,
            installment_total: firstPaidInstallment.installment_total,
            category: firstPaidInstallment.category,
            user_id: firstPaidInstallment.user_id,
            statement_id: undefined,
            installment_id: installmentId,
            is_projected: true
          });
        }
      });

      console.log(`[INSTALLMENTS] Generated ${installments.length} installments for month ${filterMonth}/${filterYear}`);
      console.log(`[INSTALLMENTS] Details:`, installments.map(i => `${i.installment_number}/${i.installment_total} on ${i.transaction_date} (projected: ${i.is_projected})`));
      
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