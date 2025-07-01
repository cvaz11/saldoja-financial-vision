
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Edit, Trash2 } from "lucide-react";
import TransactionRowCard from "./TransactionRowCard";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface Transaction {
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

interface TransactionTableContentProps {
  transactions: Transaction[];
  showCategories: boolean;
  isLoading: boolean;
  isDeleting: boolean;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteClick: (transactionId: string) => void;
}

const TransactionTableContent = ({
  transactions,
  showCategories,
  isLoading,
  isDeleting,
  onEditTransaction,
  onDeleteClick
}: TransactionTableContentProps) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Carregando transações...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhuma transação encontrada
        </h3>
        <p className="text-gray-500 mb-4">
          Não há transações para o período selecionado.
        </p>
      </div>
    );
  }

  return (
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
                  amount: transaction.amount,
                  transaction_date: transaction.transaction_date,
                  is_credit: transaction.is_credit,
                  category: transaction.category,
                  installment_number: transaction.installment_number,
                  installment_total: transaction.installment_total,
                  statement_id: transaction.statement_id,
                }}
                showCategories={showCategories}
                onEdit={onEditTransaction}
                onDelete={onDeleteClick}
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onEditTransaction(transaction)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => onDeleteClick(transaction.id)}
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
                      onClick={() => onEditTransaction(transaction)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteClick(transaction.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={isDeleting}
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
  );
};

export default TransactionTableContent;
