
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  previousValue: string;
  trend: "up" | "down";
  percentage: string;
  icon: React.ReactNode;
  color: "green" | "blue" | "red" | "orange";
  hasData?: boolean;
  hasPreviousData?: boolean;
}

const MetricCard = ({ 
  title, 
  value, 
  previousValue, 
  trend, 
  percentage, 
  icon, 
  color, 
  hasData = true, 
  hasPreviousData = true 
}: MetricCardProps) => {
  const colorClasses = {
    green: "bg-sage-50 border-sage-200",
    blue: "bg-blue-50 border-blue-200", 
    red: "bg-red-50 border-red-200",
    orange: "bg-orange-50 border-orange-200"
  };

  const trendColor = trend === "up" ? "text-green-600" : "text-red-600";

  return (
    <div className={cn("rounded-lg border p-4", colorClasses[color])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-3">{icon}</div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {hasData ? value : "R$ 0,00"}
            </p>
          </div>
        </div>
        <div className="text-right">
          {hasPreviousData && hasData ? (
            <>
              <div className={cn("flex items-center text-sm", trendColor)}>
                {trend === "up" ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {percentage}
              </div>
              <p className="text-xs text-gray-500">Vs mês anterior</p>
              <p className="text-xs text-gray-500">{previousValue}</p>
            </>
          ) : (
            <div className="text-xs text-gray-400">
              {!hasData ? "Sem dados" : "Primeiro mês"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
