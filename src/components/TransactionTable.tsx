
import React, { useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
import { type DateRange } from "./DateRangePicker";
import { useTransactions } from "@/hooks/useTransactions";
import { useDeleteTransaction } from "@/hooks/useDeleteTransaction";
import TransactionTableHeader from "./TransactionTableHeader";
import TransactionTableInfo from "./TransactionTableInfo";
import TransactionTableContent from "./TransactionTableContent";
import TransactionTableFooter from "./TransactionTableFooter";
import TransactionTableModals from "./TransactionTableModals";
import InvoiceTransactionTable from "./InvoiceTransactionTable";

interface TransactionTableProps {
  onAddTransaction?: () => void;
  showCategories?: boolean;
}

const TransactionTable = ({ onAddTransaction, showCategories = false }: TransactionTableProps) => {
  const { profile } = useUserProfile();
  const [viewMode, setViewMode] = useState<'date-range' | 'invoice'>('invoice');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  
  const { deleteTransaction, isDeleting } = useDeleteTransaction();
  
  // Define default date range as previous invoice cycle
  const getDefaultDateRange = (): DateRange => {
    if (profile) {
      const previousMonthDate = new Date();
      previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
      const cycle = calculateInvoiceCycle(profile.invoice_closing_day, previousMonthDate);
      return { from: cycle.startDate, to: cycle.endDate };
    }
    
    // Fallback to previous calendar month if no profile
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
    const endOfPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);
    
    return { from: startOfPrevMonth, to: endOfPrevMonth };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const { data: transactions = [], isLoading, refetch, error } = useTransactions(dateRange, viewMode === 'date-range', false);

  // Log de debug para erro
  if (error) {
    console.error('[TABLE] Error loading transactions:', error);
  }

  const handleRefresh = async () => {
    console.log('[TABLE] Manually refreshing transactions...');
    try {
      await refetch();
      console.log('[TABLE] Refresh completed successfully');
    } catch (error) {
      console.error('[TABLE] Refresh failed:', error);
    }
  };

  const handleEditTransaction = (transaction: any) => {
    console.log('[TABLE] Opening edit modal for transaction:', transaction.id);
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (transactionId: string) => {
    console.log('[TABLE] Delete clicked for transaction:', transactionId);
    setTransactionToDelete(transactionId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (transactionToDelete) {
      console.log('[TABLE] Confirming deletion for:', transactionToDelete);
      const success = await deleteTransaction(transactionToDelete);
      
      if (success) {
        console.log('[TABLE] Deletion successful');
      }
    }
    
    setDeleteConfirmOpen(false);
    setTransactionToDelete(null);
  };

  const handleEditSuccess = () => {
    console.log('[TABLE] Transaction edited successfully');
    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };

  const handleProfileOpen = () => {
    console.log('[TABLE] Profile open requested');
  };

  // Se modo fatura está ativado, usar componente específico
  if (viewMode === 'invoice') {
    return (
      <div className="space-y-4 pb-24">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Visualização por Faturas</h2>
          <TransactionTableHeader
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onRefresh={handleRefresh}
            onAddTransaction={onAddTransaction}
            onProfileOpen={handleProfileOpen}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
        
        <InvoiceTransactionTable onAddTransaction={onAddTransaction} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-24">
        <TransactionTableHeader
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={handleRefresh}
          onAddTransaction={onAddTransaction}
          onProfileOpen={handleProfileOpen}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <TransactionTableInfo
          transactionCount={transactions.length}
          dateRange={dateRange}
          invoiceClosingDay={profile?.invoice_closing_day}
        />

        <TransactionTableContent
          transactions={transactions}
          showCategories={showCategories}
          isLoading={isLoading}
          isDeleting={isDeleting}
          onEditTransaction={handleEditTransaction}
          onDeleteClick={handleDeleteClick}
        />

        <TransactionTableModals
          editingTransaction={editingTransaction}
          isEditModalOpen={isEditModalOpen}
          deleteConfirmOpen={deleteConfirmOpen}
          isDeleting={isDeleting}
          onEditModalClose={() => {
            setIsEditModalOpen(false);
            setEditingTransaction(null);
          }}
          onEditSuccess={handleEditSuccess}
          onDeleteConfirmChange={setDeleteConfirmOpen}
          onConfirmDelete={handleConfirmDelete}
        />
      </div>

      <TransactionTableFooter transactions={transactions} />
    </>
  );
};

export default TransactionTable;
