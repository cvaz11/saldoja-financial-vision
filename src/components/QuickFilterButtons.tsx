
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type QuickFilterType = 'all' | 'expenses' | 'income' | 'installments' | 'categories';

interface QuickFilterButtonsProps {
  activeFilter: QuickFilterType;
  onFilterChange: (filter: QuickFilterType) => void;
  className?: string;
}

const QuickFilterButtons = ({ activeFilter, onFilterChange, className }: QuickFilterButtonsProps) => {
  const filters = [
    { key: 'all' as const, label: 'Todos', icon: '📊' },
    { key: 'expenses' as const, label: 'Despesas', icon: '💸' },
    { key: 'income' as const, label: 'Receitas', icon: '💰' },
    { key: 'installments' as const, label: 'Parcelas', icon: '📅' },
    { key: 'categories' as const, label: 'Categorias', icon: '🏷️' },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Título da seção */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-gray-700">Filtros Rápidos</h3>
        <Badge variant="outline" className="text-xs">
          {filters.find(f => f.key === activeFilter)?.label}
        </Badge>
      </div>
      
      {/* Botões de filtro */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.key)}
            className={cn(
              "h-9 px-4 font-medium transition-all duration-200 border-2",
              activeFilter === filter.key 
                ? "bg-sage-600 hover:bg-sage-700 text-white border-sage-600 shadow-sm" 
                : "bg-white border-gray-200 hover:bg-sage-50 hover:border-sage-300 text-gray-700 hover:text-sage-700"
            )}
          >
            <span className="mr-2 text-sm">{filter.icon}</span>
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickFilterButtons;
