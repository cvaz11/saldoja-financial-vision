
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

interface EditTransactionData {
  description: string;
  amount: number;
  category: string;
}

export const useEditTransaction = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const editTransaction = async (transactionId: string, data: EditTransactionData) => {
    if (!user) {
      console.error('[EDIT] No authenticated user');
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return false;
    }

    console.log('[EDIT] Starting edit for transaction:', transactionId, data);
    setIsEditing(true);
    
    try {
      // Executar a atualização diretamente
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          description: data.description.trim(),
          amount: data.amount,
          category: data.category
        })
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[EDIT] Error updating transaction:', updateError);
        throw updateError;
      }

      console.log('[EDIT] Transaction updated successfully');

      // Invalidação imediata de todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.removeQueries({ queryKey: ['transactions'] });

      toast({
        title: "Sucesso",
        description: "Transação atualizada com sucesso!",
      });

      return true;
    } catch (error: any) {
      console.error('[EDIT] Complete error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar a transação",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsEditing(false);
    }
  };

  return {
    editTransaction,
    isEditing,
  };
};
