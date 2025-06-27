
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  transaction_date: string;
  user_id?: string;
}

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = [
  'Alimentação',
  'Transporte', 
  'Saúde',
  'Lazer',
  'Educação',
  'Casa',
  'Vestuário',
  'Tecnologia',
  'Financeiro',
  'Salário',
  'Outros'
];

const EditTransactionModal = ({ transaction, isOpen, onClose, onSuccess }: EditTransactionModalProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Outros');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction && isOpen) {
      console.log('[EDIT] Setting form data for transaction:', transaction);
      setDescription(transaction.description || '');
      setAmount(transaction.amount?.toString() || '');
      setCategory(transaction.category || 'Outros');
    }
  }, [transaction, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDescription('');
      setAmount('');
      setCategory('Outros');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!transaction || !user) {
      console.error('[EDIT] Missing transaction or user');
      toast({
        title: "Erro",
        description: "Dados insuficientes para edição",
        variant: "destructive",
      });
      return;
    }

    // Validações
    if (!description.trim()) {
      toast({
        title: "Erro",
        description: "Descrição é obrigatória",
        variant: "destructive",
      });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Erro",
        description: "Valor deve ser um número positivo",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    console.log('[EDIT] Starting update for transaction:', transaction.id);
    
    try {
      // Primeiro verificar se a transação ainda existe e pertence ao usuário
      const { data: existingTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('id, user_id')
        .eq('id', transaction.id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !existingTransaction) {
        console.error('[EDIT] Transaction not found or access denied:', fetchError);
        throw new Error('Transação não encontrada ou sem permissão para editar');
      }

      // Executar a atualização
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          description: description.trim(),
          amount: numericAmount,
          category: category
        })
        .eq('id', transaction.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[EDIT] Error updating transaction:', updateError);
        throw updateError;
      }

      console.log('[EDIT] Transaction updated successfully');

      // Invalidação agressiva de queries
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.refetchQueries({ queryKey: ['transactions'] });
      
      // Remover dados em cache para forçar nova busca
      queryClient.removeQueries({ queryKey: ['transactions'] });

      toast({
        title: "Sucesso",
        description: "Transação atualizada com sucesso!",
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('[EDIT] Error updating transaction:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a transação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite a descrição"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-xs text-gray-500">
            Data: {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || !description.trim() || !amount}
            className="bg-sage-600 hover:bg-sage-700"
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionModal;
