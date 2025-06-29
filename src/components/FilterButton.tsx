
import React, { useState } from "react";
import { Filter, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface DateRangeConfig {
  from: Date;
  to: Date;
}

export interface InvoiceFilterConfig {
  month: number;
  year: number;
  selectedStatements: string[];
}

export interface FilterConfig {
  type: 'date-range' | 'invoices';
  dateRange?: DateRangeConfig;
  invoiceConfig?: InvoiceFilterConfig;
}

interface AvailableMonth {
  month: number;
  year: number;
  count: number;
}

interface StatementInfo {
  id: string;
  bank: string;
  closing_day: number;
  filename: string;
}

interface FilterButtonProps {
  config: FilterConfig;
  onConfigChange: (config: FilterConfig) => void;
  className?: string;
}

const FilterButton = ({ config, onConfigChange, className }: FilterButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'date-range' | 'invoices'>(config.type || 'date-range');
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [availableStatements, setAvailableStatements] = useState<StatementInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  // Estados locais para as abas
  const [localDateRange, setLocalDateRange] = useState<DateRangeConfig>(
    config.dateRange || { 
      from: new Date(), 
      to: new Date() 
    }
  );
  
  const [localInvoiceConfig, setLocalInvoiceConfig] = useState<InvoiceFilterConfig>(
    config.invoiceConfig || {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      selectedStatements: []
    }
  );

  // Buscar meses disponíveis quando necessário
  React.useEffect(() => {
    const fetchAvailableMonths = async () => {
      if (!user || activeTab !== 'invoices') return;

      const { data, error } = await supabase
        .from('statements')
        .select('month, year')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .not('month', 'is', null)
        .not('year', 'is', null);

      if (error) {
        console.error('Error fetching available months:', error);
        return;
      }

      // Agrupar por mês/ano
      const monthMap = new Map<string, AvailableMonth>();
      data.forEach(statement => {
        const key = `${statement.year}-${statement.month}`;
        if (monthMap.has(key)) {
          monthMap.get(key)!.count++;
        } else {
          monthMap.set(key, {
            month: statement.month,
            year: statement.year,
            count: 1
          });
        }
      });

      const months = Array.from(monthMap.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      setAvailableMonths(months);
    };

    fetchAvailableMonths();
  }, [user, activeTab]);

  // Buscar extratos do mês selecionado
  React.useEffect(() => {
    const fetchStatements = async () => {
      if (!user || activeTab !== 'invoices') return;

      const { data, error } = await supabase
        .from('statements')
        .select('id, bank, closing_day, filename')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .eq('month', localInvoiceConfig.month)
        .eq('year', localInvoiceConfig.year);

      if (error) {
        console.error('Error fetching statements:', error);
        return;
      }

      setAvailableStatements(data || []);
    };

    fetchStatements();
  }, [user, activeTab, localInvoiceConfig.month, localInvoiceConfig.year]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'date-range' | 'invoices');
  };

  const handleMonthNavigation = (direction: 'prev' | 'next') => {
    const currentIndex = availableMonths.findIndex(
      m => m.month === localInvoiceConfig.month && m.year === localInvoiceConfig.year
    );
    
    const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < availableMonths.length) {
      const newMonth = availableMonths[newIndex];
      setLocalInvoiceConfig({
        ...localInvoiceConfig,
        month: newMonth.month,
        year: newMonth.year,
        selectedStatements: []
      });
    }
  };

  const handleStatementToggle = (statementId: string) => {
    const isSelected = localInvoiceConfig.selectedStatements.includes(statementId);
    const newSelected = isSelected
      ? localInvoiceConfig.selectedStatements.filter(id => id !== statementId)
      : [...localInvoiceConfig.selectedStatements, statementId];

    setLocalInvoiceConfig({
      ...localInvoiceConfig,
      selectedStatements: newSelected
    });
  };

  const handleConfirm = () => {
    if (activeTab === 'date-range') {
      onConfigChange({
        type: 'date-range',
        dateRange: localDateRange
      });
    } else {
      onConfigChange({
        type: 'invoices',
        invoiceConfig: localInvoiceConfig
      });
    }
    setIsOpen(false);
  };

  const getMonthName = (month: number, year: number) => {
    return format(new Date(year, month - 1), "MMMM yyyy", { locale: ptBR });
  };

  const canNavigatePrev = availableMonths.findIndex(
    m => m.month === localInvoiceConfig.month && m.year === localInvoiceConfig.year
  ) < availableMonths.length - 1;

  const canNavigateNext = availableMonths.findIndex(
    m => m.month === localInvoiceConfig.month && m.year === localInvoiceConfig.year
  ) > 0;

  const filteredStatements = availableStatements.filter(statement =>
    statement.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
    statement.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2 bg-white border-gray-300 hover:bg-gray-50",
            className
          )}
        >
          <Filter className="h-4 w-4" />
          Filtro
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* Header com abas */}
          <div className="p-4 border-b">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger 
                value="date-range"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Por Data
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Por Extratos
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Conteúdo da aba Por Data */}
          <TabsContent value="date-range" className="p-4 mt-0 space-y-4">
            <Calendar
              mode="range"
              selected={{ from: localDateRange.from, to: localDateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setLocalDateRange({ from: range.from, to: range.to });
                }
              }}
              className="w-full"
              showOutsideDays={false}
            />
          </TabsContent>

          {/* Conteúdo da aba Por Extratos */}
          <TabsContent value="invoices" className="p-4 mt-0 space-y-4">
            {/* Navegação do mês */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMonthNavigation('prev')}
                disabled={!canNavigatePrev}
                className="p-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm">
                {getMonthName(localInvoiceConfig.month, localInvoiceConfig.year)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMonthNavigation('next')}
                disabled={!canNavigateNext}
                className="p-1"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Campo de pesquisa */}
            <Input
              placeholder="Pesquisar Extratos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />

            {/* Chips dos extratos selecionados */}
            {localInvoiceConfig.selectedStatements.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localInvoiceConfig.selectedStatements.map(statementId => {
                  const statement = availableStatements.find(s => s.id === statementId);
                  if (!statement) return null;
                  
                  return (
                    <Badge 
                      key={statementId} 
                      variant="secondary" 
                      className="bg-sage-100 text-sage-800 hover:bg-sage-200 flex items-center gap-1"
                    >
                      {statement.bank}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:bg-sage-300 rounded-full" 
                        onClick={() => handleStatementToggle(statementId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Lista de extratos */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredStatements.map((statement) => {
                const isSelected = localInvoiceConfig.selectedStatements.includes(statement.id);
                
                return (
                  <div 
                    key={statement.id} 
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      isSelected ? "bg-sage-50 border-sage-200" : "hover:bg-gray-50 border-gray-200"
                    )}
                    onClick={() => handleStatementToggle(statement.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{statement.bank}</div>
                        <div className="text-xs text-gray-500">
                          Fecha dia {statement.closing_day}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 bg-sage-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Botão Confirmar */}
          <div className="p-4 border-t">
            <Button 
              onClick={handleConfirm}
              className="w-full bg-sage-600 hover:bg-sage-700 text-white"
              disabled={activeTab === 'invoices' && localInvoiceConfig.selectedStatements.length === 0}
            >
              Confirmar
            </Button>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default FilterButton;
