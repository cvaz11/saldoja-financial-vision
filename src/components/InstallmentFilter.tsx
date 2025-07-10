import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useInstallmentTransactions, useInstallmentStats } from "@/hooks/useInstallmentTransactions";
import { useLatestTransactionMonth } from "@/hooks/useLatestTransactionMonth";
import { formatCurrency } from "@/lib/utils";
import TransactionRowCard from "./TransactionRowCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import MonthNavigator from "./MonthNavigator";

interface InstallmentFilterProps {}

const InstallmentFilter = ({}: InstallmentFilterProps = {}) => {
  const { data: latestTransaction } = useLatestTransactionMonth();
  
  // Usar mês do último extrato como padrão inicial
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (latestTransaction && !selectedMonth && !selectedYear) {
      setSelectedMonth(latestTransaction.month);
      setSelectedYear(latestTransaction.year);
    }
  }, [latestTransaction, selectedMonth, selectedYear]);

  const effectiveMonth = selectedMonth || new Date().getMonth() + 1;
  const effectiveYear = selectedYear || new Date().getFullYear();

  const { data: transactions = [], isLoading } = useInstallmentTransactions(effectiveMonth, effectiveYear);
  const stats = useInstallmentStats(effectiveMonth, effectiveYear);


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
      {/* Cabeçalho simples sem filtro duplicado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Parcelas</h2>
        
        {latestTransaction && (
          <Badge variant="secondary" className="text-sm">
            Último extrato: {formatMonthYear(latestTransaction.month, latestTransaction.year)}
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
        <div className="space-y-6">
          {/* Parcelas Pendentes - Destaque */}
          {(pendingGroups.length > 0 || partialGroups.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-600">
                  Parcelas Pendentes
                </h3>
                <Badge variant="destructive" className="bg-orange-100 text-orange-700 border-orange-200">
                  {pendingGroups.length + partialGroups.length} séries
                </Badge>
              </div>
              
              <div className="grid gap-4">
                {[...pendingGroups, ...partialGroups].map((group) => (
                  <Card key={group.installmentId} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {group.baseDescription}
                            <Badge variant="outline" className="text-xs">
                              {group.paidCount}/{group.total}
                            </Badge>
                          </CardTitle>
                          
                          {/* Barra de Progresso */}
                          <div className="mt-2 space-y-1">
                            <Progress value={group.progressPercentage} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {Math.round(group.progressPercentage)}% concluído
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">
                            {formatCurrency(group.pendingAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {group.pendingCount} pendentes
                          </p>
                        </div>
                      </div>

                      {/* Próxima Parcela */}
                      {group.nextInstallment && (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mt-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-sm">Próxima:</span>
                            <Badge variant="outline" className="text-xs">
                              {group.nextInstallment.installment_number}/{group.total}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(group.nextInstallment.transaction_date).toLocaleDateString('pt-BR', { 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </span>
                            <span className="text-sm font-medium ml-auto">
                              {formatCurrency(group.nextInstallment.amount)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    
                    <CardFooter className="pt-0">
                      <Button variant="outline" size="sm" className="w-full">
                        Ver Detalhes
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Separador */}
          {(pendingGroups.length > 0 || partialGroups.length > 0) && completedGroups.length > 0 && (
            <Separator />
          )}

          {/* Parcelas Completas */}
          {completedGroups.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-600">
                  Parcelas Completas
                </h3>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  {completedGroups.length} séries
                </Badge>
              </div>
              
              <div className="grid gap-4">
                {completedGroups.map((group) => (
                  <Card key={group.installmentId} className="border-l-4 border-l-green-500 bg-green-50/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {group.baseDescription}
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                              ✓ {group.total}/{group.total} pagas
                            </Badge>
                          </CardTitle>
                          
                          <div className="mt-2">
                            <Progress value={100} className="h-2" />
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(group.totalAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total pago
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardFooter className="pt-0">
                      <Button variant="ghost" size="sm" className="w-full text-green-700 hover:text-green-800">
                        Ver Histórico
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InstallmentFilter;