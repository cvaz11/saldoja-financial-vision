
import React from "react";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus, RefreshCw, User } from "lucide-react";
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
    <div className={cn("bg-white p-6 rounded-lg border shadow-sm space-y-4", className)}>
      {/* Header com título e botões de ação */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Movimentações</h1>
        <div className="flex items-center gap-3">
          <Button 
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="h-9 px-4 bg-gray-50 hover:bg-gray-100 border-gray-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={onProfileOpen}
            variant="outline"
            size="sm"
            className="h-9 px-4 bg-gray-50 hover:bg-gray-100 border-gray-300"
          >
            <User className="h-4 w-4 mr-2" />
            Perfil
          </Button>
        </div>
      </div>

      {/* Linha principal com filtros, pesquisa e botões de ação */}
      <div className="flex items-center justify-between gap-4">
        {/* Filtros de categoria */}
        <div className="flex items-center gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? "default" : "ghost"}
              size="sm"
              onClick={() => onFilterChange(filter.key)}
              className={cn(
                "h-9 px-4 rounded-lg font-medium transition-all duration-200",
                activeFilter === filter.key 
                  ? "bg-gray-900 hover:bg-gray-800 text-white" 
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              )}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Área direita com pesquisa, filtro e botões de ação */}
        <div className="flex items-center gap-4">
          {/* Campo de pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9 w-64 bg-gray-50 border-gray-200 focus:bg-white focus:border-gray-400 rounded-lg"
            />
          </div>

          {/* Filtro de período */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Período:</span>
            {filterConfig && onFilterConfigChange && (
              <FilterButton 
                config={filterConfig}
                onConfigChange={onFilterConfigChange}
                className="h-9"
              />
            )}
          </div>

          {/* Botões de adicionar */}
          <div className="flex items-center gap-2">
            {onAddIncome && (
              <Button 
                onClick={onAddIncome}
                size="sm"
                className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Receita
              </Button>
            )}
            {onAddExpense && (
              <Button 
                onClick={onAddExpense}
                size="sm"
                variant="outline"
                className="h-9 px-4 border-red-300 text-red-700 hover:bg-red-50 rounded-lg font-medium"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Despesa
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickFilterButtons;
