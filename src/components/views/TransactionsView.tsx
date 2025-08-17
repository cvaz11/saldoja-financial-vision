import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import TransactionTable from "@/components/TransactionTable";
import StatementReconciliation from "@/components/StatementReconciliation";
import TransactionReclassificationDialog from "@/components/TransactionReclassificationDialog";
import { useFilteredTransactions } from "@/hooks/useInvoiceTransactions";
import { useDefaultInvoiceFilter } from "@/hooks/useDefaultInvoiceFilter";
import { useMemo } from "react";

interface TransactionsViewProps {
  onAddTransaction: () => void;
  onProfileClick: () => void;
  onRefresh?: () => void;
}

const TransactionsView = ({ onAddTransaction, onProfileClick, onRefresh }: TransactionsViewProps) => {
  // Buscar filtro padrão e transações para conciliação
  const { filterConfig: defaultFilter, isLoading } = useDefaultInvoiceFilter();
  
  const { data: transactions = [] } = useFilteredTransactions(
    defaultFilter,
    !isLoading
  );

  // Extrair extratos das transações para conciliação
  const statements = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const uniqueStatements = new Map();
    transactions.forEach((transaction: any) => {
      if (transaction.statement_id && !uniqueStatements.has(transaction.statement_id)) {
        // Simular dados do statement baseado nas transações
        const statementTransactions = transactions.filter((t: any) => t.statement_id === transaction.statement_id);
        const totalDebit = statementTransactions.filter((t: any) => !t.is_credit).reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        const totalCredit = statementTransactions.filter((t: any) => t.is_credit).reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        
        uniqueStatements.set(transaction.statement_id, {
          id: transaction.statement_id,
          bank: transaction.statements?.bank || 'Banco',
          total_debit: totalDebit,
          total_credit: totalCredit,
          month: defaultFilter?.invoiceConfig?.month || new Date().getMonth() + 1,
          year: defaultFilter?.invoiceConfig?.year || new Date().getFullYear()
        });
      }
    });
    
    return Array.from(uniqueStatements.values());
  }, [transactions, defaultFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Movimentações</h1>
          {import.meta.env.DEV && (
            <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
              Competência por Extrato
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <TransactionReclassificationDialog 
            transactions={transactions}
            onSuccess={onRefresh}
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="hover:bg-sage-50 hidden sm:flex"
            onClick={onRefresh}
          >
            🔄 Atualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onProfileClick}
            className="hover:bg-sage-50"
          >
            <User className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Perfil</span>
          </Button>
        </div>
      </div>

      {/* Conciliação de Extratos */}
      {statements.length > 0 && transactions.length > 0 && (
        <StatementReconciliation
          statements={statements}
          transactions={transactions}
          competencyMonth={defaultFilter?.invoiceConfig?.month || new Date().getMonth() + 1}
          competencyYear={defaultFilter?.invoiceConfig?.year || new Date().getFullYear()}
        />
      )}

      {/* Transaction Table with unified handlers */}
      <TransactionTable 
        onAddTransaction={onAddTransaction}
        showCategories={true}
        onRefresh={onRefresh}
      />
    </div>
  );
};

export default TransactionsView;