
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export const useDeleteTransaction = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const deleteTransaction = async (transactionId: string) => {
    console.log('[DELETE] Starting deletion for transaction:', transactionId);
    setIsDeleting(true);
    
    try {
      // Primeiro, verificar se a transação existe
      const { data: existingTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) {
        console.error('[DELETE] Error fetching transaction:', fetchError);
        throw new Error('Transação não encontrada');
      }

      console.log('[DELETE] Transaction found:', existingTransaction);

      // Executar a exclusão
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user?.id); // Garantir que só deleta transações do usuário atual

      if (deleteError) {
        console.error('[DELETE] Error deleting transaction:', deleteError);
        throw deleteError;
      }

      console.log('[DELETE] Transaction deleted successfully');

      // Invalidar e recarregar TODAS as queries relacionadas
      const queryKeysToInvalidate = [
        ['transactions'],
        ['metrics'],
        ['transaction-metrics'],
        ['current-invoice-cycle-transactions']
      ];

      // Invalidar todas as queries em paralelo
      await Promise.all([
        ...queryKeysToInvalidate.map(key => 
          queryClient.invalidateQueries({ queryKey: key })
        ),
        // Também invalidar qualquer query que contenha 'transaction' no nome
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const queryKey = query.queryKey as string[];
            return queryKey.some(key => 
              typeof key === 'string' && 
              (key.includes('transaction') || key.includes('metrics'))
            );
          }
        })
      ]);

      // Forçar refetch imediato
      await Promise.all([
        ...queryKeysToInvalidate.map(key => 
          queryClient.refetchQueries({ queryKey: key })
        )
      ]);

      console.log('[DELETE] All queries invalidated and refetched');

      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso",
      });

      return true;
    } catch (error: any) {
      console.error('[DELETE] Complete error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir a transação",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteTransaction,
    isDeleting,
  };
};
