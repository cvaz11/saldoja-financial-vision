
import React from "react";
import { type FilterConfig } from "./FilterButton";
import { type QuickFilterType } from "./QuickFilterButtons";
import QuickFilterButtons from "./QuickFilterButtons";

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
    <QuickFilterButtons 
      activeFilter={quickFilter}
      onFilterChange={onQuickFilterChange || (() => {})}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange || (() => {})}
      filterConfig={filterConfig}
      onFilterConfigChange={onFilterConfigChange}
      onRefresh={onRefresh}
      onAddIncome={onAddTransaction}
      onAddExpense={onAddTransaction}
      onProfileOpen={onProfileOpen}
    />
  );
};

export default TransactionTableHeader;
