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
}

export const useInstallmentTransactions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['installment-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar todas as transações com parcelas
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .not('installment_number', 'is', null)
        .not('installment_total', 'is', null)
        .gt('installment_total', 1)
        .order('transaction_date', { ascending: true });

      if (error) {
        console.error('[INSTALLMENTS] Error fetching:', error);
        throw error;
      }

      // Agrupar por série de parcelas e calcular estatísticas
      const installmentGroups = new Map<string, InstallmentTransaction[]>();
      
      (data || []).forEach(transaction => {
        const key = `${transaction.description.replace(/- Parcela \d+\/\d+/, '').trim()}_${transaction.installment_total}`;
        
        if (!installmentGroups.has(key)) {
          installmentGroups.set(key, []);
        }
        
        installmentGroups.get(key)!.push({
          ...transaction,
          is_projected: !transaction.statement_id
        });
      });

      // Converter para array plano com informações de grupo
      const result: (InstallmentTransaction & { groupKey?: string })[] = [];
      
      installmentGroups.forEach((transactions, groupKey) => {
        transactions.forEach(transaction => {
          result.push({
            ...transaction,
            groupKey
          });
        });
      });

      console.log(`[INSTALLMENTS] Found ${result.length} installment transactions in ${installmentGroups.size} groups`);
      
      return result;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useInstallmentStats = () => {
  const { data: transactions = [] } = useInstallmentTransactions();

  const stats = {
    totalGroups: 0,
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0,
    pendingInstallments: 0,
    paidInstallments: 0,
  };

  const groups = new Map<string, InstallmentTransaction[]>();
  
  transactions.forEach(transaction => {
    const key = `${transaction.description.replace(/- Parcela \d+\/\d+/, '').trim()}_${transaction.installment_total}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    
    groups.get(key)!.push(transaction);
  });

  stats.totalGroups = groups.size;

  groups.forEach(groupTransactions => {
    groupTransactions.forEach(transaction => {
      stats.totalAmount += transaction.amount;
      
      if (transaction.is_projected) {
        stats.pendingAmount += transaction.amount;
        stats.pendingInstallments++;
      } else {
        stats.paidAmount += transaction.amount;
        stats.paidInstallments++;
      }
    });
  });

  return stats;
};