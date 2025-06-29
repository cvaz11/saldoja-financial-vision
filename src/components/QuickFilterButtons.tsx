
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QuickFilterType = 'all' | 'expenses' | 'income' | 'installments' | 'categories';

interface QuickFilterButtonsProps {
  activeFilter: QuickFilterType;
  onFilterChange: (filter: QuickFilterType) => void;
  className?: string;
}

const QuickFilterButtons = ({ activeFilter, onFilterChange, className }: QuickFilterButtonsProps) => {
  const filters = [
    { key: 'all' as const, label: 'Todos' },
    { key: 'expenses' as const, label: 'Despesas' },
    { key: 'income' as const, label: 'Receitas' },
    { key: 'installments' as const, label: 'Parcelas' },
    { key: 'categories' as const, label: 'Categorias' },
  ];

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2", className)}>
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={activeFilter === filter.key ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
          className={cn(
            "whitespace-nowrap min-w-fit",
            activeFilter === filter.key 
              ? "bg-sage-600 hover:bg-sage-700 text-white" 
              : "bg-white border-gray-300 hover:bg-gray-50 text-gray-700"
          )}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
};

export default QuickFilterButtons;
