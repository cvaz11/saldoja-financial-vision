
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Sparkles } from "lucide-react";

interface PostUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onViewTransactions: () => void;
}

const PostUploadDialog = ({ isOpen, onClose, onViewTransactions }: PostUploadDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-sage-100 rounded-full">
            <Sparkles className="w-8 h-8 text-sage-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            Extrato enviado com sucesso! 🎉
          </DialogTitle>
          <DialogDescription className="text-center">
            Nossa IA está processando seu extrato bancário
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-orange-600">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">Nossa IA está analisando...</span>
          </div>
          
          <p className="text-gray-600 text-sm">
            O processamento leva entre <strong>5 a 8 minutos</strong>. 
            Suas transações serão categorizadas automaticamente.
          </p>
          
          <div className="bg-sage-50 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-sage-600 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-sage-900">O que acontece agora:</p>
                <ul className="text-xs text-sage-700 mt-1 space-y-1">
                  <li>• Extração de texto do PDF</li>
                  <li>• Identificação de transações</li>
                  <li>• Categorização inteligente</li>
                  <li>• Detecção de parcelamentos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button onClick={onViewTransactions} className="flex-1 bg-sage-600 hover:bg-sage-700">
            Ver Movimentações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostUploadDialog;
