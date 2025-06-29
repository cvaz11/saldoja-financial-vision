
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AddMissingTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  statementId: string;
  onSuccess: () => void;
}

const AddMissingTransactionModal = ({
  isOpen,
  onClose,
  statementId,
  onSuccess
}: AddMissingTransactionModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    transaction_date: "",
    category: "Outros",
    installment_number: "",
    installment_total: ""
  });

  const categories = [
    "Alimentação",
    "Transporte", 
    "Tecnologia",
    "Saúde",
    "Compras",
    "Lazer",
    "Financeiro",
    "Serviços",
    "Outros"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          statement_id: statementId,
          description: formData.description,
          amount: parseFloat(formData.amount),
          transaction_date: formData.transaction_date,
          category: formData.category,
          installment_number: formData.installment_number ? parseInt(formData.installment_number) : null,
          installment_total: formData.installment_total ? parseInt(formData.installment_total) : null,
          is_credit: false
        });

      if (error) throw error;

      toast({
        title: "Transação adicionada",
        description: "A transação foi adicionada com sucesso ao extrato.",
      });

      onSuccess();
      onClose();
      setFormData({
        description: "",
        amount: "",
        transaction_date: "",
        category: "Outros",
        installment_number: "",
        installment_total: ""
      });
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a transação.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Adicionar Transação Faltante
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Agi*Tute Tech - Parcela 9/12"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0,00"
              required
            />
          </div>

          <div>
            <Label htmlFor="date">Data da Transação</Label>
            <Input
              id="date"
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="installment_number">Parcela Atual</Label>
              <Input
                id="installment_number"
                type="number"
                value={formData.installment_number}
                onChange={(e) => setFormData({ ...formData, installment_number: e.target.value })}
                placeholder="9"
              />
            </div>
            <div>
              <Label htmlFor="installment_total">Total de Parcelas</Label>
              <Input
                id="installment_total"
                type="number"
                value={formData.installment_total}
                onChange={(e) => setFormData({ ...formData, installment_total: e.target.value })}
                placeholder="12"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar Transação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMissingTransactionModal;
