
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useRealDashboardData } from '@/hooks/useRealDashboardData';

interface BankPieChartProps {
  selectedMonth?: number;
  selectedYear?: number;
}

const BankPieChart = ({ selectedMonth, selectedYear }: BankPieChartProps) => {
  const { bankData, hasBanks } = useRealDashboardData(selectedMonth, selectedYear);

  const colors = ['#A7BFAC', '#809784', '#DDD5CC', '#AEA59A'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Bancos</h3>
      
      {hasBanks ? (
        <div className="flex items-center gap-8">
          <div className="flex-shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={bankData}
                  cx={100}
                  cy={100}
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {bankData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[index % colors.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, 'Valor']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-2">
            {bankData.map((bank, index) => (
              <div key={bank.name} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: colors[index % colors.length]
                  }}
                />
                <span className="text-sm text-gray-700">{bank.name}</span>
                <span className="text-sm font-medium text-gray-900">
                  R$ {bank.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 text-center text-sm text-gray-500">
          🏦 Dados dos bancos aparecerão após processar extratos
        </div>
      )}
    </div>
  );
};

export default BankPieChart;
