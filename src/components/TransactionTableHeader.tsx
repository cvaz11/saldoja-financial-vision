
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-6">
      {/* Seção de Filtros Rápidos */}
      {onQuickFilterChange && (
        <Card className="bg-gradient-to-r from-sage-50 to-white border-sage-200/50">
          <CardContent className="p-4">
            <QuickFilterButtons 
              activeFilter={quickFilter}
              onFilterChange={onQuickFilterChange}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Seção de Controles Avançados */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Filtro Avançado */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
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
              <Button 
                onClick={onRefresh}
                variant="outline"
                size="sm"
                className="h-9 px-4 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              
              {onAddTransaction && (
                <Button 
                  onClick={onAddTransaction}
                  className="h-9 px-6 bg-sage-600 hover:bg-sage-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionTableHeader;
