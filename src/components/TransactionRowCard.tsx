
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  description: string;
  value: number;
  installment: string;
  category: string;
  bank: string;
  date: string;
  status: "Pago" | "Não Pago" | "Receita";
}

interface TransactionRowCardProps {
  transaction: Transaction;
}

const TransactionRowCard = ({ transaction }: TransactionRowCardProps) => {
  const getStatusBadge = (status: string) => {
    const statusColors = {
      "Pago": "bg-sage-100 text-sage-700",
      "Não Pago": "bg-orange-100 text-orange-700", 
      "Receita": "bg-sage-200 text-sage-800"
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors]}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2 
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center min-w-0 flex-1">
          <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
            💳
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
            <p className="text-sm text-gray-500">{transaction.bank}</p>
          </div>
        </div>
        <div className="text-right ml-4 flex-shrink-0">
          <p className="font-bold text-lg">{formatCurrency(transaction.value)}</p>
          {getStatusBadge(transaction.status)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Data:</span>
          <p className="font-medium">{transaction.date}</p>
        </div>
        <div>
          <span className="text-gray-500">Categoria:</span>
          <p className="font-medium">{transaction.category}</p>
        </div>
        <div>
          <span className="text-gray-500">Parcela:</span>
          <p className="font-medium">{transaction.installment}</p>
        </div>
      </div>
    </div>
  );
};

export default TransactionRowCard;
