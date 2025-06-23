
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

      {/* Upload Section - Redesigned for better proportions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card - Takes 1 column on large screens */}
        <div className="lg:col-span-1 bg-gradient-to-br from-sage-100 to-sage-200 rounded-xl p-6 flex flex-col justify-center items-center text-center min-h-[250px] md:min-h-[300px]">
          <Upload className="h-12 w-12 md:h-16 md:w-16 text-sage-700 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2 text-lg">Enviar Extratos</h3>
          <p className="text-sm text-gray-600 mb-6">Faça upload dos seus extratos em PDF, CSV ou OFX</p>
          <Button 
            onClick={onUpload}
            className="bg-sage-600 hover:bg-sage-700 text-white shadow-md w-full py-3"
          >
            <Upload className="h-4 w-4 mr-2" />
            Selecionar Arquivo
          </Button>
        </div>

        {/* Transaction List - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-sage-100 p-4">
            <div className="hidden md:grid md:grid-cols-4 gap-4 font-medium text-gray-700">
              <span>Descrição</span>
              <span>Informações</span>
              <span>Data</span>
              <span>Status</span>
            </div>
            <div className="md:hidden">
              <span className="font-medium text-gray-700">Extratos Recentes</span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="p-4">
                {/* Mobile Layout */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center mr-3">
                        💳
                      </div>
                      <div>
                        <p className="font-medium text-sm">BancoInter fatura 06-24</p>
                        <p className="text-xs text-gray-500">20 de junho, 2024</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      index % 3 === 0 ? 'bg-sage-100 text-sage-700' : 
                      index % 3 === 1 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {index % 3 === 0 ? 'Pago' : index % 3 === 1 ? 'Não Pago' : 'Erro'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 ml-11">Adicionar notas...</p>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:grid md:grid-cols-4 gap-4 items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center mr-3">
                      💳
                    </div>
                    <span className="text-sm font-medium">BancoInter fatura 06-24</span>
                  </div>
                  <span className="text-sm text-blue-600">Adicionar notas...</span>
                  <span className="text-sm">20 de junho, 2024</span>
                  <span className={`text-xs px-2 py-1 rounded-full w-fit ${
                    index % 3 === 0 ? 'bg-sage-100 text-sage-700' : 
                    index % 3 === 1 ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {index % 3 === 0 ? 'Pago' : index % 3 === 1 ? 'Não Pago' : 'Erro'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
