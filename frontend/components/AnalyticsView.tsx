import React, { useState } from 'react';
import { HistorySnapshot, SupplyNode, IndustryConfig, NodeType, NodeStatus } from '../types';
import { formatCurrencyCompact, formatCurrency } from '../utils/formatting';
import {
  CostTrendChart, InventoryChart,
  FillRateTrendChart, DemandAreaChart,
  InTransitInventoryChart,
  CostBreakdownChart, CumulativeCostChart,
  NodeStatusDistributionChart, DisruptionBreakdownChart,
  FactoryUtilizationChart, ShipmentFlowChart,
} from './Charts';

interface AnalyticsViewProps {
  history: HistorySnapshot[];
  nodes: SupplyNode[];
  industryConfig: IndustryConfig;
}

const TABS = [
  { id: 'service',    label: 'Service & Demand',  color: '#f59e0b' },
  { id: 'inventory',  label: 'Inventory Health',   color: '#3b82f6' },
  { id: 'cost',       label: 'Cost Performance',   color: '#10b981' },
  { id: 'risk',       label: 'Risk & Resilience',  color: '#ef4444' },
  { id: 'throughput', label: 'Throughput',          color: '#8b5cf6' },
  { id: 'nodes',      label: 'Node Details',        color: '#94a3b8' },
] as const;

type TabId = typeof TABS[number]['id'];

const KPICard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, sub, accent = '#ffffff', trend }) => (
  <div className="bg-white/5 rounded-2xl border border-white/5 p-5 flex flex-col gap-2">
    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">{label}</p>
    <p className="text-3xl font-bold tracking-tight" style={{ color: accent }}>{value}</p>
    {sub && <p className="text-xs text-white/30">{sub}</p>}
    {trend && (
      <span className={`text-[10px] font-bold uppercase tracking-widest ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-white/30'}`}>
        {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
      </span>
    )}
  </div>
);

const SectionHeader: React.FC<{ title: string; sub: string; color: string }> = ({ title, sub, color }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: color }} />
    <div>
      <h3 className="text-white font-bold text-lg tracking-tight">{title}</h3>
      <p className="text-white/30 text-xs">{sub}</p>
    </div>
  </div>
);

