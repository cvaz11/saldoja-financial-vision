
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'BancoInter', value: 35, color: '#A7BFAC' },
  { name: 'Nubank', value: 25, color: '#DDD5CC' },
  { name: 'Digio', value: 20, color: '#B8A99A' },
  { name: 'C6 Bank', value: 12, color: '#C9D6CA' },
  { name: 'Santander', value: 8, color: '#E8E6E1' },
];

const BankPieChart = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Bancos</h3>
        <button className="text-gray-400 hover:text-gray-600">
          ↗
        </button>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm text-gray-600">{item.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BankPieChart;
