
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
      // First, get the statement to retrieve file_url and confirm ownership
      console.log('[DELETE_STATEMENT] Getting statement details...');
      const { data: statement, error: getError } = await supabase
        .from('statements')
        .select('file_url, user_id')
        .eq('id', statementId)
        .single();

      if (getError) {
        console.error('[DELETE_STATEMENT] Error getting statement:', getError);
        toast({
          title: "Erro",
          description: `Erro ao buscar extrato: ${getError.message}`,
          variant: "destructive",
        });
        return false;
      }

      if (!statement) {
        console.error('[DELETE_STATEMENT] Statement not found');
        toast({
          title: "Erro",
          description: "Extrato não encontrado",
          variant: "destructive",
        });
        return false;
      }

      // Verify ownership
      if (statement.user_id !== user.id) {
        console.error('[DELETE_STATEMENT] User does not own this statement');
        toast({
          title: "Erro",
          description: "Você não tem permissão para excluir este extrato",
          variant: "destructive",
        });
        return false;
      }

      // Delete the file from storage if it exists
      if (statement.file_url) {
        console.log('[DELETE_STATEMENT] Deleting file from storage:', statement.file_url);
        const { error: storageError } = await supabase.storage
          .from('statements')
          .remove([statement.file_url]);

        if (storageError) {
          console.error('[DELETE_STATEMENT] Error deleting file from storage:', storageError);
          toast({
            title: "Aviso",
            description: `Erro ao remover arquivo: ${storageError.message}. Continuando com exclusão do registro.`,
          });
        } else {
          console.log('[DELETE_STATEMENT] ✅ File deleted from storage successfully');
        }
      }

      // Delete the statement (transactions will be automatically deleted via CASCADE)
      console.log('[DELETE_STATEMENT] Deleting statement from database...');
      const { error: deleteError, count } = await supabase
        .from('statements')
        .delete({ count: 'exact' })
        .eq('id', statementId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[DELETE_STATEMENT] Error deleting statement:', deleteError);
        toast({
          title: "Erro",
          description: `Falha ao excluir extrato: ${deleteError.message}`,
          variant: "destructive",
        });
        return false;
      }

      if (count === 0) {
        console.error('[DELETE_STATEMENT] No rows were deleted');
        toast({
          title: "Erro",
          description: "Nenhum registro foi excluído. Verifique se o extrato ainda existe.",
          variant: "destructive",
        });
        return false;
      }

      console.log('[DELETE_STATEMENT] ✅ Statement and related data deleted successfully. Rows affected:', count);

      // Clear and invalidate cache
      queryClient.removeQueries({ queryKey: ['transactions'] });
      queryClient.removeQueries({ queryKey: ['statements'] });
      queryClient.removeQueries({ queryKey: ['invoice-transactions'] });
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['statements'] }),
        queryClient.invalidateQueries({ queryKey: ['invoice-transactions'] })
      ]);

      toast({
        title: "Sucesso",
        description: "Extrato e todas as transações associadas foram excluídos com sucesso",
      });

      return true;
    } catch (error: any) {
      console.error('[DELETE_STATEMENT] Unexpected error:', error);
      toast({
        title: "Erro",
        description: `Erro inesperado: ${error.message || 'Erro desconhecido'}`,
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
