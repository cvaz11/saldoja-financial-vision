
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
      // Executar a exclusão
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user?.id);

      if (deleteError) {
        console.error('[DELETE] Error deleting transaction:', deleteError);
        throw deleteError;
      }

      console.log('[DELETE] Transaction deleted successfully');

      // Invalidar e refazer TODAS as queries de transações de forma mais agressiva
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.refetchQueries({ queryKey: ['transactions'] });
      
      // Forçar atualização imediata dos dados
      await queryClient.resetQueries({ queryKey: ['transactions'] });

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
