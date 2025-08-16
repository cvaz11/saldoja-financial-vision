import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLatestTransactionMonth } from "@/hooks/useLatestTransactionMonth";
import { useStatementNavigationRange } from "@/hooks/useStatementNavigationRange";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthNavigatorProps {
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
  allowFutureMonths?: boolean; // Para aba Parcelas permitir meses futuros
  className?: string;
}

interface AvailableMonth {
  month: number;
  year: number;
}

const MonthNavigator = ({ 
  month, 
  year, 
  onMonthChange, 
  allowFutureMonths = false,
  className 
}: MonthNavigatorProps) => {
  const { user } = useAuth();
  const { data: latestTransaction } = useLatestTransactionMonth();
  const { data: navigationRange } = useStatementNavigationRange();
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);

  // Gerar todos os meses no intervalo de navegação
  useEffect(() => {
    if (!navigationRange) {
      setAvailableMonths([]);
      return;
    }

    const months: AvailableMonth[] = [];
    let currentDate = new Date(navigationRange.firstYear, navigationRange.firstMonth - 1, 1);
    const endDate = new Date(navigationRange.lastYear, navigationRange.lastMonth - 1, 1);

    while (currentDate <= endDate) {
      months.push({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    setAvailableMonths(months);

    if (import.meta.env.DEV) {
      console.log('[MONTH_NAVIGATOR] Meses disponíveis para navegação:', months);
    }
  }, [navigationRange]);

  const canNavigatePrevious = () => {
    if (allowFutureMonths) return true; // Parcelas podem navegar livremente
    
    const currentIndex = availableMonths.findIndex(
      m => m.month === month && m.year === year
    );
    return currentIndex > 0;
  };

  const canNavigateNext = () => {
    if (allowFutureMonths) return true; // Parcelas podem navegar livremente
    
    const currentIndex = availableMonths.findIndex(
      m => m.month === month && m.year === year
    );
    return currentIndex < availableMonths.length - 1;
  };

  const handlePrevious = () => {
    if (allowFutureMonths) {
      // Navegação livre para parcelas
      let newMonth = month - 1;
      let newYear = year;
      
      if (newMonth < 1) {
        newMonth = 12;
        newYear = year - 1;
      }
      
      onMonthChange(newMonth, newYear);
    } else {
      // Navegação limitada aos meses com extratos
      const currentIndex = availableMonths.findIndex(
        m => m.month === month && m.year === year
      );
      
      if (currentIndex > 0) {
        const prevMonth = availableMonths[currentIndex - 1];
        onMonthChange(prevMonth.month, prevMonth.year);
      }
    }
  };

  const handleNext = () => {
    if (allowFutureMonths) {
      // Navegação livre para parcelas
      let newMonth = month + 1;
      let newYear = year;
      
      if (newMonth > 12) {
        newMonth = 1;
        newYear = year + 1;
      }
      
      onMonthChange(newMonth, newYear);
    } else {
      // Navegação limitada aos meses com extratos
      const currentIndex = availableMonths.findIndex(
        m => m.month === month && m.year === year
      );
      
      if (currentIndex < availableMonths.length - 1) {
        const nextMonth = availableMonths[currentIndex + 1];
        onMonthChange(nextMonth.month, nextMonth.year);
      }
    }
  };

  const formatCurrentMonth = () => {
    const date = new Date(year, month - 1);
    return format(date, "MMMM yyyy", { locale: ptBR });
  };

  // Verificar se estamos dentro do range de navegação
  const isInRange = availableMonths.some(m => m.month === month && m.year === year);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrevious}
        disabled={!canNavigatePrevious()}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-2 min-w-[140px] justify-center">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">
          {formatCurrentMonth()}
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNext}
        disabled={!canNavigateNext()}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MonthNavigator;