
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { useHistoricalCashFlow } from '@/hooks/useHistoricalCashFlow';

interface CashFlowChartProps {
  selectedMonth?: number;
  selectedYear?: number;
}

const CashFlowChart = ({ selectedMonth, selectedYear }: CashFlowChartProps) => {
  const { data: chartData = [], isLoading } = useHistoricalCashFlow();
  
  // Identificar mês selecionado para destaque sutil
  const selectedMonthKey = selectedMonth && selectedYear ? `${selectedMonth}/${selectedYear}` : null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const receitas = payload?.find((p: any) => p.dataKey === 'receitas')?.payload?.receitasDisplay || 0;
      const despesas = payload?.find((p: any) => p.dataKey === 'despesas')?.payload?.despesasDisplay || 0;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Receita</span>
              <span className="text-sm font-medium">
                R$ {receitas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Despesas</span>
              <span className="text-sm font-medium">
                R$ {despesas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-medium text-gray-900">Fluxo de Caixa</h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#A7BFAC]"></div>
            <span className="text-sm text-gray-600">Receita</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#DDD5CC]"></div>
            <span className="text-sm text-gray-600">Despesas</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#666', fontSize: 12 }}
              tickFormatter={(value) => {
                if (value === 0) return '0';
                const absValue = Math.abs(value);
                const formattedValue = absValue >= 1000 ? `${(absValue/1000).toFixed(0)}k` : absValue.toString();
                return value < 0 ? `-${formattedValue}` : formattedValue;
              }}
            />
            <ReferenceLine y={0} stroke="#333" strokeWidth={1} />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={false}
              wrapperStyle={{ backgroundColor: 'transparent' }}
            />
            <Bar 
              dataKey="receitas" 
              fill="#A7BFAC" 
              radius={[4, 4, 0, 0]}
              stroke="none"
              maxBarSize={40}
            />
            <Bar 
              dataKey="despesas" 
              fill="#DDD5CC" 
              radius={[0, 0, 4, 4]}
              stroke="none"
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {chartData.length === 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          📊 Dados serão exibidos após processar extratos
        </div>
      )}
    </div>
  );
};

export default CashFlowChart;
