
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

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  type: "receita" | "despesa";
  selectedStatements?: string[];
  statementOptions?: Array<{ id: string; bank: string; month: number; year: number }>;
}

const AddTransactionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  type,
  selectedStatements = [],
  statementOptions = []
}: AddTransactionModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: type === "receita" ? "Receita" : "Outros",
    transaction_date: new Date(),
    statement_id: selectedStatements.length === 1 ? selectedStatements[0] : ""
  });

  const categories = type === "receita" 
    ? ["Receita", "Salário", "Freelance", "Investimentos", "Outros"]
    : ["Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Vestuário", "Tecnologia", "Financeiro", "Outros"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('[ADD_TRANSACTION] No user found');
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

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast({
        title: "Erro",
        description: "Valor deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    // Validar statement_id se estivermos em modo faturas
    let finalStatementId = null;
    if (selectedStatements.length > 0) {
      if (selectedStatements.length === 1) {
        finalStatementId = selectedStatements[0];
      } else if (formData.statement_id) {
        finalStatementId = formData.statement_id;
      } else {
        toast({
          title: "Erro",
          description: "Selecione um extrato para associar a transação",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      console.log('[ADD_TRANSACTION] Preparing to save transaction');
      
      const transactionData = {
        user_id: user.id,
        statement_id: finalStatementId,
        transaction_date: formData.transaction_date.toISOString().split('T')[0],
        description: formData.description,
        amount: amount,
        category: formData.category,
        is_credit: type === "receita"
      };

      console.log('[ADD_TRANSACTION] Transaction data:', transactionData);

      const savedTransaction = await saveTransaction(transactionData);

      console.log('[ADD_TRANSACTION] Transaction saved successfully:', savedTransaction);

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
        statement_id: selectedStatements.length === 1 ? selectedStatements[0] : ""
      });

      onSubmit(savedTransaction);
      onClose();
    } catch (error: any) {
      console.error('[ADD_TRANSACTION] Complete error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar transação",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              placeholder="Ex: Salário, Almoço, etc."
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0,00"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
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
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.transaction_date, "PPP", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.transaction_date}
                  onSelect={(date) => date && setFormData({ ...formData, transaction_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Seleção de extrato quando há múltiplos extratos selecionados */}
          {selectedStatements.length > 1 && (
            <div>
              <Label htmlFor="statement">Extrato de Destino *</Label>
              <Select 
                value={formData.statement_id} 
                onValueChange={(value) => setFormData({ ...formData, statement_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o extrato" />
                </SelectTrigger>
                <SelectContent>
                  {statementOptions.map((statement) => (
                    <SelectItem key={statement.id} value={statement.id}>
                      {statement.bank} - {statement.month.toString().padStart(2, '0')}/{statement.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className={type === "receita" ? "bg-green-600 hover:bg-green-700" : "bg-sage-600 hover:bg-sage-700"}
            >
              {isLoading ? (type === "receita" ? "Salvando receita..." : "Salvando despesa...") : "Confirmar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionModal;
