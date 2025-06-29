
import React from "react";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FilterButton, { type FilterConfig } from "./FilterButton";

export type QuickFilterType = 'all' | 'expenses' | 'income' | 'installments' | 'categories';

interface QuickFilterButtonsProps {
  activeFilter: QuickFilterType;
  onFilterChange: (filter: QuickFilterType) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterConfig?: FilterConfig;
  onFilterConfigChange?: (config: FilterConfig) => void;
  onRefresh: () => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onProfileOpen: () => void;
  className?: string;
}

const QuickFilterButtons = ({ 
  activeFilter, 
  onFilterChange, 
  searchTerm, 
  onSearchChange,
  filterConfig,
  onFilterConfigChange,
  onRefresh,
  onAddIncome,
  onAddExpense,
  onProfileOpen,
  className 
}: QuickFilterButtonsProps) => {
  const filters = [
    { key: 'all' as const, label: 'Todos' },
    { key: 'expenses' as const, label: 'Despesas' },
    { key: 'income' as const, label: 'Receitas' },
    { key: 'installments' as const, label: 'Parcelas' },
    { key: 'categories' as const, label: 'Categorias' },
  ];

  return (
    <div className={cn("bg-white p-4 md:p-6 rounded-lg border shadow-sm", className)}>
      {/* Layout responsivo - Stack em mobile, grid em desktop */}
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
        
        {/* Filtros de categoria - Ocupa mais espaço em desktop */}
        <div className="lg:col-span-5 xl:col-span-6">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Button
                key={filter.key}
                variant={activeFilter === filter.key ? "default" : "ghost"}
                size="sm"
                onClick={() => onFilterChange(filter.key)}
                className={cn(
                  "h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm rounded-lg font-medium transition-all duration-200",
                  activeFilter === filter.key 
                    ? "bg-gray-900 hover:bg-gray-800 text-white" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                )}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Campo de pesquisa - Flexível */}
        <div className="lg:col-span-3 xl:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-8 md:h-9 w-full bg-gray-50 border-gray-200 focus:bg-white focus:border-gray-400 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Filtro de período e botões de ação */}
        <div className="lg:col-span-4 xl:col-span-4">
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 sm:items-center sm:justify-end">
            
            {/* Filtro de período */}
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-medium text-gray-600 hidden sm:inline">Período:</span>
              {filterConfig && onFilterConfigChange && (
                <FilterButton 
                  config={filterConfig}
                  onConfigChange={onFilterConfigChange}
                  className="h-8 md:h-9 text-xs md:text-sm"
                />
              )}
            </div>

            {/* Botões de adicionar */}
            <div className="flex items-center gap-2">
              {onAddIncome && (
                <Button 
                  onClick={onAddIncome}
                  size="sm"
                  className="h-8 md:h-9 px-3 md:px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-xs md:text-sm"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  <span className="hidden sm:inline">Adicionar</span>
                  <span className="hidden md:inline ml-1">Receita</span>
                </Button>
              )}
              {onAddExpense && (
                <Button 
                  onClick={onAddExpense}
                  size="sm"
                  variant="outline"
                  className="h-8 md:h-9 px-3 md:px-4 border-red-300 text-red-700 hover:bg-red-50 rounded-lg font-medium text-xs md:text-sm"
                >
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  <span className="hidden sm:inline">Adicionar</span>
                  <span className="hidden md:inline ml-1">Despesa</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickFilterButtons;
