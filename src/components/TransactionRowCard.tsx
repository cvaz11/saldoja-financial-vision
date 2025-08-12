import React from 'react';
import { formatCurrency } from "@/lib/utils";
import { Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InstallmentBadge from "./InstallmentBadge";

interface TransactionRowCardProps {
  transaction: {
    id: string;
    description: string;
    amount: number;
    transaction_date: string;
    is_credit: boolean;
    category?: string;
    installment_number?: number;
    installment_total?: number;
    statement_id?: string;
    is_projected?: boolean;
  };
  showCategories?: boolean;
  onEdit?: (transaction: any) => void;
  onDelete?: (id: string) => void;
  paidBeforeStart?: boolean;
}

const TransactionRowCard = ({ 
  transaction, 
  showCategories = false, 
  onEdit, 
  onDelete,
  paidBeforeStart = false,
}: TransactionRowCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-medium text-gray-900 truncate">
                {transaction.description}
              </p>
              <InstallmentBadge 
                installmentNumber={transaction.installment_number}
                installmentTotal={transaction.installment_total}
                isProjected={transaction.is_projected || false}
                paidBeforeStart={paidBeforeStart}
              />
              {showCategories && transaction.category && (
                <Badge variant="outline" className="text-xs">
                  {transaction.category}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {formatDate(transaction.transaction_date)}
            </p>
          </div>

          <div className="text-right flex items-center gap-2">
            <div>
              <p className={`font-bold text-lg ${
                transaction.is_credit ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.is_credit ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
            </div>
            
            {(onEdit || onDelete) && (
              <div className="flex gap-1">
                {onEdit && (
                  <Button
                    onClick={() => onEdit(transaction)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    onClick={() => onDelete(transaction.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionRowCard;