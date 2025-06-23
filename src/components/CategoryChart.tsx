
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { category: 'Mercado', value: 328.50, label: 'R$ 328,50', color: '#A7BFAC' },
  { category: 'Restaurante', value: 156.30, label: 'R$ 156,30', color: '#8ba290' },
  { category: 'Transporte', value: 89.40, label: 'R$ 89,40', color: '#6d8471' },
  { category: 'Assinaturas', value: 134.70, label: 'R$ 134,70', color: '#546659' },
  { category: 'Eletrônicos', value: 612.50, label: 'R$ 612,50', color: '#435248' },
  { category: 'Freelance', value: 800.00, label: 'R$ 800,00', color: '#c7d5c9', isPositive: true },
  { category: 'Salário', value: 5500.00, label: 'R$ 5.500,00', color: '#e3eae4', isPositive: true },
];

const CategoryChart = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Movimentações por Categoria</h3>
        <select className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white">
          <option>Dezembro</option>
          <option>Novembro</option>
          <option>Outubro</option>
        </select>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="category" 
              stroke="#666"
              tick={{ fill: '#666', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#666"
              tick={{ fill: '#666', fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string, props: any) => [
                `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                props.payload.isPositive ? 'Receita' : 'Despesa'
              ]}
              labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            />
            <Bar 
              dataKey="value" 
              fill="#A7BFAC" 
              radius={[4, 4, 0, 0]}
              stroke="#9ca3af"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda personalizada */}
      <div className="flex flex-wrap gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Receitas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-600">Despesas</span>
        </div>
      </div>
    </div>
  );
};

export default CategoryChart;
