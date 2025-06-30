
import { supabase } from "@/integrations/supabase/client";

export interface SaveTransactionData {
  user_id: string;
  statement_id?: string | null;
  transaction_date: string;
  description: string;
  amount: number;
  category: string;
  is_credit: boolean;
}

export const saveTransaction = async (data: SaveTransactionData) => {
  console.log('[TRANSACTION_SERVICE] Saving transaction:', data);

  // Validações básicas
  if (!data.description.trim()) {
    throw new Error('Descrição é obrigatória');
  }

  if (data.amount <= 0) {
    throw new Error('Valor deve ser maior que zero');
  }

  if (!data.user_id) {
    throw new Error('Usuário não autenticado');
  }

  // Preparar dados para inserção
  const transactionData = {
    user_id: data.user_id,
    statement_id: data.statement_id,
    transaction_date: data.transaction_date,
    description: data.description.trim(),
    amount: parseFloat(data.amount.toString()),
    category: data.category,
    is_credit: data.is_credit
  };

  console.log('[TRANSACTION_SERVICE] Inserting data:', transactionData);

  const { data: insertedData, error } = await supabase
    .from('transactions')
    .insert([transactionData])
    .select('*')
    .single();

  if (error) {
    console.error('[TRANSACTION_SERVICE] Insert error:', error);
    throw new Error(`Erro ao salvar transação: ${error.message}`);
  }

  console.log('[TRANSACTION_SERVICE] Transaction saved successfully:', insertedData);
  return insertedData;
};
