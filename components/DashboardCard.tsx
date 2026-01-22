
import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, trend, color = "bg-white" }) => {
  return (
    <div className={`${color} p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between`}>
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
    </div>
  );
};

export default DashboardCard;
