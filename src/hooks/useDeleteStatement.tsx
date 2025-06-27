
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export const useDeleteStatement = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const getTransactionCount = async (statementId: string) => {
    if (!user) return 0;

    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('statement_id', statementId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[DELETE_STATEMENT] Error counting transactions:', error);
      return 0;
    }

    return count || 0;
  };

  const deleteStatement = async (statementId: string) => {
    if (!user) {
      console.error('[DELETE_STATEMENT] No authenticated user');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return false;
    }

    console.log('[DELETE_STATEMENT] Starting deletion for statement:', statementId);
    setIsDeleting(true);
    
    try {
      // Primeiro, excluir todas as transações associadas
      console.log('[DELETE_STATEMENT] Deleting associated transactions...');
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('statement_id', statementId)
        .eq('user_id', user.id);

      if (transactionsError) {
        console.error('[DELETE_STATEMENT] Error deleting transactions:', transactionsError);
        throw transactionsError;
      }

      // Depois, excluir o extrato
      console.log('[DELETE_STATEMENT] Deleting statement...');
      const { error: statementError } = await supabase
        .from('statements')
        .delete()
        .eq('id', statementId)
        .eq('user_id', user.id);

      if (statementError) {
        console.error('[DELETE_STATEMENT] Error deleting statement:', statementError);
        throw statementError;
      }

      console.log('[DELETE_STATEMENT] Statement and transactions deleted successfully');

      // Invalidar todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['statements'] });
      queryClient.removeQueries({ queryKey: ['transactions'] });
      queryClient.removeQueries({ queryKey: ['statements'] });

      toast({
        title: "Sucesso",
        description: "Extrato e todas as transações associadas foram excluídos com sucesso",
      });

      return true;
    } catch (error: any) {
      console.error('[DELETE_STATEMENT] Complete error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir o extrato",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteStatement,
    getTransactionCount,
    isDeleting,
  };
};
