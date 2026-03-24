import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell
} from 'recharts';
import { HistorySnapshot, SupplyNode, IndustryConfig } from '../types';
import { formatCurrencyCompact } from '../utils/formatting';

interface CostTrendChartProps {
  history: HistorySnapshot[];
  nodes: SupplyNode[];
  industryConfig: IndustryConfig;
}

export const CostTrendChart: React.FC<CostTrendChartProps> = ({ history, nodes, industryConfig }) => {
  const avgUnitCost = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + (n.supplierCostPerUnit || 10), 0) / nodes.length
    : 10;

  const chartData = history
    .filter((_, i) => i % Math.max(1, Math.floor(history.length / 30)) === 0)
    .map(snapshot => ({
      name: `D${snapshot.day}`,
      cost: Math.round(snapshot.nodes.reduce((sum, n) => sum + n.inv, 0) * avgUnitCost),
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center">
        <p className="text-white/20 text-sm">Run simulation to see cost trend</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false}
            tickFormatter={(v) => formatCurrencyCompact(v, industryConfig)}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
            formatter={(v: number) => [formatCurrencyCompact(v, industryConfig), 'Inventory Value']}
          />
          <Area type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} fill="url(#colorCost)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface InventoryChartProps {
  nodes: SupplyNode[];
  industryConfig: IndustryConfig;
}

export const InventoryChart: React.FC<InventoryChartProps> = ({ nodes, industryConfig }) => {
  const inventoryData = nodes.map(n => ({
    name: n.name.length > 12 ? n.name.slice(0, 12) + '…' : n.name,
    stock: n.inventoryLevel,
    safe: n.reorderPoint || 20,
  }));

  const primaryColor = industryConfig.commodities[0]?.color || '#3b82f6';

  if (inventoryData.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center">
        <p className="text-white/20 text-sm">Add nodes to see inventory levels</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={inventoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
          <Bar dataKey="stock" name="Current Stock" radius={[4, 4, 0, 0]} barSize={20}>
            {inventoryData.map((_, i) => (
              <Cell key={i} fill={industryConfig.commodities[i % Math.max(1, industryConfig.commodities.length)]?.color || primaryColor} />
            ))}
          </Bar>
          <Bar dataKey="safe" name="Reorder Point" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
