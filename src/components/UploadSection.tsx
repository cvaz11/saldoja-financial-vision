
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadSectionProps {
  onUpload: () => void;
}

const UploadSection = ({ onUpload }: UploadSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Extratos (upload)</h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Button 
          onClick={onUpload}
          className="w-full bg-sage-300 hover:bg-sage-400 text-white py-4 rounded-lg flex items-center justify-center space-x-2"
        >
          <Upload className="h-5 w-5" />
          <span>Selecionar Arquivo (PDF, CSV, OFX)</span>
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="bg-sage-100 p-4 rounded-t-lg">
          <div className="grid grid-cols-5 gap-4 font-medium text-gray-700">
            <span>Descrição</span>
            <span>Banco</span>
            <span>Informações</span>
            <span>Data</span>
            <span>Status</span>
          </div>
        </div>
        
        <div className="p-8 text-center text-gray-500">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid grid-cols-5 gap-4 py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center mr-3">
                    💳
                  </div>
                  <span className="text-sm">BancoInter fatura 06-24</span>
                </div>
                <span className="text-sm">BancoInter</span>
                <span className="text-sm text-blue-600">Adicionar notas...</span>
                <span className="text-sm">20 de junho, 2028</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  index % 3 === 0 ? 'bg-sage-100 text-sage-700' : 
                  index % 3 === 1 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {index % 3 === 0 ? 'Pago' : index % 3 === 1 ? 'Não Pago' : 'Erro'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
