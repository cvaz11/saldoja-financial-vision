
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

      // Invalidar TODAS as queries relacionadas a transações para forçar atualização completa
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Forçar refetch de todas as queries ativas relacionadas a transações
      await queryClient.refetchQueries({ queryKey: ['transactions'] });
      
      // Também invalidar queries de métricas que dependem das transações
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey.some(key => 
            typeof key === 'string' && 
            (key.includes('transaction') || key.includes('metrics'))
          );
        }
      });

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
