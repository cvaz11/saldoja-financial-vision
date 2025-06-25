
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Dados zerados - serão preenchidos quando as transações reais chegarem
const data = [
  { category: 'Aguardando', value: 0, label: 'R$ 0', color: '#A7BFAC' },
  { category: 'Dados', value: 0, label: 'R$ 0', color: '#8ba290' },
  { category: 'Reais', value: 0, label: 'R$ 0', color: '#6d8471' },
];

const CategoryChart = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Gastos por categorias</h3>
        <select className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white">
          <option>Aguardando dados</option>
        </select>
      </div>

      <div className="h-64 sm:h-80">
        <ScrollArea className="w-full">
          <div className="w-[600px] sm:w-[800px]">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="category" 
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 12 }}
                  tickFormatter={(value) => value === 0 ? '0' : `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
                    ''
                  ]}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#A7BFAC" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      
      <div className="mt-4 text-center text-sm text-gray-500">
        📊 Categorias serão exibidas automaticamente após processar seus extratos
      </div>
    </div>
  );
};

export default CategoryChart;
