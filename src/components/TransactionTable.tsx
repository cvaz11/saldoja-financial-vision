
import React, { useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
import { type DateRange } from "./DateRangePicker";
import { useTransactions } from "@/hooks/useTransactions";
import { useFilteredTransactions } from "@/hooks/useInvoiceTransactions";
import { useDeleteTransaction } from "@/hooks/useDeleteTransaction";
import { type FilterConfig } from "./InvoiceFilter";
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
  const [viewMode, setViewMode] = useState<'date-range' | 'invoice'>('date-range');
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
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    type: 'date-range',
    dateRange: getDefaultDateRange()
  });

  // Use different hooks based on view mode
  const dateRangeQuery = useTransactions(dateRange, viewMode === 'date-range', false);
  const filteredQuery = useFilteredTransactions(filterConfig, viewMode === 'invoice');
  
  const query = viewMode === 'date-range' ? dateRangeQuery : filteredQuery;
  const transactions = query.data || [];
  const isLoading = query.isLoading;
  const error = query.error;
  const refetch = query.refetch;

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

  const handleViewModeChange = (mode: 'date-range' | 'invoice') => {
    setViewMode(mode);
    
    // Update filter config when switching modes
    if (mode === 'date-range') {
      setFilterConfig({
        type: 'date-range',
        dateRange: dateRange
      });
    } else {
      setFilterConfig({
        type: 'invoices',
        invoiceConfig: {
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          selectedStatements: []
        }
      });
    }
  };

  // Se modo fatura está ativado, usar componente específico para compatibilidade
  if (viewMode === 'invoice' && filterConfig.type === 'invoices') {
    return (
      <div className="space-y-4 pb-24">
        <TransactionTableHeader
          filterConfig={filterConfig}
          onFilterConfigChange={setFilterConfig}
          onRefresh={handleRefresh}
          onAddTransaction={onAddTransaction}
          onProfileOpen={handleProfileOpen}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
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

        <TransactionTableFooter transactions={transactions} />
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
          onViewModeChange={handleViewModeChange}
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
