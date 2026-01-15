import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
}

function StatCard({ title, value, change, isPositive, icon }: StatCardProps) {
  return (
    <div className="card p-6 hover:shadow-card-hover transition-shadow duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className="p-2 rounded-full bg-gray-50">{icon}</div>
      </div>
      
      <div className="mt-4 flex items-center">
        <div className={cn(
          "text-xs font-medium flex items-center",
          isPositive ? "text-success" : "text-error"
        )}>
          {isPositive ? (
            <ArrowUp size={16} className="mr-1" />
          ) : (
            <ArrowDown size={16} className="mr-1" />
          )}
          {change}
        </div>
        <span className="text-xs text-gray-500 ml-2">vs last month</span>
      </div>
    </div>
  );
}

export default StatCard;