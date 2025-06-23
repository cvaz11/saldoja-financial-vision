
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { mes: 'Jul', receitas: 5200, despesas: 3800, resultado: 1400 },
  { mes: 'Ago', receitas: 5500, despesas: 4100, resultado: 1400 },
  { mes: 'Set', receitas: 5800, despesas: 4300, resultado: 1500 },
  { mes: 'Out', receitas: 5400, despesas: 4600, resultado: 800 },
  { mes: 'Nov', receitas: 6100, despesas: 4200, resultado: 1900 },
  { mes: 'Dez', receitas: 6300, despesas: 1070, resultado: 5230 },
];

const CashFlowChart = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Fluxo de Caixa</h3>
        <select className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white">
          <option>Últimos 6 meses</option>
          <option>Último ano</option>
          <option>Últimos 2 anos</option>
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
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
              labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="receitas" 
              stroke="#10b981" 
              strokeWidth={3}
              name="Receitas"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="despesas" 
              stroke="#ef4444" 
              strokeWidth={3}
              name="Despesas"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="resultado" 
              stroke="#A7BFAC" 
              strokeWidth={3}
              name="Resultado"
              dot={{ fill: '#A7BFAC', strokeWidth: 2, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowChart;
