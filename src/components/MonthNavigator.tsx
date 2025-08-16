import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLatestTransactionMonth } from "@/hooks/useLatestTransactionMonth";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { getCompetencyRange } from "@/lib/invoice-competency";
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
  const { profile } = useUserProfile();
  const { data: latestTransaction } = useLatestTransactionMonth();
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);

  // Buscar meses disponíveis baseados na competência
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      if (!user || !profile?.invoice_closing_day) return;

      // Buscar extratos para ter limite máximo de navegação
      const { data: statements, error: stmtError } = await supabase
        .from('statements')
        .select('month, year')
        .eq('user_id', user.id)
        .eq('status', 'ready');

      if (stmtError) {
        console.error('Error fetching statements:', stmtError);
        return;
      }

      // Buscar transações para calcular competência
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user.id);

      if (transError) {
        console.error('Error fetching transactions:', transError);
        return;
      }

      if (!statements || statements.length === 0) {
        setAvailableMonths([]);
        return;
      }

      // Calcular range de competência se temos transações
      let competencyRange = null;
      if (transactions && transactions.length > 0) {
        competencyRange = getCompetencyRange(transactions, profile.invoice_closing_day);
      }

      // Usar range dos extratos como limite de navegação
      const statementMonths = statements.map(s => ({ month: s.month, year: s.year }));
      statementMonths.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      const firstStatement = statementMonths[0];
      const lastStatement = statementMonths[statementMonths.length - 1];

      // Gerar todos os meses entre primeiro e último extrato
      const months: AvailableMonth[] = [];
      let currentMonth = firstStatement.month;
      let currentYear = firstStatement.year;

      while (
        currentYear < lastStatement.year || 
        (currentYear === lastStatement.year && currentMonth <= lastStatement.month)
      ) {
        months.push({ month: currentMonth, year: currentYear });
        
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }

      console.log('[MONTH_NAVIGATOR] Available months (statement range):', months);
      if (competencyRange) {
        console.log('[MONTH_NAVIGATOR] Competency range:', competencyRange);
      }

      setAvailableMonths(months);
    };

    fetchAvailableMonths();
  }, [user, profile?.invoice_closing_day]);

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