import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell,
  LineChart, Line, ComposedChart
} from 'recharts';
import { HistorySnapshot, SupplyNode, IndustryConfig } from '../types';
import { formatCurrencyCompact } from '../utils/formatting';

const CHART_STYLE = { backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' };
const AXIS_PROPS = { stroke: '#ffffff', strokeOpacity: 0.2, fontSize: 10, tickLine: false, axisLine: false };

const sample = (arr: HistorySnapshot[]) =>
  arr.filter((_, i) => i % Math.max(1, Math.floor(arr.length / 30)) === 0);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="h-full w-full flex items-center justify-center">
    <p className="text-white/20 text-sm">{text}</p>
  </div>
);

// ─── Existing Charts ────────────────────────────────────────────────────────

interface CostTrendChartProps {
  history: HistorySnapshot[];
  nodes: SupplyNode[];
  industryConfig: IndustryConfig;
}

export const CostTrendChart: React.FC<CostTrendChartProps> = ({ history, nodes, industryConfig }) => {
  const avgUnitCost = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + (n.supplierCostPerUnit || 10), 0) / nodes.length
    : 10;

  const chartData = sample(history).map(h => ({
    name: `D${h.day}`,
    cost: Math.round(h.nodes.reduce((sum, n) => sum + n.inv, 0) * avgUnitCost),
  }));

  if (chartData.length === 0) return <div className="h-44 md:h-64 w-full flex items-center justify-center"><EmptyState text="Run simulation to see cost trend" /></div>;

  return (
    <div className="h-44 md:h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={(v) => formatCurrencyCompact(v, industryConfig)} />
          <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [formatCurrencyCompact(v, industryConfig), 'Inventory Value']} />
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

  if (inventoryData.length === 0) return <div className="h-44 md:h-64 w-full flex items-center justify-center"><EmptyState text="Add nodes to see inventory levels" /></div>;

  return (
    <div className="h-44 md:h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={inventoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} />
          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={CHART_STYLE} />
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

// ─── Service & Demand Charts ─────────────────────────────────────────────────

export const FillRateTrendChart: React.FC<{ history: HistorySnapshot[] }> = ({ history }) => {
  const chartData = sample(history).map(h => ({
    name: `D${h.day}`,
    rate: h.demandTotal > 0 ? Math.round(h.demandFulfilled / h.demandTotal * 100) : 100,
  }));

  if (chartData.length === 0) return <div className="h-40 md:h-56 w-full"><EmptyState text="Run simulation to see fill rate" /></div>;

  return (
    <div className="h-40 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillRateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis domain={[0, 100]} {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
          <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [`${v}%`, 'Fill Rate']} />
          <Area type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2} fill="url(#fillRateGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const DemandAreaChart: React.FC<{ history: HistorySnapshot[] }> = ({ history }) => {
  const chartData = sample(history).map(h => ({
    name: `D${h.day}`,
    demand: h.demandTotal,
    fulfilled: h.demandFulfilled,
  }));

  if (chartData.length === 0) return <div className="h-40 md:h-56 w-full"><EmptyState text="Run simulation to see demand data" /></div>;

  return (
    <div className="h-40 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fulfilledGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} />
          <Tooltip contentStyle={CHART_STYLE} />
          <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
          <Area type="monotone" dataKey="demand" name="Total Demand" stroke="#ef4444" strokeWidth={1.5} fill="url(#demandGrad)" dot={false} />
          <Area type="monotone" dataKey="fulfilled" name="Fulfilled" stroke="#10b981" strokeWidth={1.5} fill="url(#fulfilledGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Inventory Charts ────────────────────────────────────────────────────────

export const InTransitInventoryChart: React.FC<{ history: HistorySnapshot[] }> = ({ history }) => {
  const chartData = sample(history).map(h => ({
    name: `D${h.day}`,
    units: h.unitsInFlight,
    shipments: h.shipmentsInFlight,
  }));

  if (chartData.length === 0) return <div className="h-40 md:h-56 w-full"><EmptyState text="Run simulation to see in-transit data" /></div>;

  return (
    <div className="h-40 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="inTransitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis yAxisId="left" {...AXIS_PROPS} />
          <YAxis yAxisId="right" orientation="right" {...AXIS_PROPS} />
          <Tooltip contentStyle={CHART_STYLE} />
          <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
          <Area yAxisId="left" type="monotone" dataKey="units" name="Units in Transit" stroke="#6366f1" strokeWidth={2} fill="url(#inTransitGrad)" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="shipments" name="Active Shipments" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Cost Charts ─────────────────────────────────────────────────────────────

export const CostBreakdownChart: React.FC<{ history: HistorySnapshot[]; industryConfig: IndustryConfig }> = ({ history, industryConfig }) => {
  const chartData = sample(history).map(h => ({
    name: `D${h.day}`,
    production: Math.round(h.productionCost || 0),
    transport: Math.round(h.transportCost || 0),
    warehousing: Math.round(h.warehousingCost || 0),
    holding: Math.round(h.holdingCost),
    stockout: Math.round(h.stockoutCost),
    tariff: Math.round(h.tariffCost || 0),
    wc: Math.round(h.workingCapitalCost || 0),
    expediting: Math.round(h.expeditingCost || 0),
  }));

  if (chartData.length === 0) return <div className="h-40 md:h-56 w-full"><EmptyState text="Run simulation to see cost breakdown" /></div>;

  return (
    <div className="h-40 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={v => formatCurrencyCompact(v, industryConfig)} />
          <Tooltip contentStyle={CHART_STYLE} formatter={(v: number, name: string) => [formatCurrencyCompact(v, industryConfig), name]} />
          <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
          <Bar dataKey="production" name="Production" stackId="cost" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="transport" name="Transport" stackId="cost" fill="#6366f1" radius={[0, 0, 0, 0]} />
          <Bar dataKey="warehousing" name="Warehousing" stackId="cost" fill="#a78bfa" radius={[0, 0, 0, 0]} />
          <Bar dataKey="holding" name="Holding" stackId="cost" fill="#3b82f6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="tariff" name="Tariff" stackId="cost" fill="#f97316" radius={[0, 0, 0, 0]} />
          <Bar dataKey="wc" name="Working Capital" stackId="cost" fill="#f472b6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="expediting" name="Expediting" stackId="cost" fill="#f43f5e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="stockout" name="Stockout" stackId="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CumulativeCostChart: React.FC<{ history: HistorySnapshot[]; industryConfig: IndustryConfig }> = ({ history, industryConfig }) => {
  let cumTotal = 0, cumRevenue = 0, cumCogs = 0;
  const chartData = sample(history).map(h => {
    const dayCost = h.holdingCost + h.stockoutCost + (h.tariffCost || 0) + (h.transportCost || 0) + (h.productionCost || 0) + (h.warehousingCost || 0) + (h.workingCapitalCost || 0) + (h.expeditingCost || 0);
    cumTotal += dayCost;
    cumRevenue += (h.revenue || 0);
    cumCogs += (h.cogs || 0);
    return { name: `D${h.day}`, cost: Math.round(cumTotal), revenue: Math.round(cumRevenue), profit: Math.round(cumRevenue - cumCogs - cumTotal) };
  });

  if (chartData.length === 0) return <div className="h-40 md:h-56 w-full"><EmptyState text="Run simulation to see cumulative costs" /></div>;

  return (
    <div className="h-40 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="totalCostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} tickFormatter={v => formatCurrencyCompact(v, industryConfig)} />
          <Tooltip contentStyle={CHART_STYLE} formatter={(v: number, name: string) => [formatCurrencyCompact(v, industryConfig), name]} />
          <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
          <Area type="monotone" dataKey="revenue" name="Cum. Revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
          <Area type="monotone" dataKey="cost" name="Cum. Total Cost" stroke="#f59e0b" strokeWidth={2} fill="url(#totalCostGrad)" dot={false} />
          <Area type="monotone" dataKey="profit" name="Cum. Net Profit" stroke="#22d3ee" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Risk & Resilience Charts ────────────────────────────────────────────────

export const NodeStatusDistributionChart: React.FC<{ history: HistorySnapshot[] }> = ({ history }) => {
  const chartData = sample(history).map(h => ({
    name: `D${h.day}`,
    optimal: h.nodes.filter(n => n.status === 'OPTIMAL').length,
    warning: h.nodes.filter(n => n.status === 'WARNING').length,
    critical: h.nodes.filter(n => n.status === 'CRITICAL').length,
    offline: h.nodes.filter(n => n.status === 'OFFLINE').length,
  }));

  if (chartData.length === 0) return <div className="h-40 md:h-56 w-full"><EmptyState text="Run simulation to see node status history" /></div>;

  return (
    <div className="h-40 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} />
          <Tooltip contentStyle={CHART_STYLE} />
          <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
          <Area type="monotone" dataKey="optimal" name="Optimal" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} dot={false} />
          <Area type="monotone" dataKey="warning" name="Warning" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} dot={false} />
          <Area type="monotone" dataKey="critical" name="Critical" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} dot={false} />
          <Area type="monotone" dataKey="offline" name="Offline" stackId="1" stroke="#6b7280" fill="#6b7280" fillOpacity={0.6} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const DisruptionBreakdownChart: React.FC<{ history: HistorySnapshot[] }> = ({ history }) => {
  const totals = history.reduce(
    (acc, h) => ({
      naturalDisaster: acc.naturalDisaster + h.disruptionCounts.naturalDisaster,
      cyberIncident: acc.cyberIncident + h.disruptionCounts.cyberIncident,
      supplierFailure: acc.supplierFailure + h.disruptionCounts.supplierFailure,
      laborStrike: acc.laborStrike + h.disruptionCounts.laborStrike,
      demandShock: acc.demandShock + h.disruptionCounts.demandShock,
      qualityRecall: acc.qualityRecall + (h.disruptionCounts.qualityRecall ?? 0),
      pandemicEffect: acc.pandemicEffect + (h.disruptionCounts.pandemicEffect ?? 0),
    }),
    { naturalDisaster: 0, cyberIncident: 0, supplierFailure: 0, laborStrike: 0, demandShock: 0, qualityRecall: 0, pandemicEffect: 0 }
  );

  const chartData = [
    { name: 'Natural Disaster', count: totals.naturalDisaster, color: '#ef4444' },
    { name: 'Supplier Failure', count: totals.supplierFailure, color: '#f97316' },
    { name: 'Labor Strike',     count: totals.laborStrike,     color: '#f59e0b' },
    { name: 'Cyber Incident',   count: totals.cyberIncident,   color: '#8b5cf6' },
    { name: 'Demand Shock',     count: totals.demandShock,     color: '#06b6d4' },
    { name: 'Quality Recall',   count: totals.qualityRecall,   color: '#f43f5e' },
    { name: 'Pandemic Effect',  count: totals.pandemicEffect,  color: '#c084fc' },
  ];

  const total = chartData.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return <div className="h-40 md:h-56 w-full"><EmptyState text="No disruptions recorded yet" /></div>;

  return (
    <div className="h-40 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
          <YAxis type="category" dataKey="name" stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} width={100} />
          <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [v, 'Events']} />
          <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]} barSize={16}>
            {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Throughput Charts ───────────────────────────────────────────────────────

export const FactoryUtilizationChart: React.FC<{ history: HistorySnapshot[] }> = ({ history }) => {
  // Compute per-factory average utilization
  const factoryMap: Record<string, { name: string; total: number; count: number }> = {};
  history.forEach(h => {
    h.factoryUtilization.forEach(f => {
      if (!factoryMap[f.id]) factoryMap[f.id] = { name: f.name, total: 0, count: 0 };
      factoryMap[f.id].total += f.util;
      factoryMap[f.id].count += 1;
    });
  });

  const chartData = Object.values(factoryMap).map(f => ({
    name: f.name.length > 14 ? f.name.slice(0, 14) + '…' : f.name,
    utilization: Math.round(f.total / f.count),
  }));

  if (chartData.length === 0) return <div className="h-40 md:h-56 w-full"><EmptyState text="No factory nodes in simulation" /></div>;

  return (
    <div className="h-40 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis domain={[0, 100]} {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
          <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [`${v}%`, 'Avg Utilization']} />
          <Bar dataKey="utilization" name="Avg Utilization" radius={[4, 4, 0, 0]} barSize={32}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.utilization >= 80 ? '#10b981' : entry.utilization >= 50 ? '#f59e0b' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ShipmentFlowChart: React.FC<{ history: HistorySnapshot[] }> = ({ history }) => {
  const chartData = sample(history).map(h => ({
    name: `D${h.day}`,
    dispatched: h.newShipmentsTotal,
    delayed: h.newShipmentsDelayed,
    onTime: h.newShipmentsTotal - h.newShipmentsDelayed,
  }));

  if (chartData.length === 0) return <div className="h-40 md:h-56 w-full"><EmptyState text="Run simulation to see shipment flow" /></div>;

  return (
    <div className="h-40 md:h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
          <XAxis dataKey="name" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} />
          <Tooltip contentStyle={CHART_STYLE} />
          <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
          <Bar dataKey="onTime" name="On Time" stackId="ship" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="delayed" name="Delayed" stackId="ship" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
