
import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DateRangeMode = 'single' | 'multiple' | 'range';

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
  const [mode, setMode] = useState<DateRangeMode>('single');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<Date[]>([new Date()]);
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  const handleModeChange = (newMode: DateRangeMode) => {
    setMode(newMode);
    
    if (newMode === 'single') {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      onDateRangeChange({ from: monthStart, to: monthEnd });
    }
  };

  const handleSingleMonthSelect = (monthOffset: number) => {
    const targetMonth = subMonths(new Date(), monthOffset);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);
    onDateRangeChange({ from: monthStart, to: monthEnd });
    setIsOpen(false);
  };

  const handleMultipleMonthsApply = () => {
    if (selectedMonths.length === 0) return;
    
    const sortedMonths = selectedMonths.sort((a, b) => a.getTime() - b.getTime());
    const from = startOfMonth(sortedMonths[0]);
    const to = endOfMonth(sortedMonths[sortedMonths.length - 1]);
    
    onDateRangeChange({ from, to });
    setIsOpen(false);
  };

  const handleCustomRangeApply = () => {
    if (customRange.from && customRange.to) {
      onDateRangeChange({ from: customRange.from, to: customRange.to });
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    if (mode === 'single') {
      return format(dateRange.from, "MMMM yyyy", { locale: ptBR });
    }
    
    const fromFormatted = format(dateRange.from, "dd/MM/yy", { locale: ptBR });
    const toFormatted = format(dateRange.to, "dd/MM/yy", { locale: ptBR });
    
    return `${fromFormatted} - ${toFormatted}`;
  };

  const renderModeContent = () => {
    switch (mode) {
      case 'single':
        return (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Selecionar mês</h4>
            <div className="space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => handleSingleMonthSelect(0)}
              >
                Este mês
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm"
                onClick={() => handleSingleMonthSelect(1)}
              >
                Mês passado
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm" 
                onClick={() => handleSingleMonthSelect(2)}
              >
                Há 2 meses
              </Button>
            </div>
          </div>
        );
        
      case 'multiple':
        return (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Selecionar múltiplos meses</h4>
            <Calendar
              mode="multiple"
              selected={selectedMonths}
              onSelect={(dates) => setSelectedMonths(dates || [])}
              className={cn("p-3 pointer-events-auto")}
              showOutsideDays={false}
            />
            <Button 
              onClick={handleMultipleMonthsApply}
              disabled={selectedMonths.length === 0}
              className="w-full"
              size="sm"
            >
              Aplicar ({selectedMonths.length} meses)
            </Button>
          </div>
        );
        
      case 'range':
        return (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Intervalo personalizado</h4>
            <Calendar
              mode="range"
              selected={{ from: customRange.from, to: customRange.to }}
              onSelect={(range) => setCustomRange(range || {})}
              className={cn("p-3 pointer-events-auto")}
              showOutsideDays={false}
            />
            <Button 
              onClick={handleCustomRangeApply}
              disabled={!customRange.from || !customRange.to}
              className="w-full"
              size="sm"
            >
              Aplicar período
            </Button>
          </div>
        );
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
              <SelectItem value="single">Mês único</SelectItem>
              <SelectItem value="multiple">Múltiplos meses</SelectItem>
              <SelectItem value="range">Intervalo livre</SelectItem>
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
