import React, { useState, useEffect, useRef, useCallback } from 'react';
import Globe from './components/Globe';
import NetworkBuilder from './components/NetworkBuilder';
import SimulationEngine from './components/SimulationEngine';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import ResilienceHub from './components/ResilienceHub';
import OptimizationView from './components/OptimizationView';
import { SupplyNode, NodeType, NodeStatus, Route, TransportMode, SimulationParams, InTransitShipment, HistorySnapshot, IndustryConfig, WorkflowState } from './types';
import { routingService } from './services/routingService';
import { PRESET_INDUSTRIES } from './utils/industries';
import { LayoutDashboard, Network, PlayCircle, BarChart3, Settings, Zap, ShieldAlert, Activity, CheckCircle2, Circle, LogOut } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const INITIAL_NODES: SupplyNode[] = [];
const INITIAL_ROUTES: Route[] = [];

function computeLeadTime(distanceKm: number, mode: string): number {
  const speeds: Record<string, number> = { Air: 850, Sea: 40, Road: 90, Rail: 120 };
  return Math.max(1, Math.ceil(distanceKm / (speeds[mode] || 90) / 24));
}

const SOLAR_PRESET_NODES: SupplyNode[] = [
  { id: 'BAOTOU_SILICON', name: 'Baotou Silicon', location: 'Baotou Silicon', type: NodeType.SUPPLIER, status: NodeStatus.OPTIMAL, inventoryLevel: 15000, maxCapacity: 20000, reorderPoint: 3000, orderQuantity: 5000, safetyStock: 2000, targetServiceLevel: 98, reviewFrequency: 1, moq: 1, holdingCost: 1, obsolescenceRate: 0.01, shelfLife: 365, supplierLeadTime: 5, supplierReliability: 98, supplierCostPerUnit: 45, yieldRate: 98, setupTime: 4, batchSize: 50, throughputCapacity: 500, automationLevel: 2, demandVolume: 100, demandVariability: 10, priceElasticity: -1.2, coordinates: { x: 644, y: 110, lat: 40.65, lng: 109.84 } },
  { id: 'SHANGHAI_CELL', name: 'Shanghai Cell Mfg', location: 'Shanghai Cell Mfg', type: NodeType.FACTORY, status: NodeStatus.OPTIMAL, inventoryLevel: 5000, maxCapacity: 10000, reorderPoint: 1000, orderQuantity: 2000, safetyStock: 500, targetServiceLevel: 96, reviewFrequency: 1, moq: 1, holdingCost: 1, obsolescenceRate: 0.01, shelfLife: 365, supplierLeadTime: 14, supplierReliability: 95, supplierCostPerUnit: 10, yieldRate: 96, setupTime: 12, batchSize: 500, productionCapacity: 1000, throughputCapacity: 500, automationLevel: 2, demandVolume: 100, demandVariability: 10, priceElasticity: -1.2, coordinates: { x: 670, y: 131, lat: 31.23, lng: 121.47 } },
  { id: 'HAIPHONG_ASSY', name: 'Haiphong Assembly', location: 'Haiphong Assembly', type: NodeType.FACTORY, status: NodeStatus.OPTIMAL, inventoryLevel: 2000, maxCapacity: 8000, reorderPoint: 500, orderQuantity: 1000, safetyStock: 200, targetServiceLevel: 99, reviewFrequency: 1, moq: 1, holdingCost: 1, obsolescenceRate: 0.01, shelfLife: 365, supplierLeadTime: 14, supplierReliability: 95, supplierCostPerUnit: 10, yieldRate: 99, setupTime: 8, batchSize: 1000, productionCapacity: 800, throughputCapacity: 500, automationLevel: 2, demandVolume: 100, demandVariability: 10, priceElasticity: -1.2, coordinates: { x: 637, y: 154, lat: 20.84, lng: 106.68 } },
  { id: 'SINGAPORE_DC', name: 'Singapore Nexus', location: 'Singapore Nexus', type: NodeType.DISTRIBUTION_CENTER, status: NodeStatus.OPTIMAL, inventoryLevel: 8000, maxCapacity: 25000, reorderPoint: 2000, orderQuantity: 4000, safetyStock: 1000, targetServiceLevel: 95, reviewFrequency: 1, moq: 1, holdingCost: 1, obsolescenceRate: 0.01, shelfLife: 365, supplierLeadTime: 14, supplierReliability: 95, supplierCostPerUnit: 10, yieldRate: 98, setupTime: 4, batchSize: 50, throughputCapacity: 5000, automationLevel: 4, demandVolume: 100, demandVariability: 10, priceElasticity: -1.2, coordinates: { x: 631, y: 197, lat: 1.35, lng: 103.82 } },
  { id: 'ROTTERDAM_WH', name: 'Rotterdam Gateway', location: 'Rotterdam Gateway', type: NodeType.WAREHOUSE, status: NodeStatus.OPTIMAL, inventoryLevel: 12000, maxCapacity: 30000, reorderPoint: 3000, orderQuantity: 5000, safetyStock: 2000, targetServiceLevel: 95, reviewFrequency: 1, moq: 1, holdingCost: 1, obsolescenceRate: 0.01, shelfLife: 365, supplierLeadTime: 14, supplierReliability: 95, supplierCostPerUnit: 10, yieldRate: 98, setupTime: 4, batchSize: 50, throughputCapacity: 3000, automationLevel: 3, demandVolume: 100, demandVariability: 10, priceElasticity: -1.2, coordinates: { x: 410, y: 85, lat: 51.92, lng: 4.48 } },
  { id: 'BERLIN_RETAIL', name: 'Berlin Solar Store', location: 'Berlin Solar Store', type: NodeType.RETAIL, status: NodeStatus.OPTIMAL, inventoryLevel: 500, maxCapacity: 1000, reorderPoint: 150, orderQuantity: 300, safetyStock: 100, targetServiceLevel: 95, reviewFrequency: 1, moq: 1, holdingCost: 1, obsolescenceRate: 0.01, shelfLife: 365, supplierLeadTime: 14, supplierReliability: 95, supplierCostPerUnit: 10, yieldRate: 98, setupTime: 4, batchSize: 50, throughputCapacity: 500, automationLevel: 2, demandVolume: 200, demandVariability: 15, priceElasticity: -1.5, coordinates: { x: 430, y: 83, lat: 52.52, lng: 13.40 } },
  { id: 'LONDON_RETAIL', name: 'London Eco Hub', location: 'London Eco Hub', type: NodeType.RETAIL, status: NodeStatus.OPTIMAL, inventoryLevel: 300, maxCapacity: 800, reorderPoint: 100, orderQuantity: 200, safetyStock: 80, targetServiceLevel: 95, reviewFrequency: 1, moq: 1, holdingCost: 1, obsolescenceRate: 0.01, shelfLife: 365, supplierLeadTime: 14, supplierReliability: 95, supplierCostPerUnit: 10, yieldRate: 98, setupTime: 4, batchSize: 50, throughputCapacity: 500, automationLevel: 2, demandVolume: 150, demandVariability: 25, priceElasticity: -1.2, coordinates: { x: 400, y: 85, lat: 51.50, lng: -0.12 } },
];

