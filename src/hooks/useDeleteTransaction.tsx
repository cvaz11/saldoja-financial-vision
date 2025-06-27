
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
      // Executar a exclusão diretamente
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

      // Invalidação imediata de todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
