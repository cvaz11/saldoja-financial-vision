
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { useRealDashboardData } from '@/hooks/useRealDashboardData';

interface BankPieChartProps {
  selectedMonth?: number;
  selectedYear?: number;
}

const BankPieChart = ({ selectedMonth, selectedYear }: BankPieChartProps) => {
  const { bankData, hasBanks } = useRealDashboardData(selectedMonth, selectedYear);
  
  // Cores seguindo o padrão da imagem
  const colors = ['#A7BFAC', '#809784', '#DDD5CC', '#AEA59A', '#B8A082'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-medium text-gray-900">Bancos</h3>
        <ArrowUpRight className="w-5 h-5 text-gray-400" />
      </div>
      
      {hasBanks && bankData.length > 0 ? (
        <div className="flex items-center justify-between">
          {/* Donut Chart */}
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
                  stroke="none"
                >
                  {bankData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[index % colors.length]} 
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legenda - Layout adaptável */}
          <div className="flex-1 ml-8">
            {bankData.length <= 3 ? (
              // Layout em coluna única para poucos bancos
              <div className="space-y-3">
                {bankData.map((bank, index) => (
                  <div key={bank.name} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-sm text-gray-700 font-medium">{bank.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              // Layout em grid para muitos bancos
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                {bankData.map((bank, index) => (
                  <div key={bank.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-sm text-gray-700 truncate">{bank.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-gray-500">
          🏦 Dados serão exibidos após processar extratos
        </div>
      )}
    </div>
  );
};

export default BankPieChart;
