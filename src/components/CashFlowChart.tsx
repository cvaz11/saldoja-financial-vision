
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { month: 'Jan', Receita: 4000, Despesas: -2400 },
  { month: 'Fev', Receita: 3000, Despesas: -1398 },
  { month: 'Mar', Receita: 4500, Despesas: -3000 },
  { month: 'Abr', Receita: 5000, Despesas: -2780 },
  { month: 'Mai', Receita: 3500, Despesas: -1890 },
  { month: 'Jun', Receita: 4200, Despesas: -2390 },
  { month: 'Jul', Receita: 3800, Despesas: -2000 },
  { month: 'Ago', Receita: 4100, Despesas: -2200 },
  { month: 'Set', Receita: 4800, Despesas: -2500 },
  { month: 'Out', Receita: 3900, Despesas: -1800 },
  { month: 'Nov', Receita: 4300, Despesas: -2100 },
  { month: 'Dez', Receita: 4600, Despesas: -2400 },
];

const CashFlowChart = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Fluxo de Caixa</h3>
        <select className="border border-gray-300 rounded-md px-3 py-1 text-sm">
          <option>2025</option>
          <option>2024</option>
          <option>2023</option>
        </select>
      </div>
      
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Junho de 2025</p>
        <div className="flex space-x-4">
          <div>
            <span className="text-sm text-gray-500">Receita: </span>
            <span className="font-medium text-green-600">R$ 3.400</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Despesas: </span>
            <span className="font-medium text-red-600">-R$ 3.400</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Legend />
            <Bar dataKey="Receita" fill="#A7BFAC" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesas" fill="#DDD5CC" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowChart;