const SOLAR_PRESET_ROUTES: Route[] = [
  { id: 'r_baotou_shanghai',    fromId: 'BAOTOU_SILICON', toId: 'SHANGHAI_CELL',  mode: TransportMode.AIR, distance: 1580,  baseLeadTime: 1,  leadTimeVariability: 0.1, costPerUnitDistance: 0.008, vehicleCapacity: 100,  shipmentFrequency: 1, fuelPrice: 1.5, customsTime: 0, disruptionProb: 0.01 },
  { id: 'r_shanghai_haiphong',  fromId: 'SHANGHAI_CELL',  toId: 'HAIPHONG_ASSY',  mode: TransportMode.SEA, distance: 1720,  baseLeadTime: 2,  leadTimeVariability: 0.2, costPerUnitDistance: 0.002, vehicleCapacity: 1000, shipmentFrequency: 1, fuelPrice: 1.5, customsTime: 1, disruptionProb: 0.02 },
  { id: 'r_haiphong_singapore', fromId: 'HAIPHONG_ASSY',  toId: 'SINGAPORE_DC',   mode: TransportMode.SEA, distance: 2160,  baseLeadTime: 3,  leadTimeVariability: 0.2, costPerUnitDistance: 0.002, vehicleCapacity: 1000, shipmentFrequency: 1, fuelPrice: 1.5, customsTime: 1, disruptionProb: 0.02 },
  { id: 'r_singapore_rotterdam',fromId: 'SINGAPORE_DC',   toId: 'ROTTERDAM_WH',   mode: TransportMode.SEA, distance: 10500, baseLeadTime: 11, leadTimeVariability: 0.3, costPerUnitDistance: 0.002, vehicleCapacity: 5000, shipmentFrequency: 1, fuelPrice: 1.5, customsTime: 3, disruptionProb: 0.05 },
  { id: 'r_rotterdam_berlin',   fromId: 'ROTTERDAM_WH',   toId: 'BERLIN_RETAIL',  mode: TransportMode.AIR, distance: 648,   baseLeadTime: 1,  leadTimeVariability: 0.1, costPerUnitDistance: 0.006, vehicleCapacity: 200,  shipmentFrequency: 1, fuelPrice: 1.5, customsTime: 0, disruptionProb: 0.01 },
  { id: 'r_rotterdam_london',   fromId: 'ROTTERDAM_WH',   toId: 'LONDON_RETAIL',  mode: TransportMode.SEA, distance: 510,   baseLeadTime: 1,  leadTimeVariability: 0.1, costPerUnitDistance: 0.003, vehicleCapacity: 300,  shipmentFrequency: 1, fuelPrice: 1.5, customsTime: 0, disruptionProb: 0.01 },
];

const INITIAL_PARAMS: SimulationParams = {
  commodityPriceChanges: {},
  yieldRateDegradation: 0,
  energyCostChange: 0,
  unitProductionCost: 100,
  procurementCost: 50,
  transportationCost: 20,
  inventoryCarryingCost: 5,
  stockoutPenalty: 200,
  expeditingCost: 150,
  warehousingCost: 10,
  workingCapitalCost: 8,
  currencyExchangeRate: 1,
  inflationRate: 2,
  supplierFailureProb: 0.01,
  naturalDisasterProb: 0.001,
  portCongestionProb: 0.05,
  transportDelayProb: 0.02,
  laborStrikeProb: 0.01,
  cyberRisk: 0.005,
  qualityRecallProb: 0.002,
  demandShockProb: 0.01,
  pandemicFactor: 0,
  recoveryTime: 14,
  mtsMtoRatio: 0.8,
  postponementEnabled: false,
  inventoryPooling: false,
  multiSourcing: true,
  nearshoring: false,
  dynamicPricing: false,
  forecastAccuracy: 85,
  forecastUpdateFrequency: 30,
  bullwhipFactor: 1.2,
  collaborationLevel: 50,
  demandSurge: 0,
  tariffImposition: false,
  subsidyLevel: 0,
  interestRateChange: 0,
  weatherEvent: false,
  geopoliticalTension: false,
  freightCostIndex: 100,
  logisticDisruption: false
};

