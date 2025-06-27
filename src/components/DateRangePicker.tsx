
import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/hooks/useUserProfile";
import { calculateInvoiceCycle, getUpcomingInvoiceCycles } from "@/lib/invoice-utils";

export type DateRangeMode = 'invoice-cycle' | 'custom' | 'range';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

const DateRangePicker = ({ dateRange, onDateRangeChange, className }: DateRangePickerProps) => {
  const [mode, setMode] = useState<DateRangeMode>('invoice-cycle');
  const [isOpen, setIsOpen] = useState(false);
  const { profile } = useUserProfile();

  const invoiceCycles = profile ? getUpcomingInvoiceCycles(profile.invoice_closing_day, 6) : [];

  const handleModeChange = (newMode: DateRangeMode) => {
    setMode(newMode);
  };

  const handleInvoiceCycleSelect = (cycleIndex: number) => {
    if (invoiceCycles[cycleIndex]) {
      const cycle = invoiceCycles[cycleIndex];
      onDateRangeChange({ from: cycle.startDate, to: cycle.endDate });
      setIsOpen(false);
    }
  };

  const handleRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onDateRangeChange({ from: range.from, to: range.to });
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    if (mode === 'invoice-cycle' && profile) {
      // Encontrar qual ciclo está sendo exibido
      const currentCycle = invoiceCycles.find(cycle => 
        cycle.startDate.getTime() === dateRange.from.getTime() && 
        cycle.endDate.getTime() === dateRange.to.getTime()
      );
      
      if (currentCycle) {
        return `Fatura ${currentCycle.displayName}`;
      }
    }
    
    const fromFormatted = format(dateRange.from, "dd/MM/yy", { locale: ptBR });
    const toFormatted = format(dateRange.to, "dd/MM/yy", { locale: ptBR });
    
    return `${fromFormatted} - ${toFormatted}`;
  };

  const renderModeContent = () => {
    switch (mode) {
      case 'invoice-cycle':
        if (!profile) {
          return (
            <div className="p-3 text-sm text-gray-500">
              Configure seu dia de fechamento no perfil para usar esta opção.
            </div>
          );
        }
        
        return (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Ciclos de Fatura</h4>
            <div className="text-xs text-gray-500 mb-2">
              Fechamento todo dia {profile.invoice_closing_day}
            </div>
            <div className="space-y-1">
              {invoiceCycles.map((cycle, index) => (
                <Button 
                  key={index}
                  variant="ghost" 
                  className="w-full justify-start text-sm"
                  onClick={() => handleInvoiceCycleSelect(index)}
                >
                  <div className="text-left">
                    <div className="font-medium">{cycle.displayName}</div>
                    <div className="text-xs text-gray-500">
                      {format(cycle.startDate, "dd/MM", { locale: ptBR })} a {format(cycle.endDate, "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );
        
      case 'range':
        return (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Selecionar período personalizado</h4>
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={handleRangeSelect}
              className="p-3 pointer-events-auto"
              showOutsideDays={false}
              numberOfMonths={1}
            />
            <div className="px-3 text-xs text-gray-600">
              {dateRange.from && dateRange.to ? (
                `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
              ) : (
                "Selecione a data inicial e final"
              )}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between text-left font-normal min-w-[200px]",
            className
          )}
        >
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <Select value={mode} onValueChange={handleModeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice-cycle">Ciclo de Fatura</SelectItem>
              <SelectItem value="range">Período Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="p-3">
          {renderModeContent()}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
