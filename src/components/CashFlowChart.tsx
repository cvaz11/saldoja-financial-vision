
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useRealDashboardData } from '@/hooks/useRealDashboardData';

interface CashFlowChartProps {
  selectedMonth?: number;
  selectedYear?: number;
}

const CashFlowChart = ({ selectedMonth, selectedYear }: CashFlowChartProps) => {
  const { monthlyData, hasMonthlyData } = useRealDashboardData(selectedMonth, selectedYear);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Fluxo de Caixa</h3>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DDD5CC" />
            <XAxis 
              dataKey="mes" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#333333', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#333333', fontSize: 12 }}
              tickFormatter={(value) => value === 0 ? '0' : `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #DDD5CC',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
                name
              ]}
            />
            <Bar 
              dataKey="receitas" 
              fill="#809784" 
              name="Receitas"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="despesas" 
              fill="#AEA59A" 
              name="Despesas"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {!hasMonthlyData && (
        <div className="mt-4 text-center text-sm text-gray-500">
          📊 Gráfico será atualizado automaticamente quando você processar seus extratos
        </div>
      )}
    </div>
  );
};

export default CashFlowChart;
