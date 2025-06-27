import React, { useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { calculateInvoiceCycle } from "@/lib/invoice-utils";
import DateRangePicker, { type DateRange } from "./DateRangePicker";
import { useTransactions } from "@/hooks/useTransactions";
import { useDeleteTransaction } from "@/hooks/useDeleteTransaction";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw, Edit, Trash2 } from "lucide-react";
import TransactionRowCard from "./TransactionRowCard";
import EditTransactionModal from "./EditTransactionModal";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
  
  const { deleteTransaction, isDeleting } = useDeleteTransaction();
  
  // Definir range padrão como ciclo de fatura anterior
  const getDefaultDateRange = (): DateRange => {
    if (profile) {
      const previousMonthDate = new Date();
      previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
      const cycle = calculateInvoiceCycle(profile.invoice_closing_day, previousMonthDate);
      return { from: cycle.startDate, to: cycle.endDate };
    }
    
    // Fallback para mês anterior calendário se não tiver perfil
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
    const endOfPrevMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);
    
    return { from: startOfPrevMonth, to: endOfPrevMonth };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

  const { data: transactions = [], isLoading, refetch } = useTransactions(dateRange, true, false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getCategoryBadge = (category: string) => {
    const categoryColors: Record<string, string> = {
      'Alimentação': 'bg-blue-100 text-blue-700',
      'Transporte': 'bg-purple-100 text-purple-700',
      'Saúde': 'bg-red-100 text-red-700',
      'Lazer': 'bg-pink-100 text-pink-700',
      'Educação': 'bg-indigo-100 text-indigo-700',
      'Casa': 'bg-orange-100 text-orange-700',
      'Vestuário': 'bg-green-100 text-green-700',
      'Tecnologia': 'bg-teal-100 text-teal-700',
      'Financeiro': 'bg-yellow-100 text-yellow-700',
      'Salário': 'bg-green-200 text-green-800',
      'Outros': 'bg-gray-100 text-gray-700',
    };
    
    return categoryColors[category] || 'bg-gray-100 text-gray-700';
  };

  const handleRefresh = () => {
    console.log('Manually refreshing transactions...');
    refetch();
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (transactionToDelete) {
      const success = await deleteTransaction(transactionToDelete);
      if (success) {
        // A query será invalidada automaticamente pelo hook
        console.log('Transaction deleted successfully');
      }
    }
    setDeleteConfirmOpen(false);
    setTransactionToDelete(null);
  };

  const handleEditSuccess = () => {
    refetch();
  };

  // Calcular totais para a barra inferior
  const totals = React.useMemo(() => {
    const totalDebits = transactions
      .filter(t => !t.is_credit)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalCredits = transactions
      .filter(t => t.is_credit)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const balance = totalCredits - totalDebits;
    
    return { totalDebits, totalCredits, balance };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <DateRangePicker 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Carregando transações...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-24">
        {/* Header with DateRangePicker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <DateRangePicker 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
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
            {onAddTransaction && (
              <Button 
                onClick={onAddTransaction}
                className="bg-sage-600 hover:bg-sage-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
            )}
          </div>
        </div>

        {/* Status Info */}
        {profile && (
          <div className="bg-sage-50 p-3 rounded border border-sage-200 text-sm">
            <div className="text-sage-800 font-medium mb-1">Informações do Período:</div>
            <div className="text-sage-700">
              • {transactions.length} transações encontradas<br/>
              • Período: {dateRange.from.toLocaleDateString('pt-BR')} a {dateRange.to.toLocaleDateString('pt-BR')}<br/>
              • Fechamento da fatura: dia {profile.invoice_closing_day} de cada mês
            </div>
          </div>
        )}

        {/* Transactions Display */}
        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma transação encontrada
            </h3>
            <p className="text-gray-500 mb-4">
              Não há transações para o período selecionado.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden space-y-3">
              {transactions.map((transaction) => (
                <ContextMenu key={transaction.id}>
                  <ContextMenuTrigger>
                    <TransactionRowCard
                      transaction={{
                        id: transaction.id,
                        description: transaction.description || '',
                        value: transaction.amount,
                        installment: transaction.installment_number && transaction.installment_total 
                          ? `${transaction.installment_number}/${transaction.installment_total}`
                          : 'À vista',
                        category: transaction.category || 'Outros',
                        bank: 'Banco',
                        date: formatDate(transaction.transaction_date),
                        status: transaction.is_credit ? 'Receita' as const : 'Pago' as const,
                      }}
                    />
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleEditTransaction(transaction)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => handleDeleteClick(transaction.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-sage-50">
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Parcelamento</TableHead>
                    {showCategories && <TableHead>Categoria</TableHead>}
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        <span className={transaction.is_credit ? "text-green-600" : "text-red-600"}>
                          {transaction.is_credit ? "+" : "-"}{formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {transaction.installment_number && transaction.installment_total 
                          ? `${transaction.installment_number}/${transaction.installment_total}`
                          : 'À vista'
                        }
                      </TableCell>
                      {showCategories && (
                        <TableCell>
                          <Badge className={getCategoryBadge(transaction.category || 'Outros')}>
                            {transaction.category || 'Outros'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.is_credit ? "default" : "secondary"}>
                          {transaction.is_credit ? "Receita" : "Pago"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(transaction.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <EditTransactionModal
          transaction={editingTransaction}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTransaction(null);
          }}
          onSuccess={handleEditSuccess}
        />

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Fixed Totals Bar - Always visible at bottom */}
      {transactions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-sage-100 border-t-2 border-sage-300 p-4 shadow-lg z-50">
          <div className="max-w-7xl mx-auto">
            {/* Mobile Total Bar */}
            <div className="lg:hidden">
              <div className="font-semibold text-sage-900 mb-2 flex items-center justify-between">
                <span>TOTAL</span>
                <span className="text-sm text-sage-700">{transactions.length} transação{transactions.length !== 1 ? 'ões' : ''}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-red-600 font-medium">-{formatCurrency(totals.totalDebits)}</div>
                  <div className="text-xs text-sage-600">Despesas</div>
                </div>
                <div className="text-center">
                  <div className="text-green-600 font-medium">+{formatCurrency(totals.totalCredits)}</div>
                  <div className="text-xs text-sage-600">Receitas</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold ${totals.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {totals.balance >= 0 ? "+" : ""}{formatCurrency(totals.balance)}
                  </div>
                  <div className="text-xs text-sage-600">Saldo</div>
                </div>
              </div>
            </div>

            {/* Desktop Total Bar */}
            <div className="hidden lg:flex items-center justify-between">
              <div className="font-bold text-sage-900 text-lg">TOTAL</div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-red-600 font-semibold">-{formatCurrency(totals.totalDebits)}</div>
                  <div className="text-xs text-sage-600">Despesas</div>
                </div>
                <div className="text-center">
                  <div className="text-green-600 font-semibold">+{formatCurrency(totals.totalCredits)}</div>
                  <div className="text-xs text-sage-600">Receitas</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold text-lg ${totals.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {totals.balance >= 0 ? "+" : ""}{formatCurrency(totals.balance)}
                  </div>
                  <div className="text-xs text-sage-600">Saldo Final</div>
                </div>
                <div className="text-center text-sage-700">
                  <div className="font-medium">{transactions.length}</div>
                  <div className="text-xs">transação{transactions.length !== 1 ? 'ões' : ''}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionTable;
