
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useRealDashboardData } from '@/hooks/useRealDashboardData';

interface BankPieChartProps {
  selectedMonth?: number;
  selectedYear?: number;
}

const BankPieChart = ({ selectedMonth, selectedYear }: BankPieChartProps) => {
  const { bankData, hasBanks } = useRealDashboardData(selectedMonth, selectedYear);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Bancos</h3>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          ↗
        </button>
      </div>

      <div className="h-40 sm:h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={bankData}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={60}
              dataKey="value"
              startAngle={90}
              endAngle={450}
            >
              {bankData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string, props: any) => [
                `R$ ${props.payload.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
                `${name}`
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {bankData.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-3" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm font-medium text-gray-700">{item.name}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900">
                R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {!hasBanks && (
        <div className="mt-4 text-center text-sm text-gray-500">
          🏦 Dados dos bancos aparecerão após processar extratos
        </div>
      )}
    </div>
  );
};

export default BankPieChart;
