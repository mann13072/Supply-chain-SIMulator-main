import { SupplyNode, Route, InTransitShipment, SimulationParams, IndustryConfig, HistorySnapshot, BillOfMaterials } from '../types';

/** One simulated day — App.tsx passes in its computeNextSimulationState. */
export type SimulationStep = (
  nodes: SupplyNode[],
  shipments: InTransitShipment[],
  routes: Route[],
  params: SimulationParams,
  day: number,
  industryConfig: IndustryConfig,
  bom?: BillOfMaterials | null
) => { nextNodes: SupplyNode[]; nextShipments: InTransitShipment[]; snapshot: HistorySnapshot };

export interface RunMetrics {
  fillRate: number;        // % of demand fulfilled over the run
  netProfit: number;       // revenue − COGS − operating costs (same formula as Analytics)
  totalCost: number;       // all cost categories (same formula as Analytics)
  stockoutDays: number;    // days with at least one stockout
  disruptions: number;     // all disruption events
  carbonKg: number;
  factoryUtil: number;     // average factory utilization %
}

export type MetricKey = keyof RunMetrics;

export interface Percentiles { p10: number; p50: number; p90: number; mean: number; min: number; max: number }

export interface MonteCarloResult {
  runs: number;
  days: number;
  metrics: RunMetrics[];
  summary: Record<MetricKey, Percentiles>;
  /** Share of runs with at least one stockout day (0–1). */
  stockoutProbability: number;
  /** Per-day percentiles of total network inventory (units on hand). */
  inventoryBand: { day: number; p10: number; p50: number; p90: number }[];
}

export interface MonteCarloInput {
  step: SimulationStep;
  startNodes: SupplyNode[];
  routes: Route[];
  params: SimulationParams;
  industryConfig: IndustryConfig;
  bom?: BillOfMaterials | null;
  runs: number;
  days: number;
  onProgress?: (completedRuns: number) => void;
  isCancelled?: () => boolean;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function summarize(values: number[]): Percentiles {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
  return {
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    mean,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function simulateOneRun(input: MonteCarloInput, inventoryByDay: number[][]): RunMetrics {
  // Every replication starts from an independent deep copy of the same network.
  let nodes: SupplyNode[] = structuredClone(input.startNodes);
  let shipments: InTransitShipment[] = [];

  let demand = 0, fulfilled = 0, revenue = 0, cogs = 0;
  let holding = 0, stockout = 0, warehousing = 0, wc = 0, expediting = 0;
  let tariff = 0, transport = 0, production = 0;
  let stockoutDays = 0, disruptions = 0, carbon = 0;
  let utilSum = 0, utilDays = 0;

  for (let day = 1; day <= input.days; day++) {
    const { nextNodes, nextShipments, snapshot: s } = input.step(
      nodes, shipments, input.routes, input.params, day, input.industryConfig, input.bom
    );
    nodes = nextNodes;
    shipments = nextShipments;

    demand += s.demandTotal;
    fulfilled += s.demandFulfilled;
    revenue += s.revenue || 0;
    cogs += s.cogs || 0;
    holding += s.holdingCost;
    stockout += s.stockoutCost;
    warehousing += s.warehousingCost || 0;
    wc += s.workingCapitalCost || 0;
    expediting += s.expeditingCost || 0;
    tariff += s.tariffCost || 0;
    transport += s.transportCost || 0;
    production += s.productionCost || 0;
    carbon += s.carbonEmissions || 0;
    if (s.stockoutCost > 0) stockoutDays++;
    disruptions += Object.values(s.disruptionCounts).reduce((a, b) => a + b, 0);
    if (s.factoryUtilization.length > 0) {
      utilSum += s.factoryUtilization.reduce((a, f) => a + f.util, 0) / s.factoryUtilization.length;
      utilDays++;
    }
    inventoryByDay[day - 1].push(s.nodes.reduce((a, n) => a + n.inv, 0));
  }

  const operating = holding + stockout + warehousing + wc + expediting;
  return {
    fillRate: demand > 0 ? (fulfilled / demand) * 100 : 100,
    netProfit: revenue - cogs - operating,
    totalCost: holding + stockout + tariff + transport + production + warehousing + wc + expediting,
    stockoutDays,
    disruptions,
    carbonKg: carbon,
    factoryUtil: utilDays > 0 ? utilSum / utilDays : 0,
  };
}

/** Runs independent replications, yielding to the browser between runs. Returns null if cancelled. */
export async function runMonteCarlo(input: MonteCarloInput): Promise<MonteCarloResult | null> {
  const metrics: RunMetrics[] = [];
  const inventoryByDay: number[][] = Array.from({ length: input.days }, () => []);

  for (let r = 0; r < input.runs; r++) {
    if (input.isCancelled?.()) return null;
    metrics.push(simulateOneRun(input, inventoryByDay));
    input.onProgress?.(r + 1);
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const keys = Object.keys(metrics[0]) as MetricKey[];
  const summary = Object.fromEntries(
    keys.map(k => [k, summarize(metrics.map(m => m[k]))])
  ) as Record<MetricKey, Percentiles>;

  return {
    runs: input.runs,
    days: input.days,
    metrics,
    summary,
    stockoutProbability: metrics.filter(m => m.stockoutDays > 0).length / metrics.length,
    inventoryBand: inventoryByDay.map((vals, i) => {
      const sorted = [...vals].sort((a, b) => a - b);
      return { day: i + 1, p10: percentile(sorted, 0.1), p50: percentile(sorted, 0.5), p90: percentile(sorted, 0.9) };
    }),
  };
}
