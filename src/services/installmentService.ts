
import { supabase } from "@/integrations/supabase/client";

interface InstallmentTransaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  installment_number: number;
  installment_total: number;
  category?: string;
  user_id: string;
  is_projected?: boolean;
}

interface FutureInstallment {
  id: string; // Added missing id property
  description: string;
  amount: number;
  transaction_date: string;
  installment_number: number;
  installment_total: number;
  category?: string;
  user_id: string;
  is_projected: true;
  original_transaction_id: string;
}

export const generateFutureInstallments = (
  transaction: InstallmentTransaction
): FutureInstallment[] => {
  if (!transaction.installment_number || !transaction.installment_total) {
    return [];
  }

  const futureInstallments: FutureInstallment[] = [];
  const baseDate = new Date(transaction.transaction_date);
  
  // Gerar parcelas futuras
  for (let i = transaction.installment_number + 1; i <= transaction.installment_total; i++) {
    const futureDate = new Date(baseDate);
    futureDate.setMonth(futureDate.getMonth() + (i - transaction.installment_number));
    
    futureInstallments.push({
      id: `future-${transaction.id}-${i}`, // Generate a unique id for future installments
      description: transaction.description,
      amount: transaction.amount,
      transaction_date: futureDate.toISOString().split('T')[0],
      installment_number: i,
      installment_total: transaction.installment_total,
      category: transaction.category,
      user_id: transaction.user_id,
      is_projected: true,
      original_transaction_id: transaction.id
    });
  }

  return futureInstallments;
};

export const mergeProjectedTransactions = (
  realTransactions: InstallmentTransaction[],
  projectedTransactions: FutureInstallment[]
): (InstallmentTransaction | FutureInstallment)[] => {
  const merged = [...realTransactions];
  
  // Adicionar projeções que não conflitam com transações reais
  projectedTransactions.forEach(projected => {
    const hasRealTransaction = realTransactions.some(real => 
      real.description === projected.description &&
      real.installment_number === projected.installment_number &&
      real.installment_total === projected.installment_total &&
      new Date(real.transaction_date).getMonth() === new Date(projected.transaction_date).getMonth() &&
      new Date(real.transaction_date).getFullYear() === new Date(projected.transaction_date).getFullYear()
    );
    
    if (!hasRealTransaction) {
      merged.push(projected);
    }
  });

  return merged.sort((a, b) => 
    new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  );
};

export const getInstallmentTransactions = async (
  userId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<InstallmentTransaction[]> => {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('installment_number', 'is', null)
    .not('installment_total', 'is', null);

  if (dateFrom) {
    query = query.gte('transaction_date', dateFrom.toISOString().split('T')[0]);
  }

  if (dateTo) {
    query = query.lte('transaction_date', dateTo.toISOString().split('T')[0]);
  }

  const { data, error } = await query.order('transaction_date', { ascending: false });

  if (error) {
    console.error('[INSTALLMENTS] Error fetching installment transactions:', error);
    throw error;
  }

  return data || [];
};

export const getProjectedInstallments = async (
  userId: string,
  monthsAhead: number = 12
): Promise<FutureInstallment[]> => {
  // Buscar todas as parcelas ativas (que ainda têm parcelas futuras)
  const { data: activeInstallments, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .not('installment_number', 'is', null)
    .not('installment_total', 'is', null);

  if (error) {
    console.error('[PROJECTIONS] Error fetching active installments:', error);
    throw error;
  }

  const allProjections: FutureInstallment[] = [];
  
  (activeInstallments || []).forEach(transaction => {
    // Only generate projections for transactions that have future installments
    if (transaction.installment_number < transaction.installment_total) {
      const projections = generateFutureInstallments(transaction);
      
      // Filtrar apenas projeções dentro do período desejado
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + monthsAhead);
      
      const filteredProjections = projections.filter(p => 
        new Date(p.transaction_date) <= maxDate
      );
      
      allProjections.push(...filteredProjections);
    }
  });

  return allProjections;
};
