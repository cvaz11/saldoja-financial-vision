
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useRealDashboardData } from '@/hooks/useRealDashboardData';

interface CategoryChartProps {
  selectedMonth?: number;
  selectedYear?: number;
}

const CategoryChart = ({ selectedMonth, selectedYear }: CategoryChartProps) => {
  const { categoryData, hasCategories } = useRealDashboardData(selectedMonth, selectedYear);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-[#A7BFAC] text-white px-3 py-2 rounded-lg shadow-lg">
          <span className="text-sm font-medium">
            R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </span>
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#A7BFAC] mx-auto mt-1"></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-medium text-gray-900">Gastos por categorias</h3>
      </div>
      
      {hasCategories ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="category" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#666', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#666', fontSize: 12 }}
                tickFormatter={(value) => value === 0 ? '0' : `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar 
                dataKey="amount" 
                fill="#A7BFAC" 
                radius={[4, 4, 0, 0]}
                stroke="none"
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-gray-500">
          📊 Dados serão exibidos após processar extratos
        </div>
      )}
    </div>
  );
};

export default CategoryChart;
