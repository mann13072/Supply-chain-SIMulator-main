import React, { useState } from 'react';
import { HistorySnapshot, SupplyNode, IndustryConfig, NodeType, NodeStatus, TierMetrics, TierAlert } from '../types';
import { getTierColor, getTierLabel } from '../utils/tierClassifier';
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
  { id: 'tiers',      label: 'Tier Analysis',       color: '#6366f1' },
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
  const totalTariffCost   = history.reduce((s, h) => s + (h.tariffCost || 0), 0);
  const totalTransportCost = history.reduce((s, h) => s + (h.transportCost || 0), 0);
  const totalProductionCost = history.reduce((s, h) => s + (h.productionCost || 0), 0);
  const totalWarehousingCost = history.reduce((s, h) => s + (h.warehousingCost || 0), 0);
  const totalWCCost       = history.reduce((s, h) => s + (h.workingCapitalCost || 0), 0);
  const totalExpeditingCost = history.reduce((s, h) => s + (h.expeditingCost || 0), 0);
  const totalRevenue      = history.reduce((s, h) => s + (h.revenue || 0), 0);
  const totalCOGS         = history.reduce((s, h) => s + (h.cogs || 0), 0);
  const grossMargin       = totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue * 100) : 0;
  // NOTE: Production cost is already embedded in COGS via accumulatedUnitCost flowing through the chain.
  // Transport & tariff costs are also embedded in COGS via shipment unitCost accumulation.
  // The "operating costs" below are the non-COGS overhead costs.
  const totalOperatingCost = totalHoldingCost + totalStockoutCost + totalWarehousingCost + totalWCCost + totalExpeditingCost;
  // Total cost for reference (all cost categories, including those in COGS, for breakdown display)
  const totalCost         = totalHoldingCost + totalStockoutCost + totalTariffCost + totalTransportCost + totalProductionCost + totalWarehousingCost + totalWCCost + totalExpeditingCost;
  const avgDailyCost      = history.length > 0 ? totalCost / history.length : 0;
  const netProfit         = totalRevenue - totalCOGS - totalOperatingCost;

  // Phase 1 metrics: carbon, defects, expired, tariff
  const totalCarbonKg     = history.reduce((s, h) => s + (h.carbonEmissions || 0), 0);
  const totalExpiredUnits = history.reduce((s, h) => s + (h.expiredUnits || 0), 0);
  const totalDefectUnits  = history.reduce((s, h) => s + (h.defectUnits || 0), 0);

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
    // Bug 3 fix: for retail, CRITICAL = stockout; for others, CRITICAL = disruption event
    const criticalDaysForNode = nodeHistory.filter(n => n.status === 'CRITICAL').length;
    const stockoutDaysForNode = node.type === NodeType.RETAIL ? criticalDaysForNode : 0;
    const avgInv = nodeHistory.length > 0
      ? Math.round(nodeHistory.reduce((s, n) => s + n.inv, 0) / nodeHistory.length)
      : node.inventoryLevel;
    // Bug 4 fix: label as service level (% of days with stock), not fill rate (units)
    // Only show when simulation has actually run (nodeHistory has data)
    const serviceLevelForNode = node.type === NodeType.RETAIL && nodeHistory.length > 0
      ? Math.max(0, 100 - Math.round(criticalDaysForNode / nodeHistory.length * 100))
      : null;
    // Bug 5 fix: use avgInv as fallback so DoS isn't 0 just because simulation stopped at a stockout
    // Only show when simulation has actually run
    const dosInv = nodeHistory.length > 0 ? avgInv : node.inventoryLevel;
    const dos = node.type === NodeType.RETAIL && (node.demandVolume || 0) > 0 && nodeHistory.length > 0
      ? Math.round(dosInv / (node.demandVolume || 20))
      : null;
    return { node, criticalDaysForNode, stockoutDaysForNode, avgInv, serviceLevelForNode, dos };
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
            <SectionHeader title="Cost & Financial Performance" sub="Revenue, margins, cost breakdown, and total spend" color="#10b981" />

            {/* P&L Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Total Revenue" value={formatCurrencyCompact(totalRevenue, industryConfig)} sub="Retail sales revenue" accent="#10b981" />
              <KPICard label="COGS" value={formatCurrencyCompact(totalCOGS, industryConfig)} sub="Cost of goods sold" accent="#3b82f6" />
              <KPICard label="Gross Margin" value={`${grossMargin.toFixed(1)}%`} sub="(Revenue − COGS) / Revenue" accent={grossMargin >= 30 ? '#10b981' : grossMargin >= 15 ? '#f59e0b' : '#ef4444'} />
              <KPICard label="Net Profit" value={formatCurrencyCompact(netProfit, industryConfig)} sub="Revenue − COGS − all costs" accent={netProfit >= 0 ? '#10b981' : '#ef4444'} />
            </div>

            {/* Cost Breakdown Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Production Cost" value={formatCurrencyCompact(totalProductionCost, industryConfig)} sub="Factory output × unit cost" accent="#8b5cf6" />
              <KPICard label="Transport Cost" value={formatCurrencyCompact(totalTransportCost, industryConfig)} sub="Freight × distance × index" accent="#6366f1" />
              <KPICard label="Warehousing Cost" value={formatCurrencyCompact(totalWarehousingCost, industryConfig)} sub="WH/DC capacity × rate" accent="#a78bfa" />
              <KPICard label="Holding Cost" value={formatCurrencyCompact(totalHoldingCost, industryConfig)} sub="Inventory value × carrying %" accent="#818cf8" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Stockout Penalty" value={formatCurrencyCompact(totalStockoutCost, industryConfig)} sub="Lost sales penalty cost" accent="#ef4444" />
              <KPICard label="Tariff Cost" value={formatCurrencyCompact(totalTariffCost, industryConfig)} sub="Import duty on shipments" accent="#f97316" />
              <KPICard label="Working Capital Cost" value={formatCurrencyCompact(totalWCCost, industryConfig)} sub="Financing cost on tied-up capital" accent="#f472b6" />
              <KPICard label="Expediting Cost" value={formatCurrencyCompact(totalExpeditingCost, industryConfig)} sub="Premium for emergency orders" accent="#f43f5e" />
            </div>

            {/* Totals + Sustainability */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Total Cost" value={formatCurrencyCompact(totalCost, industryConfig)} sub="All cost categories combined" accent="#f59e0b" />
              <KPICard label="Avg Daily Cost" value={formatCurrencyCompact(avgDailyCost, industryConfig)} sub="Per simulation day" accent="#10b981" />
              <KPICard label="CO₂ Emissions" value={totalCarbonKg >= 1000 ? `${(totalCarbonKg / 1000).toFixed(1)}t` : `${Math.round(totalCarbonKg)}kg`} sub="Total transport carbon footprint" accent="#06b6d4" />
              <KPICard label="Quality Losses" value={`${totalExpiredUnits.toLocaleString()} / ${totalDefectUnits.toLocaleString()}`} sub="Expired units / defect units" accent={(totalExpiredUnits + totalDefectUnits) > 0 ? '#f59e0b' : '#10b981'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Daily Cost Breakdown" sub="All cost categories per day">
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
              <div className="bg-white/5 rounded-3xl border border-white/5 overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Node', 'Type', 'Status', 'Curr. Inv', 'Avg Inv', 'Avg Capacity %', 'Stockout Days', 'Service Level', 'Avg Days of Supply'].map(h => (
                        <th key={h} className="text-left px-5 py-4 text-[10px] text-white/30 uppercase tracking-widest font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nodeMetrics.map(({ node, criticalDaysForNode, stockoutDaysForNode, avgInv, serviceLevelForNode, dos }) => {
                      // Bug 6 fix: use avgInv for the capacity bar so it matches the Avg Inv column
                      const capacityPct = Math.round(avgInv / node.maxCapacity * 100);
                      // Bug 1 fix: color direction depends on node type
                      // Retail/Supplier: low stock = danger (red), high = good (green)
                      // Factory/Warehouse/DC: high fill = overflow risk (red), low = room to receive (green)
                      const isStockNode = node.type === NodeType.RETAIL || node.type === NodeType.SUPPLIER;
                      const barColor = isStockNode
                        ? (capacityPct < 20 ? '#ef4444' : capacityPct < 50 ? '#f59e0b' : '#10b981')
                        : (capacityPct > 90 ? '#ef4444' : capacityPct > 70 ? '#f59e0b' : '#10b981');
                      // Bug 2 fix: derive display status from current inventory, not frozen simulation state
                      const displayStatus = node.status === NodeStatus.OFFLINE
                        ? NodeStatus.OFFLINE
                        : node.inventoryLevel === 0
                          ? NodeStatus.CRITICAL
                          : node.inventoryLevel < (node.reorderPoint || 20)
                            ? NodeStatus.WARNING
                            : NodeStatus.OPTIMAL;
                      return (
                        <tr key={node.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-5 py-4 font-semibold text-white">{node.name}</td>
                          <td className="px-5 py-4 text-white/40">{typeLabel[node.type] || node.type}</td>
                          <td className="px-5 py-4">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(displayStatus) }} />
                              <span className="text-white/60 capitalize">{displayStatus.toLowerCase()}</span>
                            </span>
                          </td>
                          <td className="px-5 py-4 text-white">{node.inventoryLevel}</td>
                          <td className="px-5 py-4 text-white/60">{avgInv}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(capacityPct, 100)}%`, backgroundColor: barColor }} />
                              </div>
                              <span className="text-white/60 text-xs">{capacityPct}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: stockoutDaysForNode > 0 ? '#ef4444' : criticalDaysForNode > 0 ? '#f59e0b' : '#10b981' }}>
                              {node.type === NodeType.RETAIL ? stockoutDaysForNode : `${criticalDaysForNode}d`}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-white/60">
                            {serviceLevelForNode !== null ? `${serviceLevelForNode}%` : '—'}
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

      case 'tiers': {
        // Aggregate tierMetrics across all history snapshots (average)
        const tierAccum: Record<number, { nodeCount: number; totalInventory: number[]; totalCost: number[]; avgLeadTime: number[]; disruptionCount: number; fillRate: number[]; riskScore: number[] }> = {};
        let totalAlerts: TierAlert[] = [];

        for (const snap of history) {
          if (snap.tierMetrics) {
            for (const [tierStr, mRaw] of Object.entries(snap.tierMetrics)) {
              const m = mRaw as TierMetrics;
              const t = Number(tierStr);
              if (!tierAccum[t]) tierAccum[t] = { nodeCount: m.nodeCount, totalInventory: [], totalCost: [], avgLeadTime: [], disruptionCount: 0, fillRate: [], riskScore: [] };
              tierAccum[t].totalInventory.push(m.totalInventory);
              tierAccum[t].totalCost.push(m.totalCost);
              tierAccum[t].avgLeadTime.push(m.avgLeadTime);
              tierAccum[t].disruptionCount += m.disruptionCount;
              tierAccum[t].fillRate.push(m.fillRate);
              tierAccum[t].riskScore.push(m.riskScore);
            }
          }
          if (snap.tierAlerts) totalAlerts = snap.tierAlerts; // use latest
        }

        const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

        // Sort tiers: upstream first (highest positive), then focal (0), then downstream (negative)
        const sortedTiers = Object.keys(tierAccum).map(Number).sort((a, b) => b - a);

        // Per-node tier info from current nodes
        const nodesByTier: Record<number, SupplyNode[]> = {};
        for (const n of nodes) {
          if (n.supplyChainTier !== undefined) {
            if (!nodesByTier[n.supplyChainTier]) nodesByTier[n.supplyChainTier] = [];
            nodesByTier[n.supplyChainTier].push(n);
          }
        }

        const hasTierData = sortedTiers.length > 0;
        const focalNode = nodes.find(n => n.isFocalCompany);

        return (
          <div className="space-y-6">
            {!hasTierData ? (
              <div className="text-center py-16 text-white/30">
                <p className="text-sm">No supply chain tier data yet.</p>
                <p className="text-xs mt-2">Mark a node as the Focal Company (OEM) in the Network Builder, then connect nodes via routes to auto-classify tiers.</p>
              </div>
            ) : (
              <>
                {/* Focal company header */}
                {focalNode && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-sm font-semibold text-white">{focalNode.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Focal Company / OEM · Tier 0</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[10px] text-white/40">Inventory</p>
                      <p className="text-sm font-bold text-white">{focalNode.inventoryLevel.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* Tier metrics table */}
                <div className="overflow-x-auto rounded-2xl border border-white/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-[10px] text-white/40 uppercase tracking-widest">Tier</th>
                        <th className="px-5 py-3 text-left text-[10px] text-white/40 uppercase tracking-widest">Nodes</th>
                        <th className="px-5 py-3 text-left text-[10px] text-white/40 uppercase tracking-widest">Avg Inventory</th>
                        <th className="px-5 py-3 text-left text-[10px] text-white/40 uppercase tracking-widest">Avg Lead Time</th>
                        <th className="px-5 py-3 text-left text-[10px] text-white/40 uppercase tracking-widest">Fill Rate</th>
                        <th className="px-5 py-3 text-left text-[10px] text-white/40 uppercase tracking-widest">Risk Score</th>
                        <th className="px-5 py-3 text-left text-[10px] text-white/40 uppercase tracking-widest">Disruptions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTiers.map(tier => {
                        const m = tierAccum[tier];
                        const color = getTierColor(tier);
                        const label = tier === 0 ? 'OEM (Focal)' : getTierLabel(tier);
                        const riskAvg = avg(m.riskScore);
                        const riskColor = riskAvg > 60 ? '#ef4444' : riskAvg > 30 ? '#f59e0b' : '#10b981';
                        return (
                          <tr key={tier} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                <span className="font-semibold" style={{ color }}>{label}</span>
                              </span>
                            </td>
                            <td className="px-5 py-4 text-white/60">{m.nodeCount}</td>
                            <td className="px-5 py-4 text-white">{avg(m.totalInventory).toLocaleString()}</td>
                            <td className="px-5 py-4 text-white/60">{avg(m.avgLeadTime)} days</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${avg(m.fillRate)}%` }} />
                                </div>
                                <span className="text-white/60 text-xs">{avg(m.fillRate)}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-bold" style={{ color: riskColor }}>{riskAvg}%</span>
                            </td>
                            <td className="px-5 py-4 text-white/60">{m.disruptionCount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Nodes by tier */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Nodes by Tier</h3>
                  {sortedTiers.map(tier => {
                    const tierNodes = nodesByTier[tier] || [];
                    if (tierNodes.length === 0) return null;
                    const color = getTierColor(tier);
                    const label = tier === 0 ? 'OEM / Focal' : getTierLabel(tier);
                    return (
                      <div key={tier} className="p-3 rounded-xl border" style={{ borderColor: color + '33', backgroundColor: color + '08' }}>
                        <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color }}>{label}</p>
                        <div className="flex flex-wrap gap-2">
                          {tierNodes.map(n => (
                            <span
                              key={n.id}
                              className="text-xs px-2.5 py-1 rounded-lg border"
                              style={{ borderColor: color + '44', color: 'rgba(255,255,255,0.7)', backgroundColor: color + '15' }}
                            >
                              {n.name}
                              <span className="ml-1.5 text-[9px] opacity-50">{n.type}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active tier alerts */}
                {totalAlerts.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Active Disruption Alerts</h3>
                    {totalAlerts.map((alert, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="w-2 h-2 rounded-full bg-red-400 mt-1 shrink-0 animate-pulse" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">{alert.nodeName}</p>
                          <p className="text-[10px] text-white/50">
                            {getTierLabel(alert.tier)} · {alert.type} &mdash;
                            {alert.estimatedImpactDays > 0
                              ? ` estimated OEM impact in ~${alert.estimatedImpactDays} days`
                              : ' impact path unknown'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }
    }
  };

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Analytics</h2>
          <p className="text-white/40 text-sm mt-1">{industryConfig.name} · {history.length} days recorded</p>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-white/5 text-sm text-white/40 rounded-xl border border-white/10 whitespace-nowrap">
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
