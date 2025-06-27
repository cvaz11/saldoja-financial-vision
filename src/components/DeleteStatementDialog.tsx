
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteStatementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  statementName: string;
  transactionCount: number;
  isDeleting: boolean;
}

const DeleteStatementDialog = ({
  isOpen,
  onClose,
  onConfirm,
  statementName,
  transactionCount,
  isDeleting,
}: DeleteStatementDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertDialogTitle>Excluir Extrato</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              Tem certeza que deseja excluir o extrato <strong>{statementName}</strong>?
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 font-medium text-sm">
                ⚠️ Esta ação não pode ser desfeita!
              </p>
              <p className="text-red-700 text-sm mt-1">
                Ao excluir este extrato, <strong>{transactionCount} transações</strong> associadas 
                também serão permanentemente removidas do sistema.
              </p>
            </div>

            <p className="text-gray-600 text-sm">
              Isso inclui todas as despesas e receitas que foram importadas deste extrato.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Excluindo..." : "Sim, Excluir Tudo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteStatementDialog;
