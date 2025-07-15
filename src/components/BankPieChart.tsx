
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800">{data.name}</p>
          <p className="text-sm text-gray-600">
            R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-medium text-gray-900">Bancos</h3>
        <ArrowUpRight className="w-5 h-5 text-gray-400" />
      </div>
      
      {hasBanks && bankData.length > 0 ? (
        <div className="flex flex-col items-center">
          {/* Donut Chart centralizado */}
          <div className="mb-6">
            <ResponsiveContainer width={240} height={240}>
              <PieChart>
                <Pie
                  data={bankData}
                  cx={120}
                  cy={120}
                  innerRadius={70}
                  outerRadius={110}
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
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legenda embaixo - Layout responsivo */}
          <div className="w-full">
            {bankData.length <= 2 ? (
              // Layout em linha para poucos bancos
              <div className="flex justify-center gap-8">
                {bankData.map((bank, index) => (
                  <div key={bank.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-sm text-gray-700 font-medium">{bank.name}</span>
                  </div>
                ))}
              </div>
            ) : bankData.length <= 4 ? (
              // Layout em grid 2x2 para bancos médios
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                {bankData.map((bank, index) => (
                  <div key={bank.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-sm text-gray-700 font-medium truncate">{bank.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              // Layout em grid 3 colunas para muitos bancos
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                {bankData.map((bank, index) => (
                  <div key={bank.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-xs text-gray-700 font-medium truncate">{bank.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          🏦 Dados serão exibidos após processar extratos
        </div>
      )}
    </div>
  );
};

export default BankPieChart;