// Pure function: computes next simulation state from current state.
// Returns both next nodes and next shipments — no setState calls inside.
function computeNextSimulationState(
  prevNodes: SupplyNode[],
  prevShipments: InTransitShipment[],
  routes: Route[],
  params: SimulationParams,
  nextDay: number,
  industryConfig: IndustryConfig
): { nextNodes: SupplyNode[]; nextShipments: InTransitShipment[]; newLogs: string[]; snapshot: HistorySnapshot } {

  // ── Cost multipliers ───────────────────────────────────────────────────────
  // Commodity price increase squeezes production. Price DROP does NOT boost
  // production above rated capacity — cap costSqueeze at 1.0.
  const commodityMultiplier = Object.values(params.commodityPriceChanges)
    .reduce((acc, change) => acc * (1 + change / 100), 1.0);
  const costSqueeze = Math.min(1.0, Math.max(0.1, 1 / commodityMultiplier));

  // Energy cost is a separate drag on factory efficiency
  const energyFactor = Math.max(0.5, 1 / (1 + params.energyCostChange / 100));

  const nextNodes = prevNodes.map(n => ({ ...n }));
  const newLogs: string[] = [];
  const nextShipments: InTransitShipment[] = [];

  // Metrics
  let demandTotal = 0;
  let demandFulfilled = 0;
  let stockoutCost = 0;
  let newShipmentsTotal = 0;
  let newShipmentsDelayed = 0;
  const disruptionCounts = {
    naturalDisaster: 0, cyberIncident: 0, supplierFailure: 0,
    laborStrike: 0, demandShock: 0, qualityRecall: 0, pandemicEffect: 0,
  };
  const factoryUtilization: { id: string; name: string; util: number }[] = [];
  const strikeNodes = new Set<string>();

  // ── Step 0: Tick OFFLINE recovery timers ──────────────────────────────────
  nextNodes.forEach(node => {
    if (node.status === NodeStatus.OFFLINE && (node.offlineRecoveryDaysRemaining ?? 0) > 0) {
      node.offlineRecoveryDaysRemaining = (node.offlineRecoveryDaysRemaining ?? 1) - 1;
      if (node.offlineRecoveryDaysRemaining <= 0) {
        node.offlineRecoveryDaysRemaining = 0;
        node.status = NodeStatus.WARNING; // Back online at reduced capacity
        newLogs.push(`Day ${nextDay}: ${node.name} RECOVERED — resuming operations.`);
      }
    }
  });

  // ── Step 1: Process arriving shipments ────────────────────────────────────
  prevShipments.forEach(s => {
    if (s.remainingDays <= 1) {
      const target = nextNodes.find(n => n.id === s.toId);
      if (target) {
        target.inventoryLevel = Math.min(target.maxCapacity, target.inventoryLevel + s.quantity);
        newLogs.push(`Day ${nextDay}: Shipment arrived at ${target.name} (${s.quantity} units)`);
      }
    } else {
      nextShipments.push({ ...s, remainingDays: s.remainingDays - 1 });
    }
  });

  // ── Step 2: Apply risk events per node ────────────────────────────────────
  nextNodes.forEach(node => {
    if (node.status === NodeStatus.OFFLINE) return; // Already offline, skip further events

    // Natural disaster → OFFLINE with timed recovery
    if (Math.random() < params.naturalDisasterProb) {
      node.status = NodeStatus.OFFLINE;
      node.offlineRecoveryDaysRemaining = Math.max(1, params.recoveryTime);
      disruptionCounts.naturalDisaster++;
      newLogs.push(`Day ${nextDay}: NATURAL DISASTER hit ${node.name}! Offline for ~${params.recoveryTime} days.`);
      return;
    }

    // Quality recall — quarantine 25% of current inventory
    if (params.qualityRecallProb > 0 && Math.random() < params.qualityRecallProb && node.inventoryLevel > 0) {
      const recalledQty = Math.floor(node.inventoryLevel * 0.25);
      node.inventoryLevel = Math.max(0, node.inventoryLevel - recalledQty);
      disruptionCounts.qualityRecall++;
      newLogs.push(`Day ${nextDay}: QUALITY RECALL at ${node.name}! ${recalledQty} units quarantined.`);
    }

    // Cyber attack — DC/Warehouse throughput halved
    if ((node.type === NodeType.DISTRIBUTION_CENTER || node.type === NodeType.WAREHOUSE)
        && Math.random() < params.cyberRisk) {
      node.throughputCapacity = Math.floor((node.throughputCapacity || 500) * 0.5);
      disruptionCounts.cyberIncident++;
      newLogs.push(`Day ${nextDay}: CYBER INCIDENT at ${node.name}. Throughput halved.`);
    }

    // Supplier failure → CRITICAL with partial recovery time
    if (node.type === NodeType.SUPPLIER && Math.random() < params.supplierFailureProb) {
      node.status = NodeStatus.CRITICAL;
      node.offlineRecoveryDaysRemaining = Math.max(1, Math.floor(params.recoveryTime / 2));
      disruptionCounts.supplierFailure++;
      newLogs.push(`Day ${nextDay}: SUPPLIER FAILURE at ${node.name}!`);
    }

    // Labor strike — factory output = 0 this tick
    if (node.type === NodeType.FACTORY && Math.random() < params.laborStrikeProb) {
      strikeNodes.add(node.id);
      disruptionCounts.laborStrike++;
      newLogs.push(`Day ${nextDay}: LABOR STRIKE at ${node.name}. No production today.`);
    }

    // Pandemic factor — probabilistic production halt at factories
    if (params.pandemicFactor > 0 && node.type === NodeType.FACTORY
        && Math.random() < params.pandemicFactor * 0.1) {
      strikeNodes.add(node.id);
      disruptionCounts.pandemicEffect++;
      newLogs.push(`Day ${nextDay}: PANDEMIC DISRUPTION halted ${node.name}.`);
    }

    // Demand shock persistence — tick down active shock days
    if ((node.demandShockDaysRemaining ?? 0) > 0) {
      node.demandShockDaysRemaining = (node.demandShockDaysRemaining ?? 1) - 1;
    }

    // ── Demand consumption (RETAIL nodes) ──────────────────────────────────
    if (node.type === NodeType.RETAIL) {
      const surgeFactor = 1 + (params.demandSurge / 100);
      // Pandemic increases demand (panic buying) proportional to pandemicFactor
      const pandemicDemandBoost = params.pandemicFactor > 0 ? 1 + params.pandemicFactor * 0.5 : 1;
      const baseDemand = (node.demandVolume || 20) * surgeFactor * pandemicDemandBoost;

      // Dynamic pricing: high inventory → price down → demand up; low → price up → demand down
      let pricingFactor = 1.0;
      if (params.dynamicPricing) {
        const stockRatio = node.inventoryLevel / node.maxCapacity;
        const elasticity = node.priceElasticity ?? -1.2;
        pricingFactor = 1 + elasticity * (stockRatio - 0.5) * -0.3;
        pricingFactor = Math.max(0.7, Math.min(1.3, pricingFactor));
      }

      // New demand shock → start a multi-day shock period (3–7 days)
      const newShock = (node.demandShockDaysRemaining ?? 0) === 0
        && Math.random() < params.demandShockProb;
      if (newShock) {
        node.demandShockDaysRemaining = 3 + Math.floor(Math.random() * 5);
        disruptionCounts.demandShock++;
        newLogs.push(`Day ${nextDay}: DEMAND SHOCK at ${node.name}! Lasts ${node.demandShockDaysRemaining} days.`);
      }
      const isShocked = (node.demandShockDaysRemaining ?? 0) > 0;

      const demand = Math.max(0, Math.floor(baseDemand * pricingFactor * (isShocked ? 2 : 1)));
      demandTotal += demand;
      demandFulfilled += Math.min(demand, node.inventoryLevel);
      node.inventoryLevel = Math.max(0, node.inventoryLevel - demand);
      node.status = node.inventoryLevel < (node.reorderPoint || 20) ? NodeStatus.WARNING : NodeStatus.OPTIMAL;
      if (node.inventoryLevel === 0 && demand > 0) {
        newLogs.push(`Day ${nextDay}: STOCKOUT at ${node.name}!`);
        node.status = NodeStatus.CRITICAL;
        stockoutCost += params.stockoutPenalty;
      }
    }

    // ── Production (FACTORY nodes) ─────────────────────────────────────────
    if (node.type === NodeType.FACTORY && !strikeNodes.has(node.id)) {
      const degradation = Math.max(0, params.yieldRateDegradation);
      const yieldRate = Math.max(0, ((node.yieldRate || 100) - degradation)) / 100;
      // Both commodity cost and energy cost reduce output; neither can boost above rated capacity
      const effectiveSqueeze = costSqueeze * energyFactor;
      const netProduction = Math.floor((node.productionCapacity || 100) * yieldRate * effectiveSqueeze);
      node.inventoryLevel = Math.min(node.maxCapacity, node.inventoryLevel + netProduction);
      factoryUtilization.push({
        id: node.id, name: node.name,
        util: Math.round(netProduction / (node.productionCapacity || 100) * 100),
      });
    }
  });

  // ── Step 3: Holding cost ───────────────────────────────────────────────────
  const holdingCost = nextNodes.reduce((sum, n) => sum + n.inventoryLevel * (n.holdingCost || 1), 0);

  // ── Step 4: Inventory pooling — redistribute surplus to deficit sibling nodes
  if (params.inventoryPooling) {
    const surplus = nextNodes.filter(n =>
      n.status !== NodeStatus.OFFLINE && n.inventoryLevel > n.maxCapacity * 0.8 && n.type !== NodeType.RETAIL
    );
    const deficit = nextNodes.filter(n =>
      n.status !== NodeStatus.OFFLINE && n.inventoryLevel < (n.reorderPoint || 50) && n.type !== NodeType.RETAIL
    );
    surplus.forEach(src => {
      deficit.forEach(dst => {
        if (src.type === dst.type) {
          const transfer = Math.min(
            Math.floor(src.inventoryLevel * 0.1),
            dst.maxCapacity - dst.inventoryLevel
          );
          if (transfer > 0) {
            src.inventoryLevel -= transfer;
            dst.inventoryLevel += transfer;
            newLogs.push(`Day ${nextDay}: POOL ${src.name}→${dst.name} (${transfer} units)`);
          }
        }
      });
    });
  }

  // ── Step 5: Reorder logic ─────────────────────────────────────────────────
  nextNodes.forEach(node => {
    if (node.status === NodeStatus.OFFLINE) return;

    // Auto-heal: CRITICAL/WARNING → OPTIMAL if inventory recovered
    if (node.status === NodeStatus.CRITICAL && node.inventoryLevel > 0 && node.type !== NodeType.RETAIL) {
      node.status = node.inventoryLevel < (node.reorderPoint || 50) ? NodeStatus.WARNING : NodeStatus.OPTIMAL;
    }
    if (node.status === NodeStatus.WARNING && node.inventoryLevel >= (node.reorderPoint || 50)) {
      node.status = NodeStatus.OPTIMAL;
    }

    // Safety stock raises the effective reorder trigger
    const safetyBuffer = (node.safetyStock || 0) * 0.5;
    const effectiveReorderPoint = (node.reorderPoint || 50) + safetyBuffer;

    // Forecast-based proactive ordering for retail: trigger before hitting reorder point
    let shouldReorder = node.inventoryLevel < effectiveReorderPoint;
    if (!shouldReorder && params.forecastAccuracy > 70 && node.type === NodeType.RETAIL) {
      const dailyDemand = (node.demandVolume || 20) * (1 + params.demandSurge / 100);
      if (dailyDemand > 0) {
        const daysOfSupply = node.inventoryLevel / dailyDemand;
        const minLeadTime = routes.filter(r => r.toId === node.id)
          .reduce((min, r) => Math.min(min, r.baseLeadTime), 999);
        // Accuracy > 70: proactive horizon = lead time × (2 − accuracy/100)
        const forecastHorizon = minLeadTime * (2 - params.forecastAccuracy / 100);
        if (daysOfSupply < forecastHorizon) shouldReorder = true;
      }
    }

    if (!shouldReorder) return;

    const candidateRoutes = routes.filter(r => r.toId === node.id);

    // Multi-sourcing: score all viable routes by stock availability + speed
    let selectedRoute: Route | null = null;
    if (params.multiSourcing && candidateRoutes.length > 1) {
      const scored = candidateRoutes
        .map(r => {
          const src = nextNodes.find(n => n.id === r.fromId);
          if (!src || src.status === NodeStatus.OFFLINE || src.inventoryLevel <= 0) return null;
          const stockScore = src.inventoryLevel / src.maxCapacity;   // 0–1
          const speedScore = 1 / Math.max(1, r.baseLeadTime);        // faster = higher
          return { route: r, score: stockScore * 0.6 + speedScore * 0.4 };
        })
        .filter((x): x is { route: Route; score: number } => x !== null);
      scored.sort((a, b) => b.score - a.score);
      selectedRoute = scored[0]?.route ?? null;
    } else {
      // Single-source: pick shortest available lead time
      selectedRoute = candidateRoutes.reduce<Route | null>((best, r) => {
        const src = nextNodes.find(n => n.id === r.fromId);
        if (!src || src.status === NodeStatus.OFFLINE || src.inventoryLevel <= 0) return best;
        if (!best) return r;
        const bestSrc = nextNodes.find(n => n.id === best.fromId);
        if (!bestSrc || bestSrc.status === NodeStatus.OFFLINE) return r;
        return r.baseLeadTime < best.baseLeadTime ? r : best;
      }, null);
    }

    if (!selectedRoute) return;
    const source = nextNodes.find(n => n.id === selectedRoute!.fromId);
    if (!source || source.status === NodeStatus.OFFLINE || source.inventoryLevel <= 0) return;

    // ── Compute total shipment delay ─────────────────────────────────────────
    let delayDays = 0;
    if (params.geopoliticalTension) delayDays += 5;
    if (params.logisticDisruption) delayDays += 2;
    if (params.weatherEvent) delayDays += 3;
    // Per-route customs time (only charged when tariff is active)
    if (params.tariffImposition) delayDays += (selectedRoute.customsTime || 2);
    if (Math.random() < params.portCongestionProb) delayDays += 3;
    if (Math.random() < params.transportDelayProb) delayDays += 1;

    // Lead-time variability: stochastic jitter based on route's variability factor
    const ltv = selectedRoute.leadTimeVariability || 0;
    if (ltv > 0) {
      const jitter = Math.round(selectedRoute.baseLeadTime * ltv * (Math.random() * 2 - 1));
      delayDays += jitter;
    }

    // Bullwhip amplification for all non-retail upstream nodes
    const orderQty = Math.ceil(
      (node.orderQuantity || 100) * (node.type !== NodeType.RETAIL ? params.bullwhipFactor : 1)
    );
    const actualQty = Math.min(orderQty, source.inventoryLevel);

    source.inventoryLevel -= actualQty;
    const totalLeadTime = Math.max(1, selectedRoute.baseLeadTime + delayDays);
    nextShipments.push({
      id: Math.random().toString(36).substr(2, 9),
      toId: node.id,
      quantity: actualQty,
      remainingDays: totalLeadTime,
    });
    newShipmentsTotal++;
    if (delayDays > 0) newShipmentsDelayed++;
    newLogs.push(`Day ${nextDay}: ${source.name} → ${node.name} (${actualQty} units, ${totalLeadTime}d)`);
  });

  const snapshot: HistorySnapshot = {
    day: nextDay,
    nodes: nextNodes.map(n => ({ id: n.id, inv: n.inventoryLevel, status: n.status })),
    shipmentsInFlight: nextShipments.length,
    unitsInFlight: nextShipments.reduce((sum, s) => sum + s.quantity, 0),
    demandTotal,
    demandFulfilled,
    newShipmentsTotal,
    newShipmentsDelayed,
    holdingCost,
    stockoutCost,
    disruptionCounts,
    factoryUtilization,
  };

  return { nextNodes, nextShipments, newLogs, snapshot };
}

