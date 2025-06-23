
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Nubank', value: 35, amount: 374.40, color: '#8A2BE2' },
  { name: 'Inter', value: 25, amount: 267.43, color: '#FF7F00' },
  { name: 'Santander', value: 20, amount: 213.94, color: '#FF0000' },
  { name: 'C6 Bank', value: 12, amount: 128.36, color: '#000000' },
  { name: 'Outros', value: 8, amount: 85.58, color: '#A7BFAC' },
];

const BankPieChart = () => {
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Gastos por Banco</h3>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          ↗
        </button>
      </div>

      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="value"
              startAngle={90}
              endAngle={450}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number, name: string, props: any) => [
                `R$ ${props.payload.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                `${value}%`
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-3" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm font-medium text-gray-700">{item.name}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900">
                R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <div className="text-xs text-gray-500">{item.value}%</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-900">Total</span>
          <span className="font-bold text-gray-900">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BankPieChart;
