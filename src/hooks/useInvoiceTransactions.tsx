
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { InvoiceFilterConfig } from "@/components/InvoiceFilter";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  is_credit: boolean;
  installment_number?: number;
  installment_total?: number;
  category?: string;
  statement_id: string;
  statements: {
    bank: string;
    closing_day: number;
  };
}

export const useInvoiceTransactions = (config: InvoiceFilterConfig, enabled: boolean = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoice-transactions', config, user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user) return [];

      console.log('[INVOICE_QUERY] Fetching transactions with config:', config);

      // Calcular range de datas baseado no mês de fatura e dias de fechamento
      const invoiceMonth = new Date(config.year, config.month - 1);
      const currentMonth = new Date();
      
      // Se estamos consultando faturas do mês atual ou futuro, incluir até a data atual
      // Se é mês passado, incluir o mês completo
      const endDate = config.year === currentMonth.getFullYear() && config.month === currentMonth.getMonth() + 1
        ? currentMonth
        : new Date(config.year, config.month, 0); // Último dia do mês

      const startDate = new Date(config.year, config.month - 2, 1); // Primeiro dia do mês anterior

      console.log('[INVOICE_QUERY] Date range:', { startDate, endDate });

      // Extrair informações dos bancos selecionados
      const selectedBankFilters = config.selectedBanks.map(bankKey => {
        const [bank, closingDay] = bankKey.split('_');
        return { bank, closing_day: parseInt(closingDay) };
      });

      if (selectedBankFilters.length === 0) {
        console.log('[INVOICE_QUERY] No banks selected, returning empty');
        return [];
      }

      // Construir query com filtros de banco e dia de fechamento
      let query = supabase
        .from('transactions')
        .select(`
          *,
          statements!inner(bank, closing_day)
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0]);

      // Aplicar filtro de bancos usando OR
      const bankFilters = selectedBankFilters.map(filter => 
        `and(statements.bank.eq.${filter.bank},statements.closing_day.eq.${filter.closing_day})`
      ).join(',');

      if (bankFilters) {
        query = query.or(bankFilters);
      }

      // Filtrar apenas faturas que vencem até o cutoff day no mês atual
      query = query.lte('statements.closing_day', config.cutoffDay);

      const { data, error } = await query.order('transaction_date', { ascending: false });

      if (error) {
        console.error('[INVOICE_QUERY] Error fetching transactions:', error);
        throw error;
      }

      console.log('[INVOICE_QUERY] Found transactions:', data?.length || 0);

      return data as Transaction[] || [];
    },
    enabled: enabled && !!user && config.selectedBanks.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
