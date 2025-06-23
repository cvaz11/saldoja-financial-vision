
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const data = [
  { category: 'Mercado', value: 4500, label: 'R$ 8.070' },
  { category: 'Restaur...', value: 3200, label: 'R$ 8.070' },
  { category: 'Aplicativ...', value: 4800, label: 'R$ 8.070' },
  { category: 'xxxxxxx', value: 1500, label: 'R$ 8.070' },
  { category: 'xxxxxxx', value: 4200, label: 'R$ 8.070' },
  { category: 'xxxxxxx', value: 2800, label: 'R$ 8.070' },
  { category: 'xxxxxxx', value: 4600, label: 'R$ 8.070' },
  { category: 'xxxxxxx', value: 3100, label: 'R$ 8.070' },
];

const CategoryChart = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Gastos por categorias</h3>
        <select className="border border-gray-300 rounded-md px-3 py-1 text-sm">
          <option>Junho</option>
          <option>Maio</option>
          <option>Abril</option>
        </select>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Bar dataKey="value" fill="#A7BFAC" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryChart;
