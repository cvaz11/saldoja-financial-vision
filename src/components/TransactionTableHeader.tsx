
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import DateRangePicker, { type DateRange } from "./DateRangePicker";

interface TransactionTableHeaderProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  onAddTransaction?: () => void;
  onProfileOpen: () => void;
  viewMode?: 'date-range' | 'invoice';
  onViewModeChange?: (mode: 'date-range' | 'invoice') => void;
}

const TransactionTableHeader = ({
  dateRange,
  onDateRangeChange,
  onRefresh,
  onAddTransaction,
  onProfileOpen,
  viewMode = 'date-range',
  onViewModeChange
}: TransactionTableHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {viewMode === 'date-range' && (
          <DateRangePicker 
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            className="w-full sm:w-auto"
          />
        )}
        
        {onViewModeChange && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange(viewMode === 'date-range' ? 'invoice' : 'date-range')}
            className="flex items-center gap-2"
          >
            {viewMode === 'date-range' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
            {viewMode === 'date-range' ? 'Ver por Fatura' : 'Ver por Período'}
          </Button>
        )}
      </div>
      
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
