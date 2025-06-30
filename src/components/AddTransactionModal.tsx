
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { saveTransaction } from "@/services/transactionService";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  type: "receita" | "despesa";
}

const AddTransactionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  type
}: AddTransactionModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: type === "receita" ? "Receita" : "Outros",
    transaction_date: new Date(),
    statement_id: ""
  });

  // Buscar extratos disponíveis do usuário
  const { data: availableStatements = [] } = useQuery({
    queryKey: ['available-statements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('statements')
        .select('id, bank, month, year, filename')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) {
        console.error('[STATEMENTS] Error fetching:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user && isOpen
  });

  const categories = type === "receita" 
    ? ["Receita", "Salário", "Freelance", "Investimentos", "Outros"]
    : ["Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Outros"];

  // Handler para mudança do valor - permitir números, vírgula e ponto
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir números, vírgula e ponto
    if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
      setFormData({ ...formData, amount: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    // Validações do formulário
    if (!formData.description.trim()) {
      toast({
        title: "Erro",
        description: "Descrição é obrigatória",
        variant: "destructive",
      });
      return;
    }

    // Converter vírgula para ponto e validar valor
    const amountStr = formData.amount.replace(',', '.');
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0 || isNaN(amount)) {
      toast({
        title: "Erro",
        description: "Valor deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    // Validar seleção do extrato
    if (!formData.statement_id) {
      toast({
        title: "Erro",
        description: "Selecione um extrato para associar a transação",
        variant: "destructive",
      });
      return;
    }

    console.log('[ADD_TRANSACTION] Submitting with data:', {
      statement_id: formData.statement_id,
      type,
      amount
    });

    setIsLoading(true);

    try {
      const transactionData = {
        user_id: user.id,
        statement_id: formData.statement_id,
        transaction_date: formData.transaction_date.toISOString().split('T')[0],
        description: formData.description.trim(),
        amount: amount,
        category: formData.category,
        is_credit: type === "receita"
      };

      console.log('[ADD_TRANSACTION] Saving transaction:', transactionData);

      const savedTransaction = await saveTransaction(transactionData);

      console.log('[ADD_TRANSACTION] Transaction saved successfully:', savedTransaction);

      // Invalidar todas as queries relacionadas para garantir atualização
      await queryClient.invalidateQueries({ queryKey: ['filtered-transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Forçar refetch imediato
      await queryClient.refetchQueries({ queryKey: ['filtered-transactions'] });

      toast({
        title: "Sucesso",
        description: `${type === "receita" ? "Receita" : "Despesa"} adicionada com sucesso!`,
      });

      // Reset form
      setFormData({
        description: "",
        amount: "",
        category: type === "receita" ? "Receita" : "Outros",
        transaction_date: new Date(),
        statement_id: ""
      });

      onSubmit(savedTransaction);
      onClose();
    } catch (error: any) {
      console.error('[ADD_TRANSACTION] Error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar transação",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        description: "",
        amount: "",
        category: type === "receita" ? "Receita" : "Outros",
        transaction_date: new Date(),
        statement_id: ""
      });
    }
  }, [isOpen, type]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Adicionar {type === "receita" ? "Receita" : "Despesa"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Salário, Freelance, etc."
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              type="text"
              value={formData.amount}
              onChange={handleAmountChange}
              placeholder="0,00"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
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

          <div>
            <Label>Data da Transação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal"
                  disabled={isLoading}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.transaction_date, "PPP", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.transaction_date}
                  onSelect={(date) => {
                    if (date) {
                      setFormData({ ...formData, transaction_date: date });
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="statement">Extrato *</Label>
            <Select 
              value={formData.statement_id} 
              onValueChange={(value) => setFormData({ ...formData, statement_id: value })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o extrato" />
              </SelectTrigger>
              <SelectContent>
                {availableStatements.map((statement) => (
                  <SelectItem key={statement.id} value={statement.id}>
                    {statement.bank} - {statement.month.toString().padStart(2, '0')}/{statement.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className={type === "receita" ? "bg-green-600 hover:bg-green-700" : "bg-sage-600 hover:bg-sage-700"}
            >
              {isLoading ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionModal;
