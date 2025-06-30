
import { useState } from "react";
import { X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  type: "receita" | "despesa";
  selectedStatements?: string[]; // Para associar a transação a um extrato específico
}

const AddTransactionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  type, 
  selectedStatements = [] 
}: AddTransactionModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    description: "",
    value: "",
    bank: "",
    notes: "",
    date: "",
    category: ""
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.description || !formData.value || !selectedDate) {
      console.error('[ADD_MODAL] Missing required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('[ADD_MODAL] Submitting transaction:', { 
        type, 
        description: formData.description,
        amount: parseFloat(formData.value),
        date: selectedDate,
        selectedStatements
      });

      // Determinar qual statement_id usar (se houver extratos selecionados)
      let statementId = null;
      if (selectedStatements.length > 0) {
        // Usar o primeiro extrato selecionado
        statementId = selectedStatements[0];
        console.log('[ADD_MODAL] Associating to statement:', statementId);
      }

      // Criar a transação diretamente no Supabase
      const transactionData = {
        user_id: user.id,
        description: formData.description,
        amount: parseFloat(formData.value),
        transaction_date: format(selectedDate, "yyyy-MM-dd"),
        is_credit: type === "receita",
        category: formData.category || (type === "receita" ? "Receita" : "Despesa"),
        statement_id: statementId // Associar ao extrato se disponível
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) {
        console.error('[ADD_MODAL] Error creating transaction:', error);
        throw error;
      }

      console.log('[ADD_MODAL] Transaction created successfully:', data);

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
      
    } catch (error) {
      console.error('[ADD_MODAL] Error in handleSubmit:', error);
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

          {selectedStatements.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 Esta transação será associada aos extratos selecionados e aparecerá no filtro de faturas.
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-sage-300 hover:bg-sage-400 text-white mt-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
