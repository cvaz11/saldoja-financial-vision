const MRRCard = () => (
  <div className="bg-white rounded-xl shadow-lg border border-green-200 p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
    {/* Background gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-50" />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-green-100 rounded-lg group-hover:scale-110 transition-transform">
          <span className="text-2xl">💰</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
            ↗ +12.5%
          </span>
        </div>
      </div>
      
      <h3 className="text-sm font-medium text-gray-600 mb-2">MRR (Monthly Recurring Revenue)</h3>
      <p className="text-3xl font-bold text-gray-900 mb-4">R$ 12.450</p>
      
      {/* Mini gráfico */}
      <div className="h-16 flex items-end gap-1">
        {[40, 65, 45, 80, 60, 90, 100].map((height, index) => (
          <div 
            key={index}
            className="bg-green-400 rounded-t flex-1 transition-all hover:bg-green-500"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      
      <p className="text-xs text-gray-500 mt-2">Últimos 7 meses</p>
    </div>
  </div>
);

export default MRRCard;