
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
    <div className={cn("bg-white rounded-lg border shadow-sm", className)}>
      {/* Primeira linha - Filtros de categoria */}
      <div className="p-3 sm:p-4 border-b border-gray-100">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? "default" : "ghost"}
              size="sm"
              onClick={() => onFilterChange(filter.key)}
              className={cn(
                "h-8 px-3 text-xs font-medium rounded-md transition-all duration-150",
                "sm:h-9 sm:px-4 sm:text-sm",
                activeFilter === filter.key 
                  ? "bg-sage-600 hover:bg-sage-700 text-white shadow-sm" 
                  : "bg-sage-50 hover:bg-sage-100 text-sage-700 border border-sage-200"
              )}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Segunda linha - Pesquisa, Filtro e Ações */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Lado esquerdo - Pesquisa e Filtro */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 flex-1">
            {/* Campo de pesquisa */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Pesquisar"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-9 w-full bg-gray-50 border-gray-200 focus:bg-white focus:border-sage-300 rounded-md text-sm"
              />
            </div>

            {/* Filtro de período */}
            {filterConfig && onFilterConfigChange && (
              <FilterButton 
                config={filterConfig}
                onConfigChange={onFilterConfigChange}
                className="h-9 text-sm bg-white border-gray-200 hover:bg-gray-50"
              />
            )}
          </div>

          {/* Lado direito - Botões de ação */}
          <div className="flex items-center gap-2">
            {onAddIncome && (
              <Button 
                onClick={onAddIncome}
                size="sm"
                className="h-9 px-4 bg-sage-600 hover:bg-sage-700 text-white rounded-md font-medium text-sm shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Adicionar</span>
                <span className="sm:hidden">Receita</span>
                <span className="hidden md:inline ml-1">Receita</span>
              </Button>
            )}
            {onAddExpense && (
              <Button 
                onClick={onAddExpense}
                size="sm"
                variant="outline"
                className="h-9 px-4 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-md font-medium text-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Adicionar</span>
                <span className="sm:hidden">Despesa</span>
                <span className="hidden md:inline ml-1">Despesa</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickFilterButtons;
