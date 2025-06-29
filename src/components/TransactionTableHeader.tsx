
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import FilterButton, { type FilterConfig } from "./FilterButton";
import QuickFilterButtons, { type QuickFilterType } from "./QuickFilterButtons";

interface TransactionTableHeaderProps {
  filterConfig?: FilterConfig;
  onFilterConfigChange?: (config: FilterConfig) => void;
  quickFilter?: QuickFilterType;
  onQuickFilterChange?: (filter: QuickFilterType) => void;
  onRefresh: () => void;
  onAddTransaction?: () => void;
  onProfileOpen: () => void;
}

const TransactionTableHeader = ({
  filterConfig,
  onFilterConfigChange,
  quickFilter = 'all',
  onQuickFilterChange,
  onRefresh,
  onAddTransaction,
  onProfileOpen
}: TransactionTableHeaderProps) => {
  return (
    <div className="space-y-4">
      {/* Botões de filtro rápido */}
      {onQuickFilterChange && (
        <QuickFilterButtons 
          activeFilter={quickFilter}
          onFilterChange={onQuickFilterChange}
        />
      )}
      
      {/* Linha com filtro avançado e ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {filterConfig && onFilterConfigChange && (
            <FilterButton 
              config={filterConfig}
              onConfigChange={onFilterConfigChange}
              className="w-full sm:w-auto"
            />
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
    </div>
  );
};

export default TransactionTableHeader;
