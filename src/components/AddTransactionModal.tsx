
import { useState } from "react";
import { X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    description: "",
    value: "",
    bank: "",
    notes: "",
    date: "",
    category: ""
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStatementId, setSelectedStatementId] = useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-selecionar statement se houver apenas um
  useState(() => {
    if (selectedStatements.length === 1) {
      setSelectedStatementId(selectedStatements[0]);
    } else {
      setSelectedStatementId("");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.description || !formData.value || !selectedDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Verificar se precisa de statement_id para modo faturas
    if (selectedStatements.length > 0 && !selectedStatementId) {
      toast({
        title: "Erro",
        description: "Selecione um extrato para associar a transação",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('[ADD_MODAL] Submitting transaction:', { 
        type, 
        description: formData.description,
        amount: parseFloat(formData.value),
        date: selectedDate,
        selectedStatementId,
        selectedStatements
      });

      // Criar a transação diretamente no Supabase
      const transactionData = {
        user_id: user.id,
        description: formData.description,
        amount: parseFloat(formData.value),
        transaction_date: format(selectedDate, "yyyy-MM-dd"),
        is_credit: type === "receita",
        category: formData.category || (type === "receita" ? "Receita" : "Despesa"),
        statement_id: selectedStatementId || null,
        created_at: new Date().toISOString()
      };

      console.log('[ADD_MODAL] Transaction data to insert:', transactionData);

      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) {
        console.error('[ADD_MODAL] Error creating transaction:', error);
        toast({
          title: "Erro ao criar transação",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log('[ADD_MODAL] Transaction created successfully:', data);

      // Invalidar queries para refresh automático
      if (selectedStatementId) {
        // Invalidar query das transações filtradas
        queryClient.invalidateQueries({ 
          queryKey: ['filtered-transactions'] 
        });
        
        // Invalidar query dos statements para recalcular totais
        queryClient.invalidateQueries({ 
          queryKey: ['statements', selectedStatementId] 
        });
      }

      // Invalidar todas as queries de transações para garantir
      queryClient.invalidateQueries({ 
        queryKey: ['transactions'] 
      });

      toast({
        title: "Sucesso!",
        description: `${type === "receita" ? "Receita" : "Despesa"} adicionada com sucesso`,
      });

      // Chamar o callback de sucesso
      onSubmit(data);
      
      // Limpar o formulário
      setFormData({ 
        description: "", 
        value: "", 
        bank: "", 
        notes: "", 
        date: "",
        category: ""
      });
      setSelectedDate(new Date());
      setSelectedStatementId(selectedStatements.length === 1 ? selectedStatements[0] : "");
      
    } catch (error) {
      console.error('[ADD_MODAL] Error in handleSubmit:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao salvar a transação",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
    setIsDatePickerOpen(false);
  };

  const title = type === "receita" ? "Adicione uma receita ao sistema:" : "Adicione uma despesa ao sistema:";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">1 - Descrição da {type === "receita" ? "Receita" : "Despesa"}</Label>
            <Input
              id="description"
              placeholder={type === "receita" ? "Salário empresa são joão" : "Compra no supermercado"}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="value">2 - Valor {type === "receita" ? "Recebido" : "Gasto"}</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              placeholder="8500.00"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">3 - Categoria</Label>
            <Input
              id="category"
              placeholder={type === "receita" ? "Salário" : "Alimentação"}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes">4 - Notas</Label>
            <Textarea
              id="notes"
              placeholder="Descreva informações adicionais"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="date">5 - Data</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full mt-1 justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Seletor de Extrato - apenas quando há múltiplos statements */}
          {selectedStatements.length > 1 && (
            <div>
              <Label htmlFor="statement">6 - Associar ao Extrato</Label>
              <Select value={selectedStatementId} onValueChange={setSelectedStatementId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um extrato" />
                </SelectTrigger>
                <SelectContent>
                  {statementOptions.map((statement) => (
                    <SelectItem key={statement.id} value={statement.id}>
                      {statement.bank} - {statement.month}/{statement.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedStatements.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 Esta transação será associada ao{selectedStatements.length > 1 ? " extrato selecionado" : " extrato"} e aparecerá no filtro de faturas.
              </p>
              {selectedStatements.length === 1 && (
                <p className="text-xs text-blue-600 mt-1">
                  Extrato selecionado automaticamente
                </p>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-sage-300 hover:bg-sage-400 text-white mt-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Salvando..." : "Enviar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
