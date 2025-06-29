
import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, CreditCard, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface InvoiceFilterProps {
  config: FilterConfig;
  onConfigChange: (config: FilterConfig) => void;
  className?: string;
}

const InvoiceFilter = ({ config, onConfigChange, className }: InvoiceFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'date-range' | 'invoices'>(config.type || 'date-range');
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [availableStatements, setAvailableStatements] = useState<StatementInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  // Estados locais para as abas
  const [localDateRange, setLocalDateRange] = useState<DateRangeConfig>(
    config.dateRange || { 
      from: startOfMonth(new Date()), 
      to: endOfMonth(new Date()) 
    }
  );
  
  const [localInvoiceConfig, setLocalInvoiceConfig] = useState<InvoiceFilterConfig>(
    config.invoiceConfig || {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      selectedStatements: []
    }
  );

  // Buscar meses disponíveis
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      if (!user) return;

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
  }, [user]);

  // Buscar extratos do mês selecionado
  useEffect(() => {
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

  const formatCurrentPeriod = () => {
    if (config.type === 'date-range' && config.dateRange) {
      const from = format(config.dateRange.from, "dd/MM/yy", { locale: ptBR });
      const to = format(config.dateRange.to, "dd/MM/yy", { locale: ptBR });
      return `${from} - ${to}`;
    } else if (config.type === 'invoices' && config.invoiceConfig) {
      const monthName = format(new Date(config.invoiceConfig.year, config.invoiceConfig.month - 1), "MMMM yyyy", { locale: ptBR });
      return `Faturas ${monthName}`;
    }
    return "Selecionar período";
  };

  const filteredStatements = availableStatements.filter(statement =>
    statement.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
    statement.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canNavigatePrev = availableMonths.findIndex(
    m => m.month === localInvoiceConfig.month && m.year === localInvoiceConfig.year
  ) < availableMonths.length - 1;

  const canNavigateNext = availableMonths.findIndex(
    m => m.month === localInvoiceConfig.month && m.year === localInvoiceConfig.year
  ) > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between text-left font-normal min-w-[280px]",
            className
          )}
        >
          <div className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            <div>
              <div className="font-medium">{formatCurrentPeriod()}</div>
              <div className="text-xs text-gray-500">
                {config.type === 'invoices' && config.invoiceConfig 
                  ? `${config.invoiceConfig.selectedStatements.length} extratos`
                  : 'Filtro por período'
                }
              </div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="p-4 border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="date-range">Por Data</TabsTrigger>
              <TabsTrigger value="invoices">Por Faturas</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="date-range" className="p-4 mt-0">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Selecionar Período</h4>
              <Calendar
                mode="range"
                selected={{ from: localDateRange.from, to: localDateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setLocalDateRange({ from: range.from, to: range.to });
                  }
                }}
                className="p-3 pointer-events-auto"
                showOutsideDays={false}
              />
              <div className="text-xs text-gray-600">
                {format(localDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(localDateRange.to, "dd/MM/yyyy", { locale: ptBR })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="p-4 mt-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-3">Mês da Fatura</h4>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMonthNavigation('prev')}
                    disabled={!canNavigatePrev}
                  >
                    ←
                  </Button>
                  <span className="font-medium">
                    {format(new Date(localInvoiceConfig.year, localInvoiceConfig.month - 1), "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMonthNavigation('next')}
                    disabled={!canNavigateNext}
                  >
                    →
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Extratos</h4>
                <Input
                  placeholder="Pesquisar extratos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-3"
                />
                
                {localInvoiceConfig.selectedStatements.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {localInvoiceConfig.selectedStatements.map(statementId => {
                      const statement = availableStatements.find(s => s.id === statementId);
                      if (!statement) return null;
                      
                      return (
                        <Badge key={statementId} variant="secondary" className="flex items-center gap-1">
                          {statement.bank}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleStatementToggle(statementId)}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredStatements.map((statement) => {
                    const isSelected = localInvoiceConfig.selectedStatements.includes(statement.id);
                    
                    return (
                      <div 
                        key={statement.id} 
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          isSelected ? "bg-sage-50 border-sage-200" : "hover:bg-gray-50"
                        )}
                        onClick={() => handleStatementToggle(statement.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{statement.bank}</div>
                            <div className="text-xs text-gray-500">
                              Fecha dia {statement.closing_day} • {statement.filename}
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
              </div>
            </div>
          </TabsContent>

          <div className="p-4 border-t">
            <Button 
              onClick={handleConfirm}
              className="w-full"
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

export default InvoiceFilter;
