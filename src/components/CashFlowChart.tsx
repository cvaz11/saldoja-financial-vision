
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { mes: 'Jan', receitas: 8400, despesas: 6400 },
  { mes: 'Fev', receitas: 7800, despesas: 5900 },
  { mes: 'Mar', receitas: 8200, despesas: 6100 },
  { mes: 'Abr', receitas: 8800, despesas: 6300 },
  { mes: 'Mai', receitas: 8500, despesas: 6700 },
  { mes: 'Jun', receitas: 9200, despesas: 5800 },
  { mes: 'Jul', receitas: 8900, despesas: 6200 },
  { mes: 'Ago', receitas: 9100, despesas: 6500 },
  { mes: 'Set', receitas: 8700, despesas: 6000 },
  { mes: 'Out', receitas: 9300, despesas: 6400 },
  { mes: 'Nov', receitas: 8600, despesas: 5700 },
  { mes: 'Dez', receitas: 9500, despesas: 6100 },
];

const CashFlowChart = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Fluxo de Caixa</h3>
        <select className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white">
          <option>2025</option>
          <option>2024</option>
          <option>2023</option>
        </select>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="mes" 
              stroke="#666"
              tick={{ fill: '#666', fontSize: 12 }}
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
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, '']}
              labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="receitas" 
              stroke="#A7BFAC" 
              strokeWidth={3}
              name="Receita"
              dot={{ fill: '#A7BFAC', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="despesas" 
              stroke="#DDD5CC" 
              strokeWidth={3}
              name="Despesas"
              dot={{ fill: '#DDD5CC', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowChart;
