import React from 'react';
import { KPI } from '../types';

interface KPICardProps {
  kpi: KPI;
}

const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
  const isPositive = kpi.status === 'positive';
  const isNegative = kpi.status === 'negative';
  
  // For cost/emissions, "positive" status usually means the metric went DOWN (good), but trend display should handle sign.
  // We'll rely on the `status` prop to color it.

  return (
    <div className="bg-slate-800 rounded-lg p-5 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">
        {kpi.label}
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-100">
          {kpi.value} <span className="text-sm font-normal text-slate-400">{kpi.unit}</span>
        </div>
        <div className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400'}`}>
          {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
        </div>
      </div>
    </div>
  );
};

export default KPICard;