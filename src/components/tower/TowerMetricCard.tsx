interface TowerMetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: string;
}

const TowerMetricCard = ({ title, value, icon, color, trend }: TowerMetricCardProps) => (
  <div className={`bg-white rounded-xl shadow-lg border border-${color}-200 p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300`}>
    {/* Gradient background */}
    <div className={`absolute inset-0 bg-gradient-to-br from-${color}-50 to-transparent opacity-50`} />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-${color}-100 rounded-lg group-hover:scale-110 transition-transform`}>
          <span className="text-2xl">{icon}</span>
        </div>
        {trend && (
          <div className={`text-xs text-${color}-600 bg-${color}-100 px-2 py-1 rounded-full`}>
            {trend}
          </div>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default TowerMetricCard;