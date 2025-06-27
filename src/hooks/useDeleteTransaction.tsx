
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
    if (!user) {
      console.error('[DELETE] No authenticated user');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return false;
    }

    console.log('[DELETE] Starting deletion for transaction:', transactionId);
    setIsDeleting(true);
    
    try {
      // Primeiro, verificar se a transação existe e pertence ao usuário
      const { data: existingTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('id, user_id')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('[DELETE] Error fetching transaction:', fetchError);
        throw new Error('Transação não encontrada ou não pertence ao usuário');
      }

      if (!existingTransaction) {
        throw new Error('Transação não encontrada');
      }

      // Executar a exclusão
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[DELETE] Error deleting transaction:', deleteError);
        throw deleteError;
      }

      console.log('[DELETE] Transaction deleted successfully');

      // Invalidação agressiva de todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.refetchQueries({ queryKey: ['transactions'] });
      
      // Forçar atualização dos dados em cache
      queryClient.removeQueries({ queryKey: ['transactions'] });

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
