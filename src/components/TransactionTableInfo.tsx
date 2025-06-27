
import React from "react";

interface TransactionTableInfoProps {
  transactionCount: number;
  dateRange: { from: Date; to: Date };
  invoiceClosingDay?: number;
}

const TransactionTableInfo = ({ 
  transactionCount, 
  dateRange, 
  invoiceClosingDay 
}: TransactionTableInfoProps) => {
  if (!invoiceClosingDay) return null;

  return (
    <div className="bg-sage-50 p-3 rounded border border-sage-200 text-sm">
      <div className="text-sage-800 font-medium mb-1">Informações do Período:</div>
      <div className="text-sage-700">
        • {transactionCount} transações encontradas<br/>
        • Período: {dateRange.from.toLocaleDateString('pt-BR')} a {dateRange.to.toLocaleDateString('pt-BR')}<br/>
        • Fechamento da fatura: dia {invoiceClosingDay} de cada mês
      </div>
    </div>
  );
};

export default TransactionTableInfo;