// Auth gate — rendered by App, wraps AppContent when authenticated
function App() {
  const { user, isLoading } = useAuth();
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return authPage === 'login'
      ? <LoginPage onSwitchToRegister={() => setAuthPage('register')} />
      : <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />;
  }

  return <AppContent />;
}

function AppContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [nodes, setNodes] = useState<SupplyNode[]>(INITIAL_NODES);
  const [routes, setRoutes] = useState<Route[]>(INITIAL_ROUTES);
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const [selectedNode, setSelectedNode] = useState<SupplyNode | null>(null);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [industryConfig, setIndustryConfig] = useState<IndustryConfig>(PRESET_INDUSTRIES[0]);
  const [lowStockThreshold, setLowStockThreshold] = useState(20);
  const globeRef = useRef<HTMLDivElement>(null);
  const [costVarianceThreshold, setCostVarianceThreshold] = useState(15);

  // --- SESSION-LIVE SIMULATION ENGINE ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [day, setDay] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [shipments, setShipments] = useState<InTransitShipment[]>([]);

  // Refs so the interval callback always reads the latest state without stale closures
  const nodesRef = useRef<SupplyNode[]>(nodes);
  const shipmentsRef = useRef<InTransitShipment[]>(shipments);
  const dayRef = useRef<number>(day);
  const routesRef = useRef<Route[]>(routes);
  const paramsRef = useRef<SimulationParams>(params);
  const industryConfigRef = useRef<IndustryConfig>(industryConfig);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { shipmentsRef.current = shipments; }, [shipments]);
  useEffect(() => { dayRef.current = day; }, [day]);
  useEffect(() => { routesRef.current = routes; }, [routes]);
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { industryConfigRef.current = industryConfig; }, [industryConfig]);

  // ── Persist ALL user state to DB (debounced) ──────────────────────
  const networkIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  const lowStockRef = useRef(lowStockThreshold);
  const costVarianceRef = useRef(costVarianceThreshold);
  const dayRef2 = useRef(day);
  const historyRef = useRef(history);
  const logsRef = useRef(logs);
  const shipmentsRef2 = useRef(shipments);
  const speedRef = useRef(speed);

  useEffect(() => { lowStockRef.current = lowStockThreshold; }, [lowStockThreshold]);
  useEffect(() => { costVarianceRef.current = costVarianceThreshold; }, [costVarianceThreshold]);
  useEffect(() => { dayRef2.current = day; }, [day]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { shipmentsRef2.current = shipments; }, [shipments]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const debouncedSaveToDB = useCallback(() => {
    if (!initialLoadDone.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const currentNodes = nodesRef.current;
      const currentRoutes = routesRef.current;
      // Store everything in the "params" JSON blob
      const fullState = {
        simulationParams: paramsRef.current,
        industryConfig: industryConfigRef.current,
        lowStockThreshold: lowStockRef.current,
        costVarianceThreshold: costVarianceRef.current,
        simulation: {
          day: dayRef2.current,
          speed: speedRef.current,
          history: historyRef.current,
          logs: logsRef.current.slice(0, 200),
          shipments: shipmentsRef2.current,
        },
      };
      if (networkIdRef.current) {
        await routingService.updateNetwork(networkIdRef.current, 'My Network', currentNodes, currentRoutes, fullState);
      } else {
        const result = await routingService.saveNetwork('My Network', currentNodes, currentRoutes, fullState);
        if (result) networkIdRef.current = result.id;
      }
    }, 2000);
  }, []);

  // Trigger save on any meaningful state change
  useEffect(() => { if (user) debouncedSaveToDB(); }, [nodes]);
  useEffect(() => { if (user) debouncedSaveToDB(); }, [routes]);
  useEffect(() => { if (user) debouncedSaveToDB(); }, [industryConfig]);
  useEffect(() => { if (user) debouncedSaveToDB(); }, [params]);
  useEffect(() => { if (user) debouncedSaveToDB(); }, [lowStockThreshold]);
  useEffect(() => { if (user) debouncedSaveToDB(); }, [costVarianceThreshold]);
  // Save simulation progress when simulation stops or every 30 days
  useEffect(() => { if (user && !isPlaying && day > 0) debouncedSaveToDB(); }, [isPlaying]);
  useEffect(() => { if (user && day > 0 && day % 30 === 0) debouncedSaveToDB(); }, [day]);

  // Core Simulation Loop (The Heartbeat) — no nested setState
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const nextDay = dayRef.current + 1;
      const { nextNodes, nextShipments, newLogs, snapshot } = computeNextSimulationState(
        nodesRef.current,
        shipmentsRef.current,
        routesRef.current,
        paramsRef.current,
        nextDay,
        industryConfigRef.current
      );

      setDay(nextDay);
      setNodes(nextNodes);
      setShipments(nextShipments);
      if (newLogs.length > 0) {
        setLogs(prev => [...newLogs, ...prev].slice(0, 50));
      }
      setHistory(prev => [...prev, snapshot]);
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const resetSimulation = () => {
    setIsPlaying(false);
    setDay(0);
    setLogs([]);
    setShipments([]);
    setHistory([]);
  };

  useEffect(() => {
    const loadState = async () => {
      // 1. Try user's saved network from the database first
      try {
        const networks = await routingService.listNetworks();
        if (networks.length > 0) {
          const latest = networks[0];
          const data = await routingService.loadNetwork(latest.id);
          if (data) {
            setNodes(data.nodes || []);
            setRoutes(data.routes || []);

            const saved = data.params || {};

            // Restore simulation params
            if (saved.simulationParams) setParams(prev => ({ ...prev, ...saved.simulationParams }));

            // Restore industry config
            if (saved.industryConfig) {
              const match = PRESET_INDUSTRIES.find((p: IndustryConfig) => p.id === saved.industryConfig.id);
              setIndustryConfig(match || saved.industryConfig);
            }

            // Restore settings
            if (saved.lowStockThreshold != null) setLowStockThreshold(saved.lowStockThreshold);
            if (saved.costVarianceThreshold != null) setCostVarianceThreshold(saved.costVarianceThreshold);

            // Restore simulation progress
            if (saved.simulation) {
              const sim = saved.simulation;
              if (sim.day > 0) setDay(sim.day);
              if (sim.speed) setSpeed(sim.speed);
              if (sim.history?.length > 0) setHistory(sim.history);
              if (sim.logs?.length > 0) setLogs(sim.logs);
              if (sim.shipments?.length > 0) setShipments(sim.shipments);
            }

            networkIdRef.current = latest.id;
            initialLoadDone.current = true;
            return;
          }
        }
      } catch {}

      // 2. Fall back to built-in solar chain preset for new users
      setNodes(SOLAR_PRESET_NODES);
      setRoutes(SOLAR_PRESET_ROUTES);
      initialLoadDone.current = true;
    };
    loadState();
  }, []);

  // Derive workflow state from existing state — no extra storage
  const workflowState: WorkflowState = {
    industryConfigured: industryConfig.id !== 'solar', // solar is the default, anything else means user chose
    networkBuilt: nodes.length > 0,
    riskConfigured: params.geopoliticalTension || params.tariffImposition || params.logisticDisruption || params.weatherEvent || params.supplierFailureProb > 0.01,
    simulationRun: day > 0,
    analysisReady: history.length >= 30,
  };

  // Fix #6: Guard against NaN when nodes array is empty
  const networkHealth = nodes.length === 0 ? 0 : Math.round(
    (nodes.filter(n => n.status === NodeStatus.OPTIMAL).length / nodes.length) * 100
  );
  const activeShipments = shipments.length;
  const riskLevel = nodes.some(n => n.status === NodeStatus.CRITICAL) ? 'HIGH' :
                   nodes.some(n => n.status === NodeStatus.WARNING) ? 'MED' : 'LOW';

  const workflowSteps = [
    { label: 'Industry', done: workflowState.industryConfigured, tab: 'settings' },
    { label: 'Network',  done: workflowState.networkBuilt,       tab: 'builder' },
    { label: 'Risk',     done: workflowState.riskConfigured,     tab: 'resilience' },
    { label: 'Simulate', done: workflowState.simulationRun,      tab: 'simulation' },
    { label: 'Analyze',  done: workflowState.analysisReady,      tab: 'analytics' },
    { label: 'Optimize', done: false,                            tab: 'optimization' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Workflow Progress Strip */}
            <div className="bg-white/5 rounded-2xl border border-white/5 p-3 md:p-4 flex items-center justify-between gap-2 overflow-x-auto">
              {workflowSteps.map((step, i) => (
                <React.Fragment key={step.tab}>
                  <button onClick={() => setActiveTab(step.tab)} className="flex flex-col items-center gap-1 group">
                    {step.done
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      : <Circle className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />}
                    <span className={`text-[9px] uppercase tracking-widest font-bold ${step.done ? 'text-emerald-400' : 'text-white/30'}`}>{step.label}</span>
                  </button>
                  {i < workflowSteps.length - 1 && (
                    <div className={`flex-1 h-px ${step.done ? 'bg-emerald-400/40' : 'bg-white/10'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-4 md:gap-8">
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 md:gap-8">
                <div className="grid grid-cols-3 gap-3 md:gap-6">
                  <div className="bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-8">
                    <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1 md:mb-2">Network Health</p>
                    <h3 className="text-2xl md:text-4xl font-bold text-white tracking-tighter">{networkHealth}%</h3>
                  </div>
                  <div className="bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-8">
                    <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1 md:mb-2">Active Shipments</p>
                    <h3 className="text-2xl md:text-4xl font-bold text-white tracking-tighter">{activeShipments}</h3>
                  </div>
                  <div className="bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-8">
                    <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1 md:mb-2">Risk Level</p>
                    <h3 className={`text-2xl md:text-4xl font-bold tracking-tighter ${riskLevel === 'HIGH' ? 'text-red-500' : 'text-white'}`}>{riskLevel}</h3>
                  </div>
                </div>
                <div ref={globeRef} className="min-h-[250px] sm:min-h-[350px] md:min-h-[500px] relative">
                  <Globe nodes={nodes} routes={routes} onNodeSelect={setSelectedNode} selectedNodeId={selectedNode?.id || null} />
                </div>
              </div>
              <div className="col-span-12 lg:col-span-4 overflow-hidden">
                 <div className="bg-[#050505] rounded-3xl border border-white/5 p-8 h-full flex flex-col">
                    <h3 className="text-white font-semibold flex items-center gap-2 mb-8"><Activity className="w-5 h-5" /> Telemetry</h3>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4">{industryConfig.name}</p>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                      {nodes.map(node => (
                        <div key={node.id} onClick={() => { setSelectedNode(node); if (window.innerWidth < 1024 && globeRef.current) { globeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }} className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer">
                          <div className="flex justify-between items-center"><span className="text-sm font-bold text-white">{node.name}</span><div className={`w-2 h-2 rounded-full ${node.status === NodeStatus.OPTIMAL ? 'bg-emerald-500' : node.status === NodeStatus.OFFLINE ? 'bg-gray-500' : 'bg-red-500'}`} /></div>
                          <p className="text-xs text-white/40">{node.type} • {node.inventoryLevel} units</p>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        );
      case 'builder':
        return <NetworkBuilder nodes={nodes} routes={routes} setNodes={setNodes} setRoutes={setRoutes} />;
      case 'simulation':
        return (
          <SimulationEngine
            nodes={nodes} routes={routes} setNodes={setNodes}
            day={day} isPlaying={isPlaying} setIsPlaying={setIsPlaying}
            speed={speed} setSpeed={setSpeed} logs={logs}
            shipments={shipments} resetSimulation={resetSimulation}
            params={params} setParams={setParams} industryConfig={industryConfig}
          />
        );
      case 'analytics':
        return <AnalyticsView history={history} nodes={nodes} industryConfig={industryConfig} />;
      case 'resilience':
        return <ResilienceHub nodes={nodes} routes={routes} params={params} setParams={setParams} setIsPlaying={setIsPlaying} setActiveTab={setActiveTab} resetSimulation={resetSimulation} />;
      case 'optimization':
        return <OptimizationView nodes={nodes} routes={routes} history={history} params={params} industryConfig={industryConfig} analysisReady={workflowState.analysisReady} />;
      case 'settings':
        return <SettingsView
          industryConfig={industryConfig} setIndustryConfig={setIndustryConfig}
          lowStockThreshold={lowStockThreshold} setLowStockThreshold={setLowStockThreshold}
          costVarianceThreshold={costVarianceThreshold} setCostVarianceThreshold={setCostVarianceThreshold}
          setNodes={setNodes} setRoutes={setRoutes} setParams={setParams}
          resetSimulation={resetSimulation}
        />;
      default:
        return <div className="text-white">Coming Soon</div>;
    }
  };

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'builder', label: 'Builder', icon: Network },
    { id: 'simulation', label: 'Simulation', icon: PlayCircle },
    { id: 'resilience', label: 'Resilience', icon: ShieldAlert },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'optimization', label: 'Optimize', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar — hidden below md (768px), icon-only at md, full at lg */}
      <nav className="hidden md:flex w-20 lg:w-64 border-r border-white/5 flex-col shrink-0">
        <div className="p-4 lg:p-8 flex items-center justify-center lg:justify-start"><h1 className="text-white font-black text-2xl tracking-tighter hidden lg:flex items-center gap-2"><Zap className="w-8 h-8 fill-white" />ChainSim</h1><Zap className="lg:hidden w-7 h-7 fill-white" /></div>
        <div className="flex-1 px-2 lg:px-4 space-y-2">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center justify-center lg:justify-start gap-4 px-2 lg:px-4 py-3 lg:py-4 rounded-2xl transition-all min-h-[44px] ${activeTab === item.id ? 'bg-white text-black' : 'text-white/40'}`}>
              <item.icon className="w-5 h-5 shrink-0" /><span className="hidden lg:block text-[10px] font-bold uppercase">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-12 shrink-0">
          {/* Logo — visible only on mobile where sidebar is hidden */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-black fill-black" />
            </div>
            <span className="text-white font-black tracking-tighter text-base">CHAIN<span className="text-white/40 font-light">SIM</span></span>
          </div>
          {/* Session info — hidden on mobile to avoid clutter */}
          <p className="hidden md:block text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">
            {user?.name || user?.email} • v4.2.0
          </p>
          <div className="flex items-center gap-2">
            <button className="px-4 md:px-6 py-2 bg-white text-black text-xs font-bold rounded-full min-h-[36px]">DEPLOY</button>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 text-white/40 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-8 lg:pb-12 custom-scrollbar">{renderContent()}</div>
      </main>

      {/* Bottom nav — visible below md (768px): phones + small tablets in portrait */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/5 flex">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex-1 flex items-center justify-center min-h-[56px] transition-colors ${activeTab === item.id ? 'text-white' : 'text-white/30'}`}>
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
