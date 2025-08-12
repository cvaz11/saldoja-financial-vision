
import React from "react";

interface Transaction {
  id?: string;
  amount: number;
  is_credit: boolean;
  statement_id?: string | null;
  is_projected?: boolean;
  transaction_date?: string;
}

interface TransactionTableFooterProps {
  transactions: Transaction[];
  alwaysVisible?: boolean;
}

const TransactionTableFooter = ({ transactions, alwaysVisible = false }: TransactionTableFooterProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  // Calculate totals
  const totals = React.useMemo(() => {
    const debitItems = transactions.filter(t => !t.is_credit);
    const creditItems = transactions.filter(t => t.is_credit);

    const totalDebits = debitItems.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalCredits = creditItems.reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalCredits - totalDebits;

    // Logs temporários de diagnóstico
    const debitIds = debitItems.map((t: any) => t.id || '(sem-id)');
    console.log('[FOOTER] Visíveis:', transactions.length, 'Despesas consideradas:', debitItems.length);
    console.log('[FOOTER] IDs somados (despesas):', debitIds);
    console.log('[FOOTER] Total despesas:', totalDebits.toFixed(2), 'Créditos:', totalCredits.toFixed(2), 'Saldo:', balance.toFixed(2));

    return { totalDebits, totalCredits, balance };
  }, [transactions]);


  return (
    <div className="fixed bottom-0 left-0 right-0 bg-sage-100 border-t-2 border-sage-300 p-4 shadow-lg z-50">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Total Bar */}
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
  );
};

export default TransactionTableFooter;