const ChartCard: React.FC<{ title: string; sub: string; children: React.ReactNode; wide?: boolean }> = ({ title, sub, children, wide }) => (
  <div className={`bg-white/5 p-6 rounded-3xl border border-white/5 ${wide ? 'lg:col-span-2' : ''}`}>
    <p className="text-white font-semibold text-sm mb-1">{title}</p>
    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-5">{sub}</p>
    {children}
  </div>
);

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ history, nodes, industryConfig }) => {
  const [activeTab, setActiveTab] = useState<TabId>('service');

  const noData = history.length === 0;

  // ── Derived Metrics ──────────────────────────────────────────────────────

  // Service & Demand
  const totalDemand    = history.reduce((s, h) => s + h.demandTotal, 0);
  const totalFulfilled = history.reduce((s, h) => s + h.demandFulfilled, 0);
  const fillRate       = totalDemand > 0 ? Math.round(totalFulfilled / totalDemand * 100) : 100;

  const totalShipments   = history.reduce((s, h) => s + h.newShipmentsTotal, 0);
  const delayedShipments = history.reduce((s, h) => s + h.newShipmentsDelayed, 0);
  const otif             = totalShipments > 0 ? Math.round((totalShipments - delayedShipments) / totalShipments * 100) : 100;

  const stockoutDays  = history.filter(h => h.stockoutCost > 0).length;
  const stockoutRate  = history.length > 0 ? Math.round(stockoutDays / history.length * 100) : 0;

  const retailNodes      = nodes.filter(n => n.type === NodeType.RETAIL && (n.demandVolume || 0) > 0);
  const avgDaysOfSupply  = retailNodes.length > 0
    ? Math.round(retailNodes.reduce((s, n) => s + n.inventoryLevel / (n.demandVolume || 20), 0) / retailNodes.length)
    : 0;

  // Inventory Health
  const avgTotalInv = history.length > 0
    ? history.reduce((s, h) => s + h.nodes.reduce((ns, n) => ns + n.inv, 0), 0) / history.length
    : 0;
  const turnover = avgTotalInv > 0 ? (totalFulfilled / avgTotalInv).toFixed(1) : '—';

  const currentUnitsInFlight = history.length > 0 ? history[history.length - 1].unitsInFlight : 0;

  // Cost
  const totalHoldingCost  = history.reduce((s, h) => s + h.holdingCost, 0);
  const totalStockoutCost = history.reduce((s, h) => s + h.stockoutCost, 0);
  const totalCost         = totalHoldingCost + totalStockoutCost;
  const avgDailyCost      = history.length > 0 ? totalCost / history.length : 0;

  // Risk & Resilience
  const allDisruptions = history.reduce(
    (acc, h) => acc + h.disruptionCounts.naturalDisaster + h.disruptionCounts.cyberIncident +
      h.disruptionCounts.supplierFailure + h.disruptionCounts.laborStrike,
    0
  );
  const disruptionDays = history.filter(h =>
    h.disruptionCounts.naturalDisaster + h.disruptionCounts.cyberIncident +
    h.disruptionCounts.supplierFailure + h.disruptionCounts.laborStrike > 0
  ).length;
  const mtbd = disruptionDays > 0 ? Math.round(history.length / disruptionDays) : history.length || 0;

  const avgUptime = history.length > 0
    ? Math.round(history.reduce((sum, h) => {
        const total = h.nodes.length;
        const up = h.nodes.filter(n => n.status === 'OPTIMAL' || n.status === 'WARNING').length;
        return sum + (total > 0 ? up / total : 1);
      }, 0) / history.length * 100)
    : 100;

  // Throughput
  const allUtils = history.flatMap(h => h.factoryUtilization.map(f => f.util));
  const avgFactoryUtil = allUtils.length > 0 ? Math.round(allUtils.reduce((s, u) => s + u, 0) / allUtils.length) : 0;

  const onTimeRate = totalShipments > 0 ? Math.round((totalShipments - delayedShipments) / totalShipments * 100) : 100;

  // Per-node metrics
  const nodeMetrics = nodes.map(node => {
    const nodeHistory = history.map(h => h.nodes.find(n => n.id === node.id)).filter(Boolean) as { id: string; inv: number; status: string }[];
    const stockoutDaysForNode = nodeHistory.filter(n => n.status === 'CRITICAL').length;
    const avgInv = nodeHistory.length > 0
      ? Math.round(nodeHistory.reduce((s, n) => s + n.inv, 0) / nodeHistory.length)
      : node.inventoryLevel;
    const fillRateForNode = node.type === NodeType.RETAIL
      ? Math.max(0, 100 - Math.round(stockoutDaysForNode / Math.max(1, nodeHistory.length) * 100))
      : null;
    const dos = node.type === NodeType.RETAIL && (node.demandVolume || 0) > 0
      ? Math.round(node.inventoryLevel / (node.demandVolume || 20))
      : null;
    return { node, stockoutDaysForNode, avgInv, fillRateForNode, dos };
  });

  const statusColor = (s: string) =>
    s === 'OPTIMAL' ? '#10b981' : s === 'WARNING' ? '#f59e0b' : s === 'CRITICAL' ? '#ef4444' : '#6b7280';

  const typeLabel: Record<string, string> = {
    SUPPLIER: 'Supplier', FACTORY: 'Factory', WAREHOUSE: 'Warehouse',
    DISTRIBUTION_CENTER: 'DC', RETAIL: 'Retail',
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const renderTab = () => {
    switch (activeTab) {

      case 'service':
        return (
          <div className="space-y-6">
            <SectionHeader title="Service & Demand Performance" sub="How well the network serves end customers" color="#f59e0b" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Fill Rate" value={`${fillRate}%`} sub="% of demand met without stockout" accent={fillRate >= 95 ? '#10b981' : fillRate >= 80 ? '#f59e0b' : '#ef4444'} />
              <KPICard label="OTIF" value={`${otif}%`} sub="On-time in-full shipments" accent={otif >= 90 ? '#10b981' : otif >= 75 ? '#f59e0b' : '#ef4444'} />
              <KPICard label="Stockout Rate" value={`${stockoutRate}%`} sub="Days with at least one stockout" accent={stockoutRate === 0 ? '#10b981' : stockoutRate < 10 ? '#f59e0b' : '#ef4444'} />
              <KPICard label="Avg Days of Supply" value={noData ? '—' : `${avgDaysOfSupply}d`} sub="Retail nodes · current inventory" accent="#f59e0b" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Fill Rate Over Time" sub="Daily % of demand fulfilled">
                <FillRateTrendChart history={history} />
              </ChartCard>
              <ChartCard title="Demand vs Fulfilled" sub="Total demand against units served">
                <DemandAreaChart history={history} />
              </ChartCard>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-6">
            <SectionHeader title="Inventory Health" sub="Stock levels, coverage, and pipeline visibility" color="#3b82f6" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Inventory Turnover" value={noData ? '—' : `${turnover}×`} sub="Units consumed / avg stock" accent="#3b82f6" />
              <KPICard label="Units in Transit" value={currentUnitsInFlight.toLocaleString()} sub="Currently in active shipments" accent="#6366f1" />
              <KPICard label="Avg Days of Supply" value={noData ? '—' : `${avgDaysOfSupply}d`} sub="Retail nodes coverage" accent={avgDaysOfSupply >= 14 ? '#10b981' : avgDaysOfSupply >= 7 ? '#f59e0b' : '#ef4444'} />
              <KPICard label="Total Nodes" value={nodes.length.toString()} sub={`${retailNodes.length} retail · ${nodes.filter(n => n.type === NodeType.FACTORY).length} factory`} accent="#94a3b8" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Inventory Value Over Time" sub={`${industryConfig.currencySymbol} · sampled from simulation history`}>
                <CostTrendChart history={history} nodes={nodes} industryConfig={industryConfig} />
              </ChartCard>
              <ChartCard title="Current Stock vs Reorder Points" sub="Node-level inventory snapshot">
                <InventoryChart nodes={nodes} industryConfig={industryConfig} />
              </ChartCard>
              <ChartCard title="In-Transit Inventory" sub="Units and shipment count in pipeline" wide>
                <InTransitInventoryChart history={history} />
              </ChartCard>
            </div>
          </div>
        );

      case 'cost':
        return (
          <div className="space-y-6">
            <SectionHeader title="Cost Performance" sub="Holding costs, penalty costs, and total spend" color="#10b981" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Total Holding Cost" value={formatCurrencyCompact(totalHoldingCost, industryConfig)} sub="Σ inventory × holding rate" accent="#3b82f6" />
              <KPICard label="Total Stockout Penalty" value={formatCurrencyCompact(totalStockoutCost, industryConfig)} sub="Σ stockout events × penalty" accent="#ef4444" />
              <KPICard label="Total Cost" value={formatCurrencyCompact(totalCost, industryConfig)} sub="Holding + stockout penalties" accent="#f59e0b" />
              <KPICard label="Avg Daily Cost" value={formatCurrencyCompact(avgDailyCost, industryConfig)} sub="Per simulation day" accent="#10b981" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Daily Cost Breakdown" sub="Holding vs stockout penalty per day">
                <CostBreakdownChart history={history} industryConfig={industryConfig} />
              </ChartCard>
              <ChartCard title="Cumulative Cost Trend" sub="Compounding costs over simulation run">
                <CumulativeCostChart history={history} industryConfig={industryConfig} />
              </ChartCard>
            </div>
          </div>
        );

      case 'risk':
        return (
          <div className="space-y-6">
            <SectionHeader title="Risk & Resilience" sub="Disruption frequency, network uptime, and recovery" color="#ef4444" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="MTBD" value={noData ? '—' : `${mtbd}d`} sub="Mean time between disruptions" accent={mtbd >= 10 ? '#10b981' : mtbd >= 5 ? '#f59e0b' : '#ef4444'} />
              <KPICard label="Total Disruptions" value={allDisruptions.toString()} sub="All event types combined" accent={allDisruptions === 0 ? '#10b981' : allDisruptions < 10 ? '#f59e0b' : '#ef4444'} />
              <KPICard label="Network Uptime" value={`${avgUptime}%`} sub="Avg % of nodes non-offline" accent={avgUptime >= 90 ? '#10b981' : avgUptime >= 70 ? '#f59e0b' : '#ef4444'} />
              <KPICard label="Disruption Days" value={disruptionDays.toString()} sub="Days with ≥1 disruption event" accent="#94a3b8" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Node Status Distribution" sub="Optimal / Warning / Critical / Offline over time">
                <NodeStatusDistributionChart history={history} />
              </ChartCard>
              <ChartCard title="Disruption Breakdown by Type" sub="Total events per disruption category">
                <DisruptionBreakdownChart history={history} />
              </ChartCard>
            </div>
          </div>
        );

      case 'throughput':
        return (
          <div className="space-y-6">
            <SectionHeader title="Flow & Throughput" sub="Production efficiency and shipment pipeline metrics" color="#8b5cf6" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Avg Factory Utilization" value={noData ? '—' : `${avgFactoryUtil}%`} sub="Across all factory nodes" accent={avgFactoryUtil >= 80 ? '#10b981' : avgFactoryUtil >= 50 ? '#f59e0b' : '#ef4444'} />
              <KPICard label="Total Shipments" value={totalShipments.toString()} sub="Dispatched over simulation run" accent="#8b5cf6" />
              <KPICard label="Delayed Shipments" value={delayedShipments.toString()} sub="Shipments with added lead time" accent={delayedShipments === 0 ? '#10b981' : '#ef4444'} />
              <KPICard label="On-Time Rate" value={`${onTimeRate}%`} sub="Shipments dispatched with 0 delay" accent={onTimeRate >= 90 ? '#10b981' : onTimeRate >= 75 ? '#f59e0b' : '#ef4444'} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Factory Utilization" sub="Avg production efficiency per factory node">
                <FactoryUtilizationChart history={history} />
              </ChartCard>
              <ChartCard title="Shipment Flow" sub="On-time vs delayed dispatches per day">
                <ShipmentFlowChart history={history} />
              </ChartCard>
            </div>
          </div>
        );

      case 'nodes':
        return (
          <div className="space-y-6">
            <SectionHeader title="Node Details" sub="Per-node performance breakdown across simulation history" color="#94a3b8" />
            {nodes.length === 0 ? (
              <div className="bg-white/5 rounded-3xl border border-white/5 p-12 text-center">
                <p className="text-white/20 text-sm">Add nodes to the network to see per-node analytics</p>
              </div>
            ) : (
              <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Node', 'Type', 'Status', 'Curr. Inv', 'Avg Inv', 'Capacity %', 'Stockout Days', 'Fill Rate', 'Days of Supply'].map(h => (
                        <th key={h} className="text-left px-5 py-4 text-[10px] text-white/30 uppercase tracking-widest font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nodeMetrics.map(({ node, stockoutDaysForNode, avgInv, fillRateForNode, dos }) => {
                      const capacityPct = Math.round(node.inventoryLevel / node.maxCapacity * 100);
                      return (
                        <tr key={node.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-5 py-4 font-semibold text-white">{node.name}</td>
                          <td className="px-5 py-4 text-white/40">{typeLabel[node.type] || node.type}</td>
                          <td className="px-5 py-4">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(node.status) }} />
                              <span className="text-white/60 capitalize">{node.status.toLowerCase()}</span>
                            </span>
                          </td>
                          <td className="px-5 py-4 text-white">{node.inventoryLevel}</td>
                          <td className="px-5 py-4 text-white/60">{avgInv}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${capacityPct}%`, backgroundColor: capacityPct > 80 ? '#ef4444' : capacityPct > 50 ? '#f59e0b' : '#10b981' }}
                                />
                              </div>
                              <span className="text-white/60 text-xs">{capacityPct}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: stockoutDaysForNode > 0 ? '#ef4444' : '#10b981' }}>
                              {stockoutDaysForNode}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-white/60">
                            {fillRateForNode !== null ? `${fillRateForNode}%` : '—'}
                          </td>
                          <td className="px-5 py-4 text-white/60">
                            {dos !== null ? `${dos}d` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
    }
  };

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Analytics</h2>
          <p className="text-white/40 text-sm mt-1">{industryConfig.name} · {history.length} days recorded</p>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-white/5 text-sm text-white/40 rounded-xl border border-white/10">
            {nodes.length} nodes · {totalShipments} shipments
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-max px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {renderTab()}
      </div>
    </div>
  );
};

export default AnalyticsView;
