
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const data = [
  { category: 'Mercado', value: 4500, label: 'R$ 4.500', color: '#A7BFAC' },
  { category: 'Restaurante', value: 2800, label: 'R$ 2.800', color: '#8ba290' },
  { category: 'Aplicativos', value: 3200, label: 'R$ 3.200', color: '#6d8471' },
  { category: 'Assinaturas', value: 1900, label: 'R$ 1.900', color: '#546659' },
  { category: 'Transporte', value: 2100, label: 'R$ 2.100', color: '#435248' },
  { category: 'Educação', value: 1600, label: 'R$ 1.600', color: '#A7BFAC' },
  { category: 'Saúde', value: 2400, label: 'R$ 2.400', color: '#8ba290' },
  { category: 'Lazer', value: 1800, label: 'R$ 1.800', color: '#6d8471' },
  { category: 'Eletrônicos', value: 3500, label: 'R$ 3.500', color: '#546659' },
];

const CategoryChart = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Gastos por categorias</h3>
        <select className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white">
          <option>Junho</option>
          <option>Maio</option>
          <option>Abril</option>
        </select>
      </div>

      <div className="h-80">
        <ScrollArea className="w-full">
          <div className="w-[800px]">
            <ResponsiveContainer width="100%" height={320}>
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
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
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
    </div>
  );
};

export default CategoryChart;
