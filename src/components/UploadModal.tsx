
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
  const { uploadFile, uploadMultipleFiles, uploading } = useFileUpload();
  const { profile, updateProfile } = useUserProfile();
  const [formData, setFormData] = useState({
    files: [] as File[],
    bankName: "Nubank"
  });
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const files = Array.from(fileList);
      setFormData({ ...formData, files });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.files.length === 0 || !formData.bankName) {
      return;
    }

    // Use função de upload múltiplo se tiver mais de 1 arquivo
    if (formData.files.length > 1) {
      const result = await uploadMultipleFiles({
        files: formData.files,
        bankName: formData.bankName,
        isInvoicePaid: true
      });

      if (result.success) {
        setFormData({ files: [], bankName: "Nubank" });
        onClose();
        if (onSubmit) {
          onSubmit(formData);
        }
      }
    } else {
      // Upload único para um arquivo
      const result = await uploadFile({
        file: formData.files[0],
        bankName: formData.bankName,
        isInvoicePaid: true
      });

      if (result.success) {
        setFormData({ files: [], bankName: "Nubank" });
        onClose();
        if (onSubmit) {
          onSubmit(formData);
        }
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
            <p className="text-gray-600 mb-2">Arraste e solte ou escolha os arquivos para enviar</p>
            <p className="text-sm text-gray-500 mb-4">OFX, CSV, XLS ou XLSX (múltiplos arquivos permitidos)</p>
            <input
              type="file"
              accept=".ofx,.csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              multiple
            />
            <Label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {formData.files.length > 0 ? "Alterar Arquivos" : "Selecionar Arquivos"}
            </Label>
            {formData.files.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="text-sm font-medium text-green-600">
                  {formData.files.length} arquivo(s) selecionado(s):
                </p>
                {formData.files.map((file, index) => (
                  <p key={index} className="text-xs text-gray-600">
                    {file.name}
                  </p>
                ))}
              </div>
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


          <Button 
            type="submit" 
            className="w-full bg-sage-600 hover:bg-sage-700 text-white"
            disabled={uploading || formData.files.length === 0 || !formData.bankName}
          >
            {uploading ? `Enviando ${formData.files.length} arquivo(s)...` : `Enviar ${formData.files.length > 0 ? formData.files.length + ' arquivo(s)' : ''}`}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
