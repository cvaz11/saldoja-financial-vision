import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findMisclassifiedTransactions, calculateReclassificationImpact, classifyTransaction } from "@/utils/transactionClassifier";
import { filterTransactionsByStatementCompetency } from "@/lib/invoice-competency";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TransactionReclassificationDialogProps {
  transactions: any[];
  onSuccess?: () => void;
}

const TransactionReclassificationDialog = ({ 
  transactions, 
  onSuccess 
}: TransactionReclassificationDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<any>(null);
  const { toast } = useToast();

  const runDryRun = () => {
    console.log('[RECLASSIFICATION] Iniciando DRY-RUN...');
    
    // Encontrar transações mal classificadas
    const misclassified = findMisclassifiedTransactions(transactions);
    
    // Calcular impacto por mês de competência
    const impact = calculateReclassificationImpact(
      misclassified,
      (transaction) => {
        // Usar a lógica de competência por extrato
        if (transaction.statement) {
          const statementMonth = transaction.statement.month;
          const statementYear = transaction.statement.year;
          
          // Competência = mês anterior ao extrato
          const competencyMonth = statementMonth === 1 ? 12 : statementMonth - 1;
          const competencyYear = statementMonth === 1 ? statementYear - 1 : statementYear;
          
          return { month: competencyMonth, year: competencyYear };
        }
        
        // Fallback para transações sem extrato
        const date = new Date(transaction.transaction_date);
        return { month: date.getMonth() + 1, year: date.getFullYear() };
      }
    );

    setDryRunResults({
      totalTransactions: transactions.length,
      misclassifiedCount: misclassified.length,
      misclassifiedTransactions: misclassified,
      impactByMonth: impact
    });

    console.log('[RECLASSIFICATION] DRY-RUN concluído:', {
      total: transactions.length,
      misclassified: misclassified.length,
      impact: Object.keys(impact).length + ' meses afetados'
    });
  };

  const applyReclassification = async () => {
    if (!dryRunResults || dryRunResults.misclassifiedCount === 0) {
      toast({
        title: "Nada para aplicar",
        description: "Não há transações para reclassificar.",
        variant: "default"
      });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      console.log('[RECLASSIFICATION] Aplicando reclassificação...');

      for (const transaction of dryRunResults.misclassifiedTransactions) {
        try {
          const newClassification = classifyTransaction(
            transaction.description || '',
            transaction.amount,
            transaction.is_credit
          );

          const { error } = await supabase
            .from('transactions')
            .update({ 
              is_credit: newClassification.isCredit 
            })
            .eq('id', transaction.id);

          if (error) {
            console.error('[RECLASSIFICATION] Erro ao atualizar transação:', transaction.id, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('[RECLASSIFICATION] Erro na transação:', transaction.id, error);
          errorCount++;
        }
      }

      console.log('[RECLASSIFICATION] Reclassificação concluída:', {
        sucesso: successCount,
        erros: errorCount
      });

      toast({
        title: "Reclassificação concluída",
        description: `${successCount} transações reclassificadas com sucesso${errorCount > 0 ? `, ${errorCount} erros` : ''}`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      if (successCount > 0) {
        setIsOpen(false);
        setDryRunResults(null);
        onSuccess?.();
      }

    } catch (error) {
      console.error('[RECLASSIFICATION] Erro geral:', error);
      toast({
        title: "Erro na reclassificação",
        description: "Ocorreu um erro durante a reclassificação das transações.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="hover:bg-orange-50 text-orange-600 border-orange-200"
          onClick={runDryRun}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Limpeza Retroativa
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Limpeza Retroativa de Classificações
          </DialogTitle>
        </DialogHeader>

        {!dryRunResults ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta ferramenta identifica e corrige automaticamente transações mal classificadas como "Despesa" quando deveriam ser "Receita" (ex: "Pagamento recebido", "Estorno", etc.).
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center">
              <Button onClick={runDryRun} className="w-full max-w-md">
                Executar Análise (DRY-RUN)
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumo do DRY-RUN */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Análise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total de Transações</p>
                    <p className="text-2xl font-bold">{dryRunResults.totalTransactions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Transações a Reclassificar</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {dryRunResults.misclassifiedCount}
                    </p>
                  </div>
                </div>

                {dryRunResults.misclassifiedCount === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Todas as transações estão classificadas corretamente! Não há necessidade de reclassificação.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {dryRunResults.misclassifiedCount} transações serão reclassificadas de "Despesa" para "Receita".
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Impacto por Mês */}
            {dryRunResults.misclassifiedCount > 0 && Object.keys(dryRunResults.impactByMonth).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Impacto nos Totais por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(dryRunResults.impactByMonth).map(([monthKey, data]: [string, any]) => (
                      <div key={monthKey} className="border rounded-lg p-3">
                        <div className="font-medium mb-2">{monthKey}</div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Despesas: {data.currentExpenses.toFixed(2)} → {data.newExpenses.toFixed(2)}</p>
                            <p className="text-gray-600">Receitas: {data.currentIncome.toFixed(2)} → {data.newIncome.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className={`font-medium ${data.impact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Impacto: {data.impact > 0 ? '-' : '+'}R$ {Math.abs(data.impact).toFixed(2)} em despesas
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transações que serão alteradas */}
            {dryRunResults.misclassifiedCount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transações que serão reclassificadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {dryRunResults.misclassifiedTransactions.slice(0, 20).map((transaction: any) => {
                      const newClassification = classifyTransaction(
                        transaction.description || '',
                        transaction.amount,
                        transaction.is_credit
                      );
                      
                      return (
                        <div key={transaction.id} className="flex justify-between items-center p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{transaction.description}</p>
                            <p className="text-xs text-gray-500">{newClassification.reason}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">R$ {Math.abs(transaction.amount).toFixed(2)}</span>
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              Despesa
                            </Badge>
                            <span className="text-xs">→</span>
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Receita
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    {dryRunResults.misclassifiedTransactions.length > 20 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        ... e mais {dryRunResults.misclassifiedTransactions.length - 20} transações
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botões de ação */}
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDryRunResults(null);
                  setIsOpen(false);
                }}
              >
                Cancelar
              </Button>
              
              {dryRunResults.misclassifiedCount > 0 && (
                <Button 
                  onClick={applyReclassification}
                  disabled={isProcessing}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isProcessing ? 'Aplicando...' : 'APLICAR Reclassificação'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionReclassificationDialog;