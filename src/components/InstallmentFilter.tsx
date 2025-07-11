import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useInstallmentTransactions, useInstallmentStats } from "@/hooks/useInstallmentTransactions";
import { formatCurrency } from "@/lib/utils";
import TransactionRowCard from "./TransactionRowCard";
import { CreditCard, Calendar, TrendingUp } from "lucide-react";

interface InstallmentFilterProps {
  month: number;
  year: number;
}

const InstallmentFilter = ({ month, year }: InstallmentFilterProps) => {

  const { data: transactions = [], isLoading } = useInstallmentTransactions(month, year);
  const stats = useInstallmentStats(month, year);

  const formatMonthYear = (month?: number, year?: number) => {
    if (!month || !year) return "Carregando...";
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Agrupar transações por installment_id preciso
  const groupedTransactions = React.useMemo(() => {
    const groups = new Map<string, typeof transactions>();
    
    transactions.forEach(transaction => {
      // Usar installment_id já definido no banco, mais confiável
      const installmentId = transaction.installment_id;
      
      if (!installmentId) return; // Pular se não tem installment_id
      
      if (!groups.has(installmentId)) {
        groups.set(installmentId, []);
      }
      
      groups.get(installmentId)!.push(transaction);
    });

    // Converter para array e ordenar cada grupo
    return Array.from(groups.entries()).map(([installmentId, groupTransactions]) => {
      const sortedTransactions = groupTransactions.sort(
        (a, b) => a.installment_number - b.installment_number
      );
      
      const paidCount = sortedTransactions.filter(t => !t.is_projected).length;
      const pendingCount = sortedTransactions.length - paidCount;
      const progressPercentage = (paidCount / sortedTransactions.length) * 100;
      
      // Encontrar próxima parcela pendente
      const nextPendingInstallment = sortedTransactions.find(t => t.is_projected);
      
      return {
        installmentId,
        baseDescription: sortedTransactions[0].description.replace(/- Parcela \d+\/\d+/, '').trim(),
        total: sortedTransactions[0].installment_total,
        amount: sortedTransactions[0].amount,
        transactions: sortedTransactions,
        paidCount,
        pendingCount,
        progressPercentage,
        totalAmount: sortedTransactions.reduce((sum, t) => sum + t.amount, 0),
        paidAmount: sortedTransactions.filter(t => !t.is_projected).reduce((sum, t) => sum + t.amount, 0),
        pendingAmount: sortedTransactions.filter(t => t.is_projected).reduce((sum, t) => sum + t.amount, 0),
        nextInstallment: nextPendingInstallment,
        status: pendingCount === 0 ? 'completed' : pendingCount === sortedTransactions.length ? 'pending' : 'partial'
      };
    }).sort((a, b) => {
      // Ordenar por status (pendentes primeiro) e depois por nome
      if (a.status !== b.status) {
        if (a.status === 'pending') return -1;
        if (b.status === 'pending') return 1;
        if (a.status === 'partial') return -1;
        if (b.status === 'partial') return 1;
      }
      return a.baseDescription.localeCompare(b.baseDescription);
    });
  }, [transactions]);

  // Separar por status
  const pendingGroups = groupedTransactions.filter(g => g.status === 'pending');
  const partialGroups = groupedTransactions.filter(g => g.status === 'partial');
  const completedGroups = groupedTransactions.filter(g => g.status === 'completed');

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho simples */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">
          Parcelas - {formatMonthYear(month, year)}
        </h2>
      </div>

      {/* Estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Quantidade de Parcelas</p>
                <p className="text-2xl font-bold">{stats.totalInstallments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Valor das Parcelas do Mês</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.monthlyAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Valor de Parcelas Futuras</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.futureAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {groupedTransactions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma parcela encontrada</p>
            <p className="text-sm text-gray-500 mt-2">
              Importe extratos com transações parceladas para vê-las aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Layout simples como aba "Todos" */}
          {transactions.map((transaction) => (
            <TransactionRowCard
              key={transaction.id}
              transaction={{
                id: transaction.id,
                description: transaction.description,
                amount: transaction.amount,
                transaction_date: transaction.transaction_date,
                is_credit: transaction.is_credit,
                category: transaction.category,
                installment_number: transaction.installment_number,
                installment_total: transaction.installment_total,
                statement_id: transaction.statement_id,
                is_projected: transaction.is_projected
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InstallmentFilter;