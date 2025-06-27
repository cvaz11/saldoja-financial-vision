
import { useState } from "react";
import { X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useUserProfile } from "@/hooks/useUserProfile";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
  onNavigateToMovimentacoes?: () => void;
}

const UploadModal = ({ isOpen, onClose, onSubmit, onNavigateToMovimentacoes }: UploadModalProps) => {
  const { uploadFile, uploading } = useFileUpload();
  const { profile, updateProfile } = useUserProfile();
  const [formData, setFormData] = useState({
    file: null as File | null,
    bankName: "Nubank"
  });
  const [closingDay, setClosingDay] = useState<string>(profile?.invoice_closing_day?.toString() || "5");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.file || !formData.bankName) {
      return;
    }

    // Atualizar dia de fechamento se foi alterado
    const newClosingDay = parseInt(closingDay);
    if (profile && profile.invoice_closing_day !== newClosingDay) {
      updateProfile({ invoice_closing_day: newClosingDay });
    }

    const result = await uploadFile({
      file: formData.file,
      bankName: formData.bankName,
      isInvoicePaid: true
    });

    if (result.success) {
      setFormData({ file: null, bankName: "Nubank" });
      onClose();
      if (onSubmit) {
        onSubmit(formData);
      }
      if (onNavigateToMovimentacoes) {
        setTimeout(() => {
          onNavigateToMovimentacoes();
        }, 2000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Enviar Extrato</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">Arraste e solte ou escolha o arquivo para enviar</p>
            <p className="text-sm text-gray-500 mb-4">OFX, CSV ou XLS</p>
            <input
              type="file"
              accept=".ofx,.csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Selecionar Arquivo
            </Label>
            {formData.file && (
              <p className="mt-2 text-sm text-green-600">
                Arquivo selecionado: {formData.file.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="bankName" className="text-base font-medium">Nome do Banco</Label>
            <Input
              id="bankName"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className="mt-2"
              placeholder="Digite o nome do banco"
              required
            />
          </div>

          <div>
            <Label htmlFor="closingDay" className="text-base font-medium">Dia de Fechamento da Fatura</Label>
            <Select value={closingDay} onValueChange={setClosingDay}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    Dia {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              Dia do mês em que sua fatura de cartão fecha
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-sage-600 hover:bg-sage-700 text-white"
            disabled={uploading || !formData.file || !formData.bankName}
          >
            {uploading ? "Enviando..." : "Enviar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
