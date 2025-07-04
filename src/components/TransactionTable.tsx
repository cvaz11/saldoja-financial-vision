
import React, { useState, useEffect } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
import { useTransactions } from "@/hooks/useTransactions";
import { useFilteredTransactions } from "@/hooks/useInvoiceTransactions";
import { useDeleteTransaction } from "@/hooks/useDeleteTransaction";
import { useDefaultInvoiceFilter } from "@/hooks/useDefaultInvoiceFilter";
import { type FilterConfig } from "./FilterButton";
import { type QuickFilterType } from "./QuickFilterButtons";
import TransactionTableHeader from "./TransactionTableHeader";
import TransactionTableContent from "./TransactionTableContent";
import TransactionTableFooter from "./TransactionTableFooter";
import TransactionTableModals from "./TransactionTableModals";
import AddTransactionModal from "./AddTransactionModal";
import CategoryView from "./CategoryView";
import InstallmentFilter from "./InstallmentFilter";

// Unified transaction type
interface UnifiedTransaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  is_credit: boolean;
  installment_number?: number;
  installment_total?: number;
  category?: string;
  statement_id?: string;
  user_id: string;
}

interface TransactionTableProps {
  onAddTransaction?: () => void;
  showCategories?: boolean;
}

const TransactionTable = ({ onAddTransaction, showCategories = false }: TransactionTableProps) => {
  const { profile } = useUserProfile();
  const { filterConfig: defaultFilterConfig, isLoading: isLoadingDefault } = useDefaultInvoiceFilter();
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state for add transaction modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"receita" | "despesa">("receita");
  
  const { deleteTransaction, isDeleting } = useDeleteTransaction();
  
  // Use default filter config from hook
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(defaultFilterConfig);

  // Update filter config when default loads
  useEffect(() => {
    if (!isLoadingDefault && defaultFilterConfig) {
      setFilterConfig(defaultFilterConfig);
    }
  }, [defaultFilterConfig, isLoadingDefault]);

  // Use different hooks based on filter type
  const dateRangeQuery = useTransactions(
    filterConfig.dateRange || { from: new Date(), to: new Date() }, 
    filterConfig.type === 'date-range', 
    false
  );
  const filteredQuery = useFilteredTransactions(filterConfig, filterConfig.type === 'invoices');
  
  const query = filterConfig.type === 'date-range' ? dateRangeQuery : filteredQuery;
  const rawTransactions = query.data || [];
  const isLoading = query.isLoading || isLoadingDefault;
  const error = query.error;
  const refetch = query.refetch;

  // Convert all transactions to unified format
  const allTransactions: UnifiedTransaction[] = rawTransactions.map(transaction => ({
    id: transaction.id,
    description: transaction.description || '',
    amount: transaction.amount,
    transaction_date: transaction.transaction_date,
    is_credit: transaction.is_credit || false,
    installment_number: transaction.installment_number,
    installment_total: transaction.installment_total,
    category: transaction.category,
    statement_id: transaction.statement_id,
    user_id: transaction.user_id
  }));

  // Apply quick filters and search
  const getFilteredTransactions = (): UnifiedTransaction[] => {
    let filtered = allTransactions;

    // Apply quick filter
    switch (quickFilter) {
      case 'expenses':
        filtered = allTransactions.filter(t => !t.is_credit);
        break;
      case 'income':
        filtered = allTransactions.filter(t => t.is_credit);
        break;
      case 'installments':
        filtered = allTransactions.filter(t => 
          t.installment_total && t.installment_number && 
          t.installment_total >= 1 && t.installment_number >= 1
        );
        break;
      case 'categories':
        filtered = allTransactions.filter(t => t.category && t.category !== 'Outros');
        break;
      case 'all':
      default:
        break;
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower) ||
        t.amount.toString().includes(searchTerm)
      );
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
        await refetch(); // Refresh data after deletion
      }
    }
    
    setDeleteConfirmOpen(false);
    setTransactionToDelete(null);
  };

  const handleEditSuccess = () => {
    console.log('[TABLE] Transaction edited successfully');
    setIsEditModalOpen(false);
    setEditingTransaction(null);
    refetch(); // Refresh data after edit
  };

  const handleProfileOpen = () => {
    console.log('[TABLE] Profile open requested');
  };

  // Handlers for adding transactions
  const handleAddIncome = () => {
    console.log('[TABLE] Add income requested');
    setModalType("receita");
    setIsAddModalOpen(true);
  };

  const handleAddExpense = () => {
    console.log('[TABLE] Add expense requested');
    setModalType("despesa");
    setIsAddModalOpen(true);
  };

  const handleTransactionSubmit = async (data: any) => {
    console.log('[TABLE] Transaction submitted:', data);
    setIsAddModalOpen(false);
    await refetch(); // Refresh data after adding
  };

  return (
    <>
      <div className="space-y-4 pb-24">
        <TransactionTableHeader
          filterConfig={filterConfig}
          onFilterConfigChange={setFilterConfig}
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={handleRefresh}
          onAddIncome={handleAddIncome}
          onAddExpense={handleAddExpense}
          onProfileOpen={handleProfileOpen}
        />

        {quickFilter === 'categories' ? (
          <CategoryView
            transactions={allTransactions}
            isLoading={isLoading}
            onEditTransaction={handleEditTransaction}
            onDeleteClick={handleDeleteClick}
          />
        ) : quickFilter === 'installments' ? (
          <InstallmentFilter 
            currentMonth={filterConfig.invoiceConfig?.month}
            currentYear={filterConfig.invoiceConfig?.year}
          />
        ) : (
          <TransactionTableContent
            transactions={transactions}
            showCategories={showCategories}
            isLoading={isLoading}
            isDeleting={isDeleting}
            onEditTransaction={handleEditTransaction}
            onDeleteClick={handleDeleteClick}
          />
        )}

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

        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleTransactionSubmit}
          type={modalType}
        />
      </div>

      {quickFilter !== 'categories' && (
        <TransactionTableFooter transactions={transactions} />
      )}
    </>
  );
};

export default TransactionTable;
