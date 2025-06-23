
import { useState } from "react";
import { X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  type: "receita" | "despesa";
}

const AddTransactionModal = ({ isOpen, onClose, onSubmit, type }: AddTransactionModalProps) => {
  const [formData, setFormData] = useState({
    description: "",
    value: "",
    bank: "",
    notes: "",
    date: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ description: "", value: "", bank: "", notes: "", date: "" });
    onClose();
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
            />
          </div>

          <div>
            <Label htmlFor="value">2 - Valor {type === "receita" ? "Recebido" : "Gasto"}</Label>
            <Input
              id="value"
              placeholder="8.500"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bank">3 - Banco</Label>
            <Input
              id="bank"
              placeholder="Nubank"
              value={formData.bank}
              onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
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
            <Button
              type="button"
              variant="outline"
              className="w-full mt-1 justify-start text-left font-normal"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Abrir Calendário
            </Button>
          </div>

          <Button type="submit" className="w-full bg-sage-300 hover:bg-sage-400 text-white mt-6">
            Enviar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
