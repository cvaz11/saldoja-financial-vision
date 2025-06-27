
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditTransaction } from "@/hooks/useEditTransaction";

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
  const { editTransaction, isEditing } = useEditTransaction();

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction && isOpen) {
      console.log('[EDIT MODAL] Setting form data for transaction:', transaction);
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
    if (!transaction) {
      console.error('[EDIT MODAL] No transaction provided');
      return;
    }

    // Validações
    if (!description.trim()) {
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }
    
    console.log('[EDIT MODAL] Attempting to save transaction:', transaction.id);
    
    const success = await editTransaction(transaction.id, {
      description: description.trim(),
      amount: numericAmount,
      category: category
    });
    
    if (success) {
      console.log('[EDIT MODAL] Edit successful, calling onSuccess');
      onSuccess();
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
              disabled={isEditing}
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
              disabled={isEditing}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory} disabled={isEditing}>
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
          <Button variant="outline" onClick={onClose} disabled={isEditing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isEditing || !description.trim() || !amount}
            className="bg-sage-600 hover:bg-sage-700"
          >
            {isEditing ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionModal;
