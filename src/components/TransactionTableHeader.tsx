
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
  onAddIncome?: () => void;
  onAddExpense?: () => void;
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
  onAddIncome,
  onAddExpense,
  onProfileOpen
}: TransactionTableHeaderProps) => {
  // Ensure handlers are always defined
  const handleQuickFilterChange = onQuickFilterChange || (() => {});
  const handleSearchChange = onSearchChange || (() => {});
  const handleAddIncome = onAddIncome || (() => {});
  const handleAddExpense = onAddExpense || (() => {});

  return (
    <QuickFilterButtons 
      activeFilter={quickFilter}
      onFilterChange={handleQuickFilterChange}
      searchTerm={searchTerm}
      onSearchChange={handleSearchChange}
      filterConfig={filterConfig}
      onFilterConfigChange={onFilterConfigChange}
      onRefresh={onRefresh}
      onAddIncome={handleAddIncome}
      onAddExpense={handleAddExpense}
      onProfileOpen={onProfileOpen}
    />
  );
};

export default TransactionTableHeader;
