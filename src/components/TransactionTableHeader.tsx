
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, User } from "lucide-react";
import DateRangePicker, { type DateRange } from "./DateRangePicker";

interface TransactionTableHeaderProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  onAddTransaction?: () => void;
  onProfileOpen: () => void;
}

const TransactionTableHeader = ({
  dateRange,
  onDateRangeChange,
  onRefresh,
  onAddTransaction,
  onProfileOpen
}: TransactionTableHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <DateRangePicker 
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        className="w-full sm:w-auto"
      />
      
      <div className="flex items-center gap-2">
        <Button 
          onClick={onRefresh}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        {onAddTransaction && (
          <Button 
            onClick={onAddTransaction}
            className="bg-sage-600 hover:bg-sage-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        )}
      </div>
    </div>
  );
};

export default TransactionTableHeader;
