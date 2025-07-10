import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLatestTransactionMonth } from "@/hooks/useLatestTransactionMonth";
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
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);

  // Buscar meses disponíveis com extratos processados
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

      // Agrupar por mês/ano únicos
      const monthMap = new Map<string, AvailableMonth>();
      data.forEach(statement => {
        const key = `${statement.year}-${statement.month}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            month: statement.month,
            year: statement.year
          });
        }
      });

      const months = Array.from(monthMap.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      setAvailableMonths(months);
    };

    fetchAvailableMonths();
  }, [user]);

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

  // Verificar se o mês atual tem extrato (para aba Todos)
  const hasStatement = availableMonths.some(m => m.month === month && m.year === year);

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
        {!allowFutureMonths && !hasStatement && (
          <span className="text-xs text-muted-foreground">(sem extrato)</span>
        )}
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