import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  sub?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  trend?: { value: number; label: string };
}

const colorMap = {
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
};

export function StatCard({ title, value, sub, icon, color = 'blue', trend }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium',
              trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0', colorMap[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
