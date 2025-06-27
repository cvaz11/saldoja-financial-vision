
import React from "react";
import EditTransactionModal from "./EditTransactionModal";
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

interface TransactionTableModalsProps {
  editingTransaction: any;
  isEditModalOpen: boolean;
  deleteConfirmOpen: boolean;
  isDeleting: boolean;
  onEditModalClose: () => void;
  onEditSuccess: () => void;
  onDeleteConfirmChange: (open: boolean) => void;
  onConfirmDelete: () => void;
}

const TransactionTableModals = ({
  editingTransaction,
  isEditModalOpen,
  deleteConfirmOpen,
  isDeleting,
  onEditModalClose,
  onEditSuccess,
  onDeleteConfirmChange,
  onConfirmDelete
}: TransactionTableModalsProps) => {
  return (
    <>
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={isEditModalOpen}
        onClose={onEditModalClose}
        onSuccess={onEditSuccess}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={onDeleteConfirmChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TransactionTableModals;
