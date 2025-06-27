
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

      // Invalidar TODAS as queries relacionadas - abordagem mais agressiva
      await queryClient.invalidateQueries();
      
      // Aguardar um pouco e forçar refetch
      setTimeout(() => {
        queryClient.refetchQueries();
      }, 100);

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
