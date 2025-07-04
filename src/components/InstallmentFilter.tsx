import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInstallmentTransactions, useInstallmentStats } from "@/hooks/useInstallmentTransactions";
import { useLatestStatementMonth } from "@/hooks/useLatestStatementMonth";
import { formatCurrency } from "@/lib/utils";
import TransactionRowCard from "./TransactionRowCard";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallmentFilterProps {
  currentMonth?: number;
  currentYear?: number;
}

const InstallmentFilter = ({ currentMonth, currentYear }: InstallmentFilterProps = {}) => {
  const { data: latestStatement } = useLatestStatementMonth();
  
  // Usar mês do último extrato como padrão se não especificado
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    if (!currentMonth && !currentYear && latestStatement) {
      setSelectedMonth(latestStatement.month);
      setSelectedYear(latestStatement.year);
    }
  }, [latestStatement, currentMonth, currentYear]);

  const effectiveMonth = selectedMonth || currentMonth;
  const effectiveYear = selectedYear || currentYear;

  const { data: transactions = [], isLoading } = useInstallmentTransactions(effectiveMonth, effectiveYear);
  const stats = useInstallmentStats(effectiveMonth, effectiveYear);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (!effectiveMonth || !effectiveYear) return;
    
    const currentDate = new Date(effectiveYear, effectiveMonth - 1);
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    setSelectedMonth(currentDate.getMonth() + 1);
    setSelectedYear(currentDate.getFullYear());
  };

  const formatMonthYear = (month?: number, year?: number) => {
    if (!month || !year) return "Carregando...";
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Agrupar transações por installment_id
  const groupedTransactions = React.useMemo(() => {
    const groups = new Map<string, typeof transactions>();
    
    transactions.forEach(transaction => {
      const installmentId = transaction.installment_id || 
        `inst_${transaction.description.replace(/- Parcela \d+\/\d+/, '').trim()}_${transaction.installment_total}`;
      
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
      
      return {
        installmentId,
        baseDescription: sortedTransactions[0].description.replace(/- Parcela \d+\/\d+/, '').trim(),
        total: sortedTransactions[0].installment_total,
        amount: sortedTransactions[0].amount,
        transactions: sortedTransactions,
        paidCount,
        pendingCount,
        totalAmount: sortedTransactions.reduce((sum, t) => sum + t.amount, 0),
        paidAmount: sortedTransactions.filter(t => !t.is_projected).reduce((sum, t) => sum + t.amount, 0)
      };
    }).sort((a, b) => a.baseDescription.localeCompare(b.baseDescription));
  }, [transactions]);

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
      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            disabled={!effectiveMonth || !effectiveYear}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <h2 className="text-xl font-semibold">
            {formatMonthYear(effectiveMonth, effectiveYear)}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            disabled={!effectiveMonth || !effectiveYear}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {latestStatement && (
          <Badge variant="secondary" className="text-sm">
            Último extrato: {formatMonthYear(latestStatement.month, latestStatement.year)}
          </Badge>
        )}
      </div>

      {/* Estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total de Parcelas</p>
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
                <p className="text-sm text-gray-600">Parcelas Pendentes</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingInstallments}</p>
                <p className="text-sm text-gray-500">{formatCurrency(stats.pendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de séries de parcelas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Séries de Parcelas</h3>
        
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
          groupedTransactions.map((group) => (
            <Card key={group.installmentId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{group.baseDescription}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {group.total} parcelas
                    </Badge>
                    <Badge 
                      variant={group.pendingCount > 0 ? "default" : "secondary"}
                      className={group.pendingCount > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}
                    >
                      {group.paidCount}/{group.total} pagas
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Valor por parcela: {formatCurrency(group.amount)}</span>
                  <span>Total: {formatCurrency(group.totalAmount)}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-2">
                {group.transactions.map((transaction) => (
                  <TransactionRowCard
                    key={transaction.id}
                    transaction={transaction}
                    showCategories={true}
                  />
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default InstallmentFilter;