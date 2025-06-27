
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
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        throw error;
      }

      // Invalidar todas as queries relacionadas a transações para forçar atualização
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso",
      });

      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir a transação",
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
