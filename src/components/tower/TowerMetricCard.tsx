interface TowerMetricCardProps {
  title: string;
  value: string;
  icon: string;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

const TowerMetricCard = ({ title, value, icon, bgColor, iconColor, borderColor }: TowerMetricCardProps) => (
  <div className={`bg-white rounded-xl shadow-sm border-2 ${borderColor} p-6 hover:shadow-md transition-shadow`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <span className={`text-2xl ${iconColor}`}>{icon}</span>
      </div>
    </div>
    <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default TowerMetricCard;