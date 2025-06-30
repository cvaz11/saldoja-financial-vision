import React from "react";
import { useState } from "react";
import InvoiceFilter, { type FilterConfig } from "./InvoiceFilter";
import { useFilteredTransactions } from "@/hooks/useInvoiceTransactions";
import TransactionTableContent from "./TransactionTableContent";
import TransactionTableModals from "./TransactionTableModals";
import { useDeleteTransaction } from "@/hooks/useDeleteTransaction";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Unified transaction type to match TransactionTableContent expectations
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

interface InvoiceTransactionTableProps {
  onAddTransaction?: () => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
}

const InvoiceTransactionTable = ({ 
  onAddTransaction, 
  onAddIncome, 
  onAddExpense 
}: InvoiceTransactionTableProps) => {
  const { user } = useAuth();
  
  // Configuração inicial: mês anterior com faturas
  const currentDate = new Date();
  const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
  
  const [config, setConfig] = useState<FilterConfig>({
    type: 'invoices',
    invoiceConfig: {
      month: previousMonth.getMonth() + 1,
      year: previousMonth.getFullYear(),
      selectedStatements: []
    }
  });

  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const { data: rawTransactions = [], isLoading, refetch, error } = useFilteredTransactions(config, true);
  const { deleteTransaction, isDeleting } = useDeleteTransaction();

  // Convert transactions to unified format
  const transactions: UnifiedTransaction[] = rawTransactions.map(transaction => ({
    id: transaction.id,
    description: transaction.description || '',
    amount: transaction.amount,
    transaction_date: transaction.transaction_date,
    is_credit: transaction.is_credit || false,
    installment_number: transaction.installment_number,
    installment_total: transaction.installment_total,
    category: transaction.category,
    statement_id: transaction.statement_id,
    user_id: user?.id || '' // Get user_id from auth context
  }));

  // Log de debug para erro
  if (error) {
    console.error('[INVOICE_TABLE] Error loading transactions:', error);
  }

  const handleRefresh = async () => {
    console.log('[INVOICE_TABLE] Manually refreshing transactions...');
    try {
      await refetch();
      console.log('[INVOICE_TABLE] Refresh completed successfully');
    } catch (error) {
      console.error('[INVOICE_TABLE] Refresh failed:', error);
    }
  };

  const handleEditTransaction = (transaction: any) => {
    console.log('[INVOICE_TABLE] Opening edit modal for transaction:', transaction.id);
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (transactionId: string) => {
    console.log('[INVOICE_TABLE] Delete clicked for transaction:', transactionId);
    setTransactionToDelete(transactionId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (transactionToDelete) {
      console.log('[INVOICE_TABLE] Confirming deletion for:', transactionToDelete);
      const success = await deleteTransaction(transactionToDelete);
      
      if (success) {
        console.log('[INVOICE_TABLE] Deletion successful');
      }
    }
    
    setDeleteConfirmOpen(false);
    setTransactionToDelete(null);
  };

  const handleEditSuccess = () => {
    console.log('[INVOICE_TABLE] Transaction edited successfully');
    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };

  // Handlers para ações CRUD
  const handleAddIncome = () => {
    console.log('[INVOICE_TABLE] Add income requested');
    if (onAddIncome) {
      onAddIncome();
    } else if (onAddTransaction) {
      onAddTransaction();
    }
  };

  const handleAddExpense = () => {
    console.log('[INVOICE_TABLE] Add expense requested');
    if (onAddExpense) {
      onAddExpense();
    } else if (onAddTransaction) {
      onAddTransaction();
    }
  };

  // Calcular totais
  const totalExpenses = transactions
    .filter(t => !t.is_credit)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.is_credit)
    .reduce((sum, t) => sum + t.amount, 0);

  const netAmount = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <InvoiceFilter 
          config={config}
          onConfigChange={setConfig}
          className="w-full sm:w-auto"
        />
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={handleAddIncome}
            variant="outline"
            size="sm"
            className="bg-green-50 hover:bg-green-100 text-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Receita
          </Button>
          <Button 
            onClick={handleAddExpense}
            className="bg-sage-600 hover:bg-sage-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Despesa
          </Button>
        </div>
      </div>

      {/* Resumo dos totais */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Resumo das Faturas Selecionadas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Total de Despesas</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Total de Receitas</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Saldo</p>
              <p className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(netAmount))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info sobre período */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Como funciona este filtro:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Mostra transações de faturas que vencem no mês selecionado</li>
          <li>• Cada banco pode ter seu próprio dia de fechamento</li>
          <li>• Apenas faturas selecionadas são consideradas</li>
          <li>• {transactions.length} transações encontradas para os critérios selecionados</li>
        </ul>
      </div>

      {/* Tabela de transações */}
      <TransactionTableContent
        transactions={transactions}
        showCategories={true}
        isLoading={isLoading}
        isDeleting={isDeleting}
        onEditTransaction={handleEditTransaction}
        onDeleteClick={handleDeleteClick}
      />

      {/* Modais */}
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
  );
};

export default InvoiceTransactionTable;
