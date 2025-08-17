import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface StatementReconciliationProps {
  statements: any[];
  transactions: any[];
  competencyMonth: number;
  competencyYear: number;
}

interface ReconciliationData {
  statementId: string;
  bank: string;
  statementTotal: number;
  importedTotal: number;
  difference: number;
  possibleMissing: any[];
}

const StatementReconciliation = ({ 
  statements, 
  transactions, 
  competencyMonth, 
  competencyYear 
}: StatementReconciliationProps) => {
  const [expandedStatements, setExpandedStatements] = useState<string[]>([]);

  const toggleExpanded = (statementId: string) => {
    setExpandedStatements(prev => 
      prev.includes(statementId) 
        ? prev.filter(id => id !== statementId)
        : [...prev, statementId]
    );
  };

  // Calcular dados de reconciliação para cada extrato
  const reconciliationData: ReconciliationData[] = statements.map(statement => {
    // Filtrar transações deste extrato
    const statementTransactions = transactions.filter(t => t.statement_id === statement.id);
    
    // Calcular total importado (apenas despesas para comparar com total_debit do extrato)
    const importedExpenses = statementTransactions
      .filter(t => !t.is_credit)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const importedIncome = statementTransactions
      .filter(t => t.is_credit)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Total do extrato (usar total_debit para comparar com despesas)
    const statementDebitTotal = statement.total_debit || 0;
    const statementCreditTotal = statement.total_credit || 0;
    
    // Calcular diferença (focando em despesas que é onde geralmente há divergências)
    const expenseDifference = Math.abs(statementDebitTotal - importedExpenses);
    
    // Identificar possíveis transações perdidas/mal classificadas
    const possibleMissing = statementTransactions.filter(t => {
      // Transações que podem estar mal classificadas
      const description = (t.description || '').toLowerCase();
      const suspiciousTerms = [
        'pagamento recebido',
        'estorno',
        'reembolso',
        'credito',
        'ajuste'
      ];
      
      return (
        // Despesa que deveria ser receita
        (!t.is_credit && suspiciousTerms.some(term => description.includes(term))) ||
        // Valores muito altos que podem estar duplicados
        (Math.abs(t.amount) > 1000 && statementTransactions.filter(st => 
          Math.abs(st.amount - t.amount) < 0.01
        ).length > 1)
      );
    });

    return {
      statementId: statement.id,
      bank: statement.bank || 'Não informado',
      statementTotal: statementDebitTotal,
      importedTotal: importedExpenses,
      difference: expenseDifference,
      possibleMissing
    };
  });

  // Só mostrar se há extratos para o mês atual
  if (reconciliationData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Conciliação de Extratos - {competencyMonth}/{competencyYear}
      </h3>
      
      {reconciliationData.map(data => (
        <Card key={data.statementId} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{data.bank}</span>
                {data.difference <= 0.01 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Conciliado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Diferença: R$ {data.difference.toFixed(2)}
                  </Badge>
                )}
              </CardTitle>
              
              {data.difference > 0.01 && data.possibleMissing.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleExpanded(data.statementId)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {expandedStatements.includes(data.statementId) ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Ocultar faltantes
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver possíveis faltantes
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total do Extrato</p>
                <p className="font-semibold">R$ {data.statementTotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Importado</p>
                <p className="font-semibold">R$ {data.importedTotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Diferença</p>
                <p className={`font-semibold ${data.difference <= 0.01 ? 'text-green-600' : 'text-yellow-600'}`}>
                  R$ {data.difference.toFixed(2)}
                </p>
              </div>
            </div>

            {data.difference > 0.01 && (
              <Collapsible open={expandedStatements.includes(data.statementId)}>
                <CollapsibleContent className="mt-4">
                  {data.possibleMissing.length > 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        Possíveis transações mal classificadas:
                      </h4>
                      <div className="space-y-2">
                        {data.possibleMissing.map((transaction, index) => (
                          <div key={transaction.id || index} className="text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">
                                {transaction.description}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  R$ {Math.abs(transaction.amount).toFixed(2)}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={transaction.is_credit ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
                                >
                                  {transaction.is_credit ? 'Receita' : 'Despesa'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm">
                        Não foram identificadas transações suspeitas. A diferença pode ser devido a:
                        <br />• Transações não capturadas durante o processamento
                        <br />• Diferenças de arredondamento
                        <br />• Transações manuais adicionadas
                      </p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatementReconciliation;