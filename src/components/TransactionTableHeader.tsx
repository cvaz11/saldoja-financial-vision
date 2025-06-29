
import React from "react";
import { Button } from "@/components/ui/button";
import { Filter, Plus } from "lucide-react";
import FilterButton, { type FilterConfig } from "./FilterButton";
import QuickFilterButtons, { type QuickFilterType } from "./QuickFilterButtons";

interface TransactionTableHeaderProps {
  filterConfig?: FilterConfig;
  onFilterConfigChange?: (config: FilterConfig) => void;
  quickFilter?: QuickFilterType;
  onQuickFilterChange?: (filter: QuickFilterType) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  onRefresh: () => void;
  onAddTransaction?: () => void;
  onProfileOpen: () => void;
}

const TransactionTableHeader = ({
  filterConfig,
  onFilterConfigChange,
  quickFilter = 'all',
  onQuickFilterChange,
  searchTerm = '',
  onSearchChange,
  onRefresh,
  onAddTransaction,
  onProfileOpen
}: TransactionTableHeaderProps) => {
  return (
    <div className="space-y-4">
      {/* Seção de Filtros Rápidos e Pesquisa */}
      {onQuickFilterChange && onSearchChange && (
        <QuickFilterButtons 
          activeFilter={quickFilter}
          onFilterChange={onQuickFilterChange}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />
      )}
      
      {/* Seção de Controles Avançados */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
        {/* Filtro Avançado */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
            {filterConfig && onFilterConfigChange && (
              <FilterButton 
                config={filterConfig}
                onConfigChange={onFilterConfigChange}
                className="shadow-sm"
              />
            )}
          </div>
        </div>
        
        {/* Botões de Ação */}
        <div className="flex items-center gap-3">
          {onAddTransaction && (
            <>
              <Button 
                onClick={onAddTransaction}
                className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all duration-200 rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Receita
              </Button>
              
              <Button 
                onClick={onAddTransaction}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all duration-200 rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Despesa
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionTableHeader;
