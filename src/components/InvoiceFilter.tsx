
import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, CreditCard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface InvoiceFilterConfig {
  month: number;
  year: number;
  selectedBanks: string[];
  cutoffDay: number;
}

interface BankInfo {
  bank: string;
  closing_day: number;
  count: number;
}

interface InvoiceFilterProps {
  config: InvoiceFilterConfig;
  onConfigChange: (config: InvoiceFilterConfig) => void;
  className?: string;
}

const InvoiceFilter = ({ config, onConfigChange, className }: InvoiceFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableBanks, setAvailableBanks] = useState<BankInfo[]>([]);
  const { user } = useAuth();

  // Buscar bancos disponíveis com seus dias de fechamento
  useEffect(() => {
    const fetchBanks = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('statements')
        .select('bank, closing_day')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .not('bank', 'is', null);

      if (error) {
        console.error('Error fetching banks:', error);
        return;
      }

      // Agrupar por banco e dia de fechamento
      const bankMap = new Map<string, BankInfo>();
      
      data.forEach(statement => {
        const key = `${statement.bank}_${statement.closing_day}`;
        if (bankMap.has(key)) {
          bankMap.get(key)!.count++;
        } else {
          bankMap.set(key, {
            bank: statement.bank,
            closing_day: statement.closing_day,
            count: 1
          });
        }
      });

      const banks = Array.from(bankMap.values()).sort((a, b) => {
        if (a.bank !== b.bank) return a.bank.localeCompare(b.bank);
        return a.closing_day - b.closing_day;
      });

      setAvailableBanks(banks);
    };

    fetchBanks();
  }, [user]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(config.year, config.month - 1);
    const newDate = direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    
    onConfigChange({
      ...config,
      month: newDate.getMonth() + 1,
      year: newDate.getFullYear()
    });
  };

  const handleBankToggle = (bankKey: string, checked: boolean) => {
    const newSelectedBanks = checked
      ? [...config.selectedBanks, bankKey]
      : config.selectedBanks.filter(b => b !== bankKey);

    onConfigChange({
      ...config,
      selectedBanks: newSelectedBanks
    });
  };

  const handleSelectAllBanks = () => {
    const allBankKeys = availableBanks.map(bank => `${bank.bank}_${bank.closing_day}`);
    onConfigChange({
      ...config,
      selectedBanks: allBankKeys
    });
  };

  const handleDeselectAllBanks = () => {
    onConfigChange({
      ...config,
      selectedBanks: []
    });
  };

  const formatMonthYear = () => {
    const date = new Date(config.year, config.month - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const getSelectedBanksText = () => {
    if (config.selectedBanks.length === 0) return "Nenhum banco selecionado";
    if (config.selectedBanks.length === availableBanks.length) return "Todos os bancos";
    if (config.selectedBanks.length === 1) {
      const bankKey = config.selectedBanks[0];
      const bank = availableBanks.find(b => `${b.bank}_${b.closing_day}` === bankKey);
      return bank ? `${bank.bank} (dia ${bank.closing_day})` : "1 banco";
    }
    return `${config.selectedBanks.length} bancos selecionados`;
  };

  const getBankKey = (bank: BankInfo) => `${bank.bank}_${bank.closing_day}`;

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
              <div className="font-medium">Faturas de {formatMonthYear()}</div>
              <div className="text-xs text-gray-500">{getSelectedBanksText()}</div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <h4 className="font-medium text-sm mb-3">Selecionar Mês da Fatura</h4>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthChange('prev')}
            >
              ←
            </Button>
            <span className="font-medium">{formatMonthYear()}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthChange('next')}
            >
              →
            </Button>
          </div>
        </div>

        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Bancos</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleSelectAllBanks}
              >
                Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleDeselectAllBanks}
              >
                Nenhum
              </Button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableBanks.map((bank) => {
              const bankKey = getBankKey(bank);
              const isSelected = config.selectedBanks.includes(bankKey);
              
              return (
                <div key={bankKey} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                  <Checkbox
                    id={bankKey}
                    checked={isSelected}
                    onCheckedChange={(checked) => handleBankToggle(bankKey, checked as boolean)}
                  />
                  <label htmlFor={bankKey} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{bank.bank}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Fecha dia {bank.closing_day}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {bank.count} extrato{bank.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          <div className="mb-3">
            <label className="text-sm font-medium">
              Considerar faturas com vencimento até dia
            </label>
            <Select
              value={config.cutoffDay.toString()}
              onValueChange={(value) => onConfigChange({
                ...config,
                cutoffDay: parseInt(value)
              })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    Dia {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-500">
            Apenas faturas que vencem até este dia do mês atual serão consideradas nos gastos.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InvoiceFilter;
