
import React, { useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
import { useTransactions } from "@/hooks/useTransactions";
import { useFilteredTransactions } from "@/hooks/useInvoiceTransactions";
import { useDeleteTransaction } from "@/hooks/useDeleteTransaction";
import { type FilterConfig } from "./FilterButton";
import { type QuickFilterType } from "./QuickFilterButtons";
import TransactionTableHeader from "./TransactionTableHeader";
import TransactionTableInfo from "./TransactionTableInfo";
import TransactionTableContent from "./TransactionTableContent";
import TransactionTableFooter from "./TransactionTableFooter";
import TransactionTableModals from "./TransactionTableModals";

interface TransactionTableProps {
  onAddTransaction?: () => void;
  showCategories?: boolean;
}

const TransactionTable = ({ onAddTransaction, showCategories = false }: TransactionTableProps) => {
  const { profile } = useUserProfile();
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
  
  const { deleteTransaction, isDeleting } = useDeleteTransaction();
  
  // Define default filter config as previous invoice cycle
  const getDefaultFilterConfig = (): FilterConfig => {
    if (profile) {
      const previousMonthDate = new Date();
      previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
      const cycle = calculateInvoiceCycle(profile.invoice_closing_day, previousMonthDate);
      return { 
        type: 'date-range',
        dateRange: { from: cycle.startDate, to: cycle.endDate }
      };
    }
    
    // Fallback to previous calendar month if no profile
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
    const endOfPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);
    
    return { 
      type: 'date-range',
      dateRange: { from: startOfPrevMonth, to: endOfPrevMonth }
    };
  };

  const [filterConfig, setFilterConfig] = useState<FilterConfig>(getDefaultFilterConfig());

  // Use different hooks based on filter type
  const dateRangeQuery = useTransactions(
    filterConfig.dateRange || { from: new Date(), to: new Date() }, 
    filterConfig.type === 'date-range', 
    false
  );
  const filteredQuery = useFilteredTransactions(filterConfig, filterConfig.type === 'invoices');
  
  const query = filterConfig.type === 'date-range' ? dateRangeQuery : filteredQuery;
  const allTransactions = query.data || [];
  const isLoading = query.isLoading;
  const error = query.error;
  const refetch = query.refetch;

  // Apply quick filters
  const getFilteredTransactions = () => {
    let filtered = allTransactions;

    switch (quickFilter) {
      case 'expenses':
        filtered = allTransactions.filter(t => !t.is_credit);
        break;
      case 'income':
        filtered = allTransactions.filter(t => t.is_credit);
        break;
      case 'installments':
        filtered = allTransactions.filter(t => t.installment_number && t.installment_total);
        break;
      case 'categories':
        // Show transactions that have categories assigned
        filtered = allTransactions.filter(t => t.category && t.category !== 'Outros');
        break;
      case 'all':
      default:
        // Show all transactions
        break;
    }

    return filtered;
  };

  const transactions = getFilteredTransactions();

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

  return (
    <>
      <div className="space-y-4 pb-24">
        <TransactionTableHeader
          filterConfig={filterConfig}
          onFilterConfigChange={setFilterConfig}
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          onRefresh={handleRefresh}
          onAddTransaction={onAddTransaction}
          onProfileOpen={handleProfileOpen}
        />

        <TransactionTableInfo
          transactionCount={transactions.length}
          dateRange={filterConfig.dateRange}
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
