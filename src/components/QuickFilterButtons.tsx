
import React from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type QuickFilterType = 'all' | 'expenses' | 'income' | 'installments' | 'categories';

interface QuickFilterButtonsProps {
  activeFilter: QuickFilterType;
  onFilterChange: (filter: QuickFilterType) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  className?: string;
}

const QuickFilterButtons = ({ 
  activeFilter, 
  onFilterChange, 
  searchTerm, 
  onSearchChange, 
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
    <div className={cn("flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm", className)}>
      {/* Filtros em formato de lista horizontal */}
      <div className="flex items-center gap-1">
        {filters.map((filter) => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? "default" : "ghost"}
            size="sm"
            onClick={() => onFilterChange(filter.key)}
            className={cn(
              "h-8 px-4 rounded-full font-medium transition-all duration-200",
              activeFilter === filter.key 
                ? "bg-sage-600 hover:bg-sage-700 text-white shadow-sm" 
                : "bg-gray-100 hover:bg-sage-100 text-gray-700 hover:text-sage-700"
            )}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Campo de pesquisa */}
      <div className="relative flex-1 max-w-md ml-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Pesquisar"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-8 bg-gray-50 border-gray-200 focus:bg-white focus:border-sage-300 rounded-full"
        />
      </div>
    </div>
  );
};

export default QuickFilterButtons;
