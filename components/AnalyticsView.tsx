import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HistorySnapshot, SupplyNode, IndustryConfig } from '../types';
import { CostTrendChart, InventoryChart } from './Charts';

interface AnalyticsViewProps {
  history: HistorySnapshot[];
  nodes: SupplyNode[];
  industryConfig: IndustryConfig;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ history, nodes, industryConfig }) => {
  const stockoutData = history
    .filter((_, i) => i % Math.max(1, Math.floor(history.length / 30)) === 0)
    .map(h => ({
      name: `D${h.day}`,
      count: h.nodes.filter(n => n.status === 'CRITICAL').length
    }));

  const totalStockouts = history.flatMap(h => h.nodes).filter(n => n.status === 'CRITICAL').length;
  const avgServiceLevel = history.length > 0
    ? Math.round(
        history.reduce((sum, h) => {
          const total = h.nodes.length;
          const optimal = h.nodes.filter(n => n.status === 'OPTIMAL').length;
          return sum + (total > 0 ? optimal / total : 1);
        }, 0) / history.length * 100
      )
    : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Supply Chain Telemetry</h2>
          <p className="text-white/40 text-sm mt-1">{industryConfig.name} · Real-time performance metrics derived from simulation history.</p>
        </div>
        <div className="flex gap-3">
          <span className="px-4 py-2 bg-white/5 text-sm text-white/40 rounded-xl border border-white/10">
            {history.length} days recorded
          </span>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Days Simulated', value: history.length.toString() },
          { label: 'Avg Service Level', value: `${avgServiceLevel}%` },
          { label: 'Stockout Events', value: totalStockouts.toString() },
          { label: 'Active Nodes', value: nodes.length.toString() },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/5 rounded-2xl border border-white/5 p-5">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inventory Value Over Time */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Inventory Value Over Time
          </h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-6">
            {industryConfig.currencySymbol} · sampled from simulation history
          </p>
          <CostTrendChart history={history} nodes={nodes} industryConfig={industryConfig} />
        </div>

        {/* Current Inventory vs Reorder Points */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Inventory vs Reorder Points
          </h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-6">
            Current node levels · color by commodity
          </p>
          <InventoryChart nodes={nodes} industryConfig={industryConfig} />
        </div>

        {/* Stockout Events */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 lg:col-span-2">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Critical Node Events Per Day
          </h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-6">
            Stockouts + offline nodes over simulation run
          </p>
          <div className="h-48">
            {history.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-white/20 text-sm">Run simulation to see event history</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockoutData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(v: number) => [v, 'Critical nodes']}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
