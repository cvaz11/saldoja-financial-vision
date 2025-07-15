import { Button } from "@/components/ui/button";
import { Upload, User, TrendingDown, TrendingUp, CreditCard, Calendar, DollarSign, PiggyBank } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { useRealDashboardData } from "@/hooks/useRealDashboardData";
import CashFlowChart from "@/components/CashFlowChart";
import CategoryChart from "@/components/CategoryChart";
import BankPieChart from "@/components/BankPieChart";
interface DashboardViewProps {
  onUploadClick: () => void;
  onProfileClick: () => void;
}

const DashboardView = ({ onUploadClick, onProfileClick }: DashboardViewProps) => {
  // PERÍODO FIXO - maio 2025
  const selectedMonth = 5;
  const selectedYear = 2025;

  const {
    totalExpenses,
    totalIncomes,
    monthResult,
    currentMonthInstallments,
    nextMonthInstallments,
    totalPendingInstallments,
    hasData,
    currentPeriodName
  } = useRealDashboardData(selectedMonth, selectedYear);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Visão Geral - Maio 2025</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onProfileClick}
          className="hover:bg-sage-50"
        >
          <User className="h-4 w-4 mr-0 sm:mr-2" />
          <span className="hidden sm:inline">Perfil</span>
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total de Despesas no Mês"
          value={`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          previousValue="R$ 0,00"
          trend="down"
          percentage="0%"
          icon={<TrendingDown className="h-6 w-6 text-sage-600" />}
          color="red"
          hasData={hasData}
          hasPreviousData={false}
        />
        
        <MetricCard
          title="Total de Receitas no Mês"
          value={`R$ ${totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          previousValue="R$ 0,00"
          trend="up"
          percentage="0%"
          icon={<TrendingUp className="h-6 w-6 text-sage-600" />}
          color="green"
          hasData={hasData}
          hasPreviousData={false}
        />
        
        <MetricCard
          title="Resultado do Mês"
          value={`R$ ${monthResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          previousValue="R$ 0,00"
          trend={monthResult >= 0 ? "up" : "down"}
          percentage="0%"
          icon={<DollarSign className="h-6 w-6 text-sage-600" />}
          color="blue"
          hasData={hasData}
          hasPreviousData={false}
        />
        
        <MetricCard
          title="Parcelas do Mês"
          value={`R$ ${currentMonthInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          previousValue="R$ 0,00"
          trend="up"
          percentage="0%"
          icon={<CreditCard className="h-6 w-6 text-sage-600" />}
          color="orange"
          hasData={hasData}
          hasPreviousData={false}
        />
        
        <MetricCard
          title="Parcelas do Próximo Mês"
          value={`R$ ${nextMonthInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          previousValue="R$ 0,00"
          trend="up"
          percentage="0%"
          icon={<Calendar className="h-6 w-6 text-sage-600" />}
          color="blue"
          hasData={hasData}
          hasPreviousData={false}
        />
        
        <MetricCard
          title="Total de Parcelas Pendentes"
          value={`R$ ${totalPendingInstallments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          previousValue="R$ 0,00"
          trend="up"
          percentage="0%"
          icon={<PiggyBank className="h-6 w-6 text-sage-600" />}
          color="green"
          hasData={hasData}
          hasPreviousData={false}
        />
      </div>

      {/* Layout - Mobile first, then responsive */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Fluxo de Caixa - Full width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2 order-1">
          <CashFlowChart selectedMonth={selectedMonth} selectedYear={selectedYear} />
        </div>
        
        {/* Enviar Extratos - Updated text and formats */}
        <div className="bg-gradient-to-br from-sage-100 to-sage-200 rounded-xl p-6 text-center shadow-sm flex flex-col justify-center min-h-[300px] lg:min-h-[400px] order-2">
          <Upload className="mx-auto h-12 w-12 lg:h-16 lg:w-16 text-sage-700 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2 text-lg lg:text-xl">Enviar Extratos</h3>
          <p className="text-sm text-gray-600 mb-6 lg:mb-8">Faça upload dos seus extratos em OFX, CSV ou Excel</p>
          <Button 
            onClick={onUploadClick}
            className="bg-sage-600 hover:bg-sage-700 text-white shadow-md w-full py-3"
          >
            Upload Extrato
          </Button>
        </div>
      </div>

      {/* Segunda linha - Responsive grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Gastos por categoria - Full width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2 order-3 lg:order-1">
          <CategoryChart selectedMonth={selectedMonth} selectedYear={selectedYear} />
        </div>
        
        {/* Bancos - Full width on mobile, 1 col on desktop */}
        <div className="order-4 lg:order-2">
          <BankPieChart selectedMonth={selectedMonth} selectedYear={selectedYear} />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;