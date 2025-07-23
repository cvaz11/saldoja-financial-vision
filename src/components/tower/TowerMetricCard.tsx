interface TowerMetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: string;
}

const TowerMetricCard = ({ title, value, icon, color, trend }: TowerMetricCardProps) => {
  const colorClasses = {
    blue: {
      border: 'border-blue-200',
      gradient: 'from-blue-50',
      bg: 'bg-blue-100',
      text: 'text-blue-600'
    },
    purple: {
      border: 'border-purple-200',
      gradient: 'from-purple-50',
      bg: 'bg-purple-100',
      text: 'text-purple-600'
    },
    orange: {
      border: 'border-orange-200',
      gradient: 'from-orange-50',
      bg: 'bg-orange-100',
      text: 'text-orange-600'
    },
    green: {
      border: 'border-green-200',
      gradient: 'from-green-50',
      bg: 'bg-green-100',
      text: 'text-green-600'
    }
  };

  const classes = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className={`bg-white rounded-xl shadow-lg border ${classes.border} p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300`}>
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${classes.gradient} to-transparent opacity-50`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 ${classes.bg} rounded-lg group-hover:scale-110 transition-transform`}>
            <span className="text-2xl">{icon}</span>
          </div>
          {trend && (
            <div className={`text-xs ${classes.text} ${classes.bg} px-2 py-1 rounded-full`}>
              {trend}
            </div>
          )}
        </div>
        
        <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export default TowerMetricCard;