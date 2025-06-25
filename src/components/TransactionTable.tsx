
import React, { useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import DateRangePicker, { type DateRange } from "./DateRangePicker";
import { useTransactions } from "@/hooks/useTransactions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw } from "lucide-react";
import TransactionRowCard from "./TransactionRowCard";

interface TransactionTableProps {
  onAddTransaction?: () => void;
  showCategories?: boolean;
}

const TransactionTable = ({ onAddTransaction, showCategories = false }: TransactionTableProps) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const { data: transactions = [], isLoading, refetch } = useTransactions(dateRange);

  console.log('TransactionTable render - transactions:', transactions);

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
      'Mercado': 'bg-blue-100 text-blue-700',
      'Restaurante': 'bg-orange-100 text-orange-700',
      'Transporte': 'bg-purple-100 text-purple-700',
      'Assinaturas': 'bg-pink-100 text-pink-700',
      'Salário': 'bg-green-100 text-green-700',
      'Freelance': 'bg-teal-100 text-teal-700',
      'Eletrônicos': 'bg-indigo-100 text-indigo-700',
      'Transferência': 'bg-gray-100 text-gray-700',
    };
    
    return categoryColors[category] || 'bg-gray-100 text-gray-700';
  };

  const handleRefresh = () => {
    console.log('Manually refreshing transactions...');
    refetch();
  };

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
    <div className="space-y-4">
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

      {/* Debug Info */}
      <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
        Debug: {transactions.length} transações encontradas no período selecionado
      </div>

      {/* Transactions Display */}
      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma transação encontrada
          </h3>
          <p className="text-gray-500">
            Não há transações no período selecionado.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="lg:hidden space-y-3">
            {transactions.map((transaction) => (
              <TransactionRowCard
                key={transaction.id}
                transaction={{
                  id: transaction.id,
                  description: transaction.description || '',
                  value: transaction.amount,
                  installment: transaction.installment_number && transaction.installment_total 
                    ? `${transaction.installment_number}/${transaction.installment_total}`
                    : 'À vista',
                  category: transaction.category || 'Outros',
                  bank: 'Banco', // You might want to get this from statement
                  date: formatDate(transaction.transaction_date),
                  status: transaction.is_credit ? 'Receita' as const : 'Pago' as const,
                }}
              />
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionTable;
