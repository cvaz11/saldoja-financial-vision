
import { useRealDashboardData } from '@/hooks/useRealDashboardData';

interface CategoryChartProps {
  selectedMonth?: number;
  selectedYear?: number;
}

const CategoryChart = ({ selectedMonth, selectedYear }: CategoryChartProps) => {
  const { categoryData, hasCategories } = useRealDashboardData(selectedMonth, selectedYear);

  const maxValue = Math.max(...categoryData.map(cat => cat.amount || 0), 1);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Gastos por categorias</h3>
      
      {hasCategories ? (
        <div className="space-y-4">
          {categoryData.map((category, index) => (
            <div key={category.category} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-700 truncate">
                {category.category}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                <div 
                  className="h-8 rounded-full transition-all duration-500"
                  style={{
                    width: `${((category.amount || 0) / maxValue) * 100}%`,
                    backgroundColor: index % 2 === 0 ? '#A7BFAC' : '#809784'
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-3">
                  <span className="text-xs font-medium text-gray-700">
                    R$ {(category.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-center text-sm text-gray-500">
          📊 Categorias serão exibidas automaticamente após processar seus extratos
        </div>
      )}
    </div>
  );
};

export default CategoryChart;
