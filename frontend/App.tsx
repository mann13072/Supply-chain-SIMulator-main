import React, { useState, useEffect, useRef, useCallback } from 'react';
import Globe from './components/Globe';
import NetworkBuilder from './components/NetworkBuilder';
import SimulationEngine from './components/SimulationEngine';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import OptimizationView from './components/OptimizationView';
import { SupplyNode, NodeType, NodeStatus, Route, TransportMode, SimulationParams, InTransitShipment, HistorySnapshot, IndustryConfig, WorkflowState, BillOfMaterials, RouteIntelligenceState } from './types';
import { routingService } from './services/routingService';
import { PRESET_INDUSTRIES, INDUSTRY_THEMES } from './utils/industries';
import { getStarterNetwork } from './utils/starterNetworks';
import { getIndustryBOM, autoMapNodesToBOM } from './utils/industryBOMs';
import { classifySupplyChainTiers, estimateImpactDelay } from './utils/tierClassifier';
import { ThemeProvider } from './contexts/ThemeContext';
import IndustryWizard from './components/IndustryWizard';
import IndustryView from './components/IndustryView';
import DeployMenu from './components/DeployMenu';
import SimulationHistoryView from './components/SimulationHistoryView';
import BOMView from './components/BOMView';
import RouteIntelligenceView from './components/RouteIntelligenceView';
import { applyEventEffectsToRoutes } from './utils/eventRouteMapper';
import { LayoutDashboard, Network, PlayCircle, BarChart3, Settings, Zap, Activity, CheckCircle2, Circle, LogOut, Factory, Clock, Layers, Radar } from 'lucide-react';
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
  { id: 'r_baotou_shanghai',    fromId: 'BAOTOU_SILICON', toId: 'SHANGHAI_CELL',  mode: TransportMode.AIR, distance: 1580,  baseLeadTime: 1,  leadTimeVariability: 0.1, costPerUnitDistance: 0.008, vehicleCapacity: 2000, shipmentFrequency: 1, fuelPrice: 1.5, customsTime: 0, disruptionProb: 0.01 },
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
  unitProductionCost: 20,
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
  logisticDisruption: false,
  seasonalityPattern: 'none',
  seasonalityAmplitude: 0,
  tariffRate: 10,
  tierVisibilityDecay: 20,
  tierBullwhipAmplification: true,
};

// ── BOM helper: Demand Explosion (top-down push) ────────────────────────────
function explodeDemand(
  retailDemand: Map<string, number>,
  bom: BillOfMaterials,
  nodes: SupplyNode[]
): Map<string, number> {
  const required = new Map<string, number>();
  for (const [nodeId, demand] of retailDemand) {
    const productId = nodes.find(n => n.id === nodeId)?.bomProductId;
    if (productId) required.set(productId, (required.get(productId) || 0) + demand);
  }
  const queue = [...required.keys()];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    if (visited.has(parentId)) continue;
    visited.add(parentId);
    const parentQty = required.get(parentId)!;
    for (const entry of bom.entries.filter(e => e.parentProductId === parentId)) {
      const childQty = parentQty * entry.quantityPer;
      required.set(entry.childProductId, (required.get(entry.childProductId) || 0) + childQty);
      queue.push(entry.childProductId);
    }
  }
  return required;
}

// ── BOM helper: Risk Propagation (bottom-up pull) ───────────────────────────
function computeBOMRiskScores(
  nodes: SupplyNode[],
  bom: BillOfMaterials,
  explodedDemand: Map<string, number>
): { productId: string; riskPct: number }[] {
  const risk = new Map<string, number>();

  // Score leaf products (tier >= 3)
  for (const product of bom.products.filter(p => p.tier >= 3)) {
    const suppliers = nodes.filter(n => n.bomProductId === product.id);
    if (suppliers.length === 0) {
      risk.set(product.id, 35); // virtual node — blind spot penalty
      continue;
    }
    const offlineFrac = suppliers.filter(n => n.status === NodeStatus.OFFLINE).length / suppliers.length;
    const criticalFrac = suppliers.filter(n => n.status === NodeStatus.CRITICAL).length / suppliers.length;
    const totalInv = suppliers.reduce((s, n) => s + n.inventoryLevel, 0);
    const dailyReq = explodedDemand.get(product.id) || 0;
    const daysOfSupply = dailyReq > 0 ? totalInv / dailyReq : 999;

    const statusRisk = (offlineFrac * 100) + (criticalFrac * 50);
    const coverageRisk = daysOfSupply < 3 ? 80 : daysOfSupply < 7 ? 50 : daysOfSupply < 14 ? 25 : 5;
    risk.set(product.id, Math.min(100, Math.round(statusRisk * 0.6 + coverageRisk * 0.4)));
  }

  // Also score tier 2 products that have no children scored yet (leaf assemblies)
  for (const product of bom.products.filter(p => p.tier >= 0 && !risk.has(p.id))) {
    const hasChildren = bom.entries.some(e => e.parentProductId === product.id);
    if (!hasChildren) {
      const supplierNodes = nodes.filter(n => n.bomProductId === product.id);
      if (supplierNodes.length === 0) { risk.set(product.id, 35); continue; }
      const offF = supplierNodes.filter(n => n.status === NodeStatus.OFFLINE).length / supplierNodes.length;
      risk.set(product.id, Math.min(100, Math.round(offF * 100)));
    }
  }

  const SUBST_BUFFER: Record<string, number> = { easy: 0.3, moderate: 0.6, hard: 0.85, none: 1.0 };

  // Propagate upward tier by tier
  for (let tier = 3; tier >= 0; tier--) {
    for (const product of bom.products.filter(p => p.tier === tier)) {
      const children = bom.entries.filter(e => e.parentProductId === product.id);
      if (children.length === 0) continue;
      let maxChildRisk = 0, wSum = 0, wTotal = 0;
      for (const child of children) {
        const cr = risk.get(child.childProductId) || 0;
        const buf = SUBST_BUFFER[child.substitutionDifficulty] ?? 0.6;
        const eff = cr * buf;
        const w = child.critical ? 2.0 : 1.0;
        wSum += eff * w;
        wTotal += w;
        maxChildRisk = Math.max(maxChildRisk, eff);
      }
      const composite = wTotal > 0 ? (maxChildRisk * 0.6) + ((wSum / wTotal) * 0.4) : 0;
      risk.set(product.id, Math.min(100, Math.round(composite)));
    }
  }

  return Array.from(risk.entries()).map(([productId, riskPct]) => ({ productId, riskPct }));
}

// Pure function: computes next simulation state from current state.
// Returns both next nodes and next shipments — no setState calls inside.
function computeNextSimulationState(
  prevNodes: SupplyNode[],
  prevShipments: InTransitShipment[],
  routes: Route[],
  params: SimulationParams,
  nextDay: number,
  industryConfig: IndustryConfig,
  bom?: BillOfMaterials | null
): { nextNodes: SupplyNode[]; nextShipments: InTransitShipment[]; newLogs: string[]; snapshot: HistorySnapshot } {

  // ── Cost multipliers ───────────────────────────────────────────────────────
  const commodityMultiplier = Object.values(params.commodityPriceChanges)
    .reduce((acc, change) => acc * (1 + change / 100), 1.0);
  const costSqueeze = Math.min(1.0, Math.max(0.1, 1 / commodityMultiplier));
  const energyFactor = Math.max(0.5, 1 / (1 + params.energyCostChange / 100));

  // Per-commodity price multipliers (for material-linked nodes)
  const commodityPriceMults: Record<string, number> = {};
  for (const [id, change] of Object.entries(params.commodityPriceChanges)) {
    commodityPriceMults[id] = 1 + change / 100;
  }

  // Inflation compounds over time: costs grow by inflationRate% per year
  const inflationMult = Math.pow(1 + (params.inflationRate || 0) / 100, nextDay / 365);
  // Subsidy reduces production cost
  const subsidyMult = Math.max(0, 1 - (params.subsidyLevel || 0) / 100);

  const nextNodes = prevNodes.map(n => ({ ...n }));
  const newLogs: string[] = [];
  const nextShipments: InTransitShipment[] = [];

  // ── Metrics accumulators ─────────────────────────────────────────────────
  let demandTotal = 0, demandFulfilled = 0, stockoutCost = 0;
  let newShipmentsTotal = 0, newShipmentsDelayed = 0;
  const disruptionCounts = {
    naturalDisaster: 0, cyberIncident: 0, supplierFailure: 0,
    laborStrike: 0, demandShock: 0, qualityRecall: 0, pandemicEffect: 0,
  };
  const factoryUtilization: { id: string; name: string; util: number }[] = [];
  const strikeNodes = new Set<string>();
  let expiredUnits = 0, defectUnits = 0;
  let tariffCostTotal = 0, carbonTotal = 0;
  let transportCostTotal = 0, productionCostTotal = 0, warehousingCostTotal = 0;
  let revenueTotal = 0, cogsTotal = 0, expeditingCostTotal = 0;
  const materialBottlenecks: { factoryId: string; materialId: string; materialName: string; daysUntilStockout: number }[] = [];

  const CARBON_FACTORS: Record<string, number> = { Sea: 15, Road: 62, Rail: 22, Air: 500 };

  // ── BOM: Demand explosion (compute once per tick) ─────────────────────────
  const retailDemandMap = new Map<string, number>();
  if (bom) {
    nextNodes.forEach(n => {
      if (n.type === NodeType.RETAIL) {
        retailDemandMap.set(n.id, n.demandVolume || 20);
      }
    });
  }
  const explodedDemand = bom ? explodeDemand(retailDemandMap, bom, nextNodes) : new Map<string, number>();

  // ── Step 0: Recovery timers (offline + cyber) ───────────────────────────
  nextNodes.forEach(node => {
    if (node.status === NodeStatus.OFFLINE && (node.offlineRecoveryDaysRemaining ?? 0) > 0) {
      node.offlineRecoveryDaysRemaining = (node.offlineRecoveryDaysRemaining ?? 1) - 1;
      if (node.offlineRecoveryDaysRemaining! <= 0) {
        node.offlineRecoveryDaysRemaining = 0;
        node.status = NodeStatus.WARNING;
        newLogs.push(`Day ${nextDay}: ${node.name} RECOVERED — resuming operations.`);
      }
    }
    // Cyber recovery: restore throughput after recovery period
    if ((node.cyberRecoveryDaysRemaining ?? 0) > 0) {
      node.cyberRecoveryDaysRemaining = (node.cyberRecoveryDaysRemaining ?? 1) - 1;
      if (node.cyberRecoveryDaysRemaining! <= 0) {
        node.cyberRecoveryDaysRemaining = 0;
        if (node._baseThroughputCapacity) {
          node.throughputCapacity = node._baseThroughputCapacity;
          node._baseThroughputCapacity = undefined;
          newLogs.push(`Day ${nextDay}: ${node.name} cyber recovery complete — throughput restored.`);
        }
      }
    }

    // Initialize/update accumulated unit cost for suppliers based on linked material
    if (node.type === NodeType.SUPPLIER) {
      const baseCost = (node.supplierCostPerUnit || 10) * (params.currencyExchangeRate || 1);
      // If supplier is linked to a commodity, apply that commodity's price change
      const matMult = node.materialId ? (commodityPriceMults[node.materialId] ?? 1) : 1;
      node.accumulatedUnitCost = baseCost * matMult;
    }
  });

  // ── Step 0b: Bootstrap accumulatedUnitCost for non-supplier nodes (first tick or if missing) ──
  // Walk the supply chain graph so downstream nodes inherit realistic upstream costs
  if (nextDay <= 1 || nextNodes.some(n => n.type !== NodeType.SUPPLIER && !n.accumulatedUnitCost)) {
    // Multiple passes to propagate through multi-tier chains (supplier→factory→DC→warehouse→retail)
    for (let pass = 0; pass < 5; pass++) {
      nextNodes.forEach(node => {
        if (node.type === NodeType.SUPPLIER) return; // already set above
        if (node.accumulatedUnitCost && node.accumulatedUnitCost > (node.supplierCostPerUnit || 10) && nextDay > 1) return; // already has a real value
        // Find the best upstream node via inbound routes
        const inboundRoutes = routes.filter(r => r.toId === node.id);
        if (inboundRoutes.length === 0) return;
        const upstreamCosts = inboundRoutes.map(r => {
          const src = nextNodes.find(n => n.id === r.fromId);
          if (!src || !src.accumulatedUnitCost) return null;
          const transportPerUnit = (r.costPerUnitDistance || 0) * r.distance;
          return src.accumulatedUnitCost + transportPerUnit;
        }).filter((c): c is number => c !== null);
        if (upstreamCosts.length === 0) return;
        const avgUpstreamCost = upstreamCosts.reduce((a, b) => a + b, 0) / upstreamCosts.length;
        // Factories add production cost on top
        const prodCostAdder = (node.type === NodeType.FACTORY)
          ? ((node.unitProductionCost ?? params.unitProductionCost ?? 20) * inflationMult * subsidyMult)
          : 0;
        node.accumulatedUnitCost = avgUpstreamCost + prodCostAdder;
      });
    }
  }

  // ── Step 1: Process arriving shipments (with COGS accumulation) ─────────
  prevShipments.forEach(s => {
    if (s.remainingDays <= 1) {
      const target = nextNodes.find(n => n.id === s.toId);
      if (target) {
        // BOM-aware: route material shipments to the factory's material bin
        if (s.materialId && target.materialInventory && target.type === NodeType.FACTORY) {
          target.materialInventory[s.materialId] = (target.materialInventory[s.materialId] || 0) + s.quantity;
          newLogs.push(`Day ${nextDay}: Material shipment arrived at ${target.name} (${s.quantity} units of ${s.materialId})`);
        } else {
          // Standard: add to generic inventory pool with cost accumulation
          const incomingUnitCost = s.unitCost || (target.accumulatedUnitCost || 10);
          const existingInv = target.inventoryLevel;
          const existingCost = target.accumulatedUnitCost || incomingUnitCost;
          const addedQty = Math.min(s.quantity, target.maxCapacity - target.inventoryLevel);
          if (addedQty > 0 && (existingInv + addedQty) > 0) {
            target.accumulatedUnitCost = (existingInv * existingCost + addedQty * incomingUnitCost) / (existingInv + addedQty);
          }
          target.inventoryLevel = Math.min(target.maxCapacity, target.inventoryLevel + s.quantity);
          newLogs.push(`Day ${nextDay}: Shipment arrived at ${target.name} (${s.quantity} units)`);
        }
      }
    } else {
      nextShipments.push({ ...s, remainingDays: s.remainingDays - 1 });
    }
  });

  // ── Step 2: Risk events + demand + production ───────────────────────────
  nextNodes.forEach(node => {
    if (node.status === NodeStatus.OFFLINE) return;

    // Natural disaster → OFFLINE
    if (Math.random() < params.naturalDisasterProb) {
      node.status = NodeStatus.OFFLINE;
      node.offlineRecoveryDaysRemaining = Math.max(1, params.recoveryTime);
      disruptionCounts.naturalDisaster++;
      newLogs.push(`Day ${nextDay}: NATURAL DISASTER hit ${node.name}! Offline for ~${params.recoveryTime} days.`);
      return;
    }

    // Quality recall — quarantine 25%
    if (params.qualityRecallProb > 0 && Math.random() < params.qualityRecallProb && node.inventoryLevel > 0) {
      const recalledQty = Math.floor(node.inventoryLevel * 0.25);
      node.inventoryLevel = Math.max(0, node.inventoryLevel - recalledQty);
      disruptionCounts.qualityRecall++;
      newLogs.push(`Day ${nextDay}: QUALITY RECALL at ${node.name}! ${recalledQty} units quarantined.`);
    }

    // Cyber attack — halve throughput WITH recovery timer (fixes compounding bug)
    if ((node.type === NodeType.DISTRIBUTION_CENTER || node.type === NodeType.WAREHOUSE)
        && Math.random() < params.cyberRisk && (node.cyberRecoveryDaysRemaining ?? 0) === 0) {
      node._baseThroughputCapacity = node._baseThroughputCapacity || node.throughputCapacity || 500;
      node.throughputCapacity = Math.floor((node._baseThroughputCapacity) * 0.5);
      node.cyberRecoveryDaysRemaining = Math.max(3, Math.floor(params.recoveryTime / 3));
      disruptionCounts.cyberIncident++;
      newLogs.push(`Day ${nextDay}: CYBER INCIDENT at ${node.name}. Throughput halved for ${node.cyberRecoveryDaysRemaining}d.`);
    }

    // Supplier failure → CRITICAL
    if (node.type === NodeType.SUPPLIER && Math.random() < params.supplierFailureProb) {
      node.status = NodeStatus.CRITICAL;
      node.offlineRecoveryDaysRemaining = Math.max(1, Math.floor(params.recoveryTime / 2));
      disruptionCounts.supplierFailure++;
      newLogs.push(`Day ${nextDay}: SUPPLIER FAILURE at ${node.name}!`);
    }

    // Labor strike
    if (node.type === NodeType.FACTORY && Math.random() < params.laborStrikeProb) {
      strikeNodes.add(node.id);
      disruptionCounts.laborStrike++;
      newLogs.push(`Day ${nextDay}: LABOR STRIKE at ${node.name}. No production today.`);
    }

    // Pandemic
    if (params.pandemicFactor > 0 && node.type === NodeType.FACTORY
        && Math.random() < params.pandemicFactor * 0.1) {
      strikeNodes.add(node.id);
      disruptionCounts.pandemicEffect++;
      newLogs.push(`Day ${nextDay}: PANDEMIC DISRUPTION halted ${node.name}.`);
    }

    // Demand shock persistence
    if ((node.demandShockDaysRemaining ?? 0) > 0) {
      node.demandShockDaysRemaining = (node.demandShockDaysRemaining ?? 1) - 1;
    }

    // ── Demand consumption (RETAIL) + Revenue + COGS ─────────────────────
    if (node.type === NodeType.RETAIL) {
      const surgeFactor = 1 + (params.demandSurge / 100);
      const pandemicDemandBoost = params.pandemicFactor > 0 ? 1 + params.pandemicFactor * 0.5 : 1;

      // Seasonality
      let seasonalFactor = 1.0;
      const amp = (node.demandSeasonality || params.seasonalityAmplitude || 0) / 100;
      if (amp > 0) {
        const pattern = params.seasonalityPattern || 'none';
        if (pattern === 'weekly') seasonalFactor = 1 + amp * Math.sin(2 * Math.PI * (nextDay % 7) / 7);
        else if (pattern === 'monthly') seasonalFactor = 1 + amp * Math.sin(2 * Math.PI * (nextDay % 30) / 30);
        else if (pattern === 'holiday') {
          const doy = nextDay % 365;
          seasonalFactor = (doy > 340 || doy < 10) ? 1 + amp * 2 : (doy > 148 && doy < 162) ? 1 + amp : 1.0;
        }
      }

      // Demand variability — stochastic noise
      const variability = (node.demandVariability || 0) / 100;
      const noiseMultiplier = variability > 0 ? 1 + variability * (Math.random() * 2 - 1) : 1;

      const baseDemand = (node.demandVolume || 20) * surgeFactor * pandemicDemandBoost * seasonalFactor * noiseMultiplier;

      // Dynamic pricing
      let pricingFactor = 1.0;
      if (params.dynamicPricing) {
        const stockRatio = node.inventoryLevel / node.maxCapacity;
        const elasticity = node.priceElasticity ?? -1.2;
        pricingFactor = Math.max(0.7, Math.min(1.3, 1 + elasticity * (stockRatio - 0.5) * -0.3));
      }

      // Demand shock
      const newShock = (node.demandShockDaysRemaining ?? 0) === 0 && Math.random() < params.demandShockProb;
      if (newShock) {
        node.demandShockDaysRemaining = 3 + Math.floor(Math.random() * 5);
        disruptionCounts.demandShock++;
        newLogs.push(`Day ${nextDay}: DEMAND SHOCK at ${node.name}! Lasts ${node.demandShockDaysRemaining} days.`);
      }
      const isShocked = (node.demandShockDaysRemaining ?? 0) > 0;

      const demand = Math.max(0, Math.floor(baseDemand * pricingFactor * (isShocked ? 2 : 1)));
      const fulfilled = Math.min(demand, node.inventoryLevel);
      demandTotal += demand;
      demandFulfilled += fulfilled;

      // Revenue + COGS — per-node markup override ?? global default
      const nodeUnitCost = node.accumulatedUnitCost || (node.supplierCostPerUnit || 10);
      const markupPct = node.markupPct ?? params.defaultMarkupPct ?? 50;
      const sellingPrice = node.sellingPricePerUnit || (nodeUnitCost * (1 + markupPct / 100));
      revenueTotal += fulfilled * sellingPrice;
      cogsTotal += fulfilled * nodeUnitCost;

      node.inventoryLevel = Math.max(0, node.inventoryLevel - demand);
      node.status = node.inventoryLevel < (node.reorderPoint || 20) ? NodeStatus.WARNING : NodeStatus.OPTIMAL;
      if (node.inventoryLevel === 0 && demand > 0) {
        newLogs.push(`Day ${nextDay}: STOCKOUT at ${node.name}!`);
        node.status = NodeStatus.CRITICAL;
        stockoutCost += params.stockoutPenalty;
      }
    }

    // ── Production (FACTORY) + production cost + COGS accumulation ───────
    if (node.type === NodeType.FACTORY && !strikeNodes.has(node.id)) {
      const degradation = Math.max(0, params.yieldRateDegradation);
      const yieldRate = Math.max(0, ((node.yieldRate || 100) - degradation)) / 100;
      const effectiveSqueeze = costSqueeze * energyFactor;
      const grossProduction = Math.floor((node.productionCapacity || 100) * yieldRate * effectiveSqueeze);

      // Demand-driven production: cap output based on downstream pull signals
      // Tier-aware: demand signal decays by tierVisibilityDecay% per tier hop from retail,
      // partially offset by collaborationLevel (information sharing).
      const downstreamDemand = routes.filter(r => r.fromId === node.id).reduce((sum, r) => {
        const dst = nextNodes.find(n => n.id === r.toId);
        if (!dst) return sum;
        const rawSignal = dst.type === NodeType.RETAIL ? (dst.demandVolume || 50) : (dst.orderQuantity || 100);
        // Apply visibility decay based on supply chain tier distance
        const tierDist = node.supplyChainTier != null ? Math.max(0, node.supplyChainTier) : 0;
        const decayRate = (params.tierVisibilityDecay ?? 20) / 100;
        const visibilityFactor = Math.pow(1 - decayRate, tierDist);
        // Collaboration level reduces information loss (0=no sharing, 100=full transparency)
        const collabOffset = (1 - visibilityFactor) * ((params.collaborationLevel || 50) / 100);
        const effectiveVisibility = Math.min(1, visibilityFactor + collabOffset);
        return sum + rawSignal * effectiveVisibility;
      }, 0);
      const demandCap = downstreamDemand > 0 ? Math.ceil(downstreamDemand * 1.2) : grossProduction;

      // BOM-constrained production: limit output by available input materials
      let materialCap = Infinity;
      let bottleneckMaterialId: string | null = null;
      const bomInputs = bom && node.bomProductId && node.materialInventory
        ? bom.entries.filter(e => e.parentProductId === node.bomProductId)
        : [];
      if (bomInputs.length > 0 && node.materialInventory) {
        for (const input of bomInputs) {
          const available = node.materialInventory[input.childProductId] || 0;
          const canMake = input.quantityPer > 0 ? Math.floor(available / input.quantityPer) : Infinity;
          if (canMake < materialCap) {
            materialCap = canMake;
            bottleneckMaterialId = input.childProductId;
          }
        }
      }

      const targetProduction = Math.min(grossProduction, demandCap, materialCap === Infinity ? grossProduction : materialCap);

      // Track material bottleneck
      if (bottleneckMaterialId != null && materialCap < grossProduction && bom) {
        const matProduct = bom.products.find(p => p.id === bottleneckMaterialId);
        const available = node.materialInventory?.[bottleneckMaterialId] || 0;
        const dailyUsage = targetProduction > 0
          ? (bomInputs.find(e => e.childProductId === bottleneckMaterialId)?.quantityPer || 1) * targetProduction
          : 1;
        materialBottlenecks.push({
          factoryId: node.id,
          materialId: bottleneckMaterialId,
          materialName: matProduct?.name || bottleneckMaterialId,
          daysUntilStockout: dailyUsage > 0 ? Math.round(available / dailyUsage) : 999,
        });
        if (materialCap === 0) {
          newLogs.push(`Day ${nextDay}: ${node.name} HALTED — out of ${matProduct?.name || bottleneckMaterialId}`);
        }
      }

      const defectRate = (node.defectRate || 0) / 100;
      const defectsThisTick = defectRate > 0 ? Math.floor(targetProduction * defectRate) : 0;
      const netProduction = targetProduction - defectsThisTick;
      defectUnits += defectsThisTick;

      const spaceAvailable = node.maxCapacity - node.inventoryLevel;
      const actualProduced = Math.min(netProduction, spaceAvailable);

      // BOM: consume input materials after production
      if (bomInputs.length > 0 && node.materialInventory && actualProduced > 0) {
        for (const input of bomInputs) {
          node.materialInventory[input.childProductId] = Math.max(0,
            (node.materialInventory[input.childProductId] || 0) - actualProduced * input.quantityPer
          );
        }
      }

      // Production cost: per-node override ?? global default, adjusted for inflation + subsidy
      let inputMaterialMult = 1;
      if (node.inputMaterialIds && node.inputMaterialIds.length > 0) {
        inputMaterialMult = node.inputMaterialIds.reduce((acc, matId) => acc * (commodityPriceMults[matId] ?? 1), 1);
      }
      const unitProdCost = (node.unitProductionCost ?? params.unitProductionCost ?? 20) * inflationMult * subsidyMult * inputMaterialMult;
      const dailyProdCost = actualProduced * unitProdCost;
      productionCostTotal += dailyProdCost;

      if (actualProduced > 0) {
        const inputCost = node.accumulatedUnitCost || (node.supplierCostPerUnit || 10);
        const newUnitCost = inputCost + unitProdCost;
        const existingInv = node.inventoryLevel;
        const existingCost = node.accumulatedUnitCost || inputCost;
        if ((existingInv + actualProduced) > 0) {
          node.accumulatedUnitCost = (existingInv * existingCost + actualProduced * newUnitCost) / (existingInv + actualProduced);
        }
      }

      node.inventoryLevel = Math.min(node.maxCapacity, node.inventoryLevel + actualProduced);
      factoryUtilization.push({
        id: node.id, name: node.name,
        util: Math.round(actualProduced / (node.productionCapacity || 100) * 100),
      });
    }
  });

  // ── Step 3: Value-based holding cost (per-node carrying rate override) ────
  const globalCarryingRate = (params.inventoryCarryingCost || 5) / 100 / 365;
  const holdingCost = nextNodes.reduce((sum, n) => {
    const nodeRate = n.carryingCostOverride != null ? (n.carryingCostOverride / 100 / 365) : globalCarryingRate;
    const unitValue = n.accumulatedUnitCost || n.supplierCostPerUnit || 10;
    return sum + n.inventoryLevel * unitValue * nodeRate;
  }, 0);

  // ── Step 3b: Warehousing cost (per-node override ?? global) ────────────────
  nextNodes.forEach(node => {
    if (node.type === NodeType.WAREHOUSE || node.type === NodeType.DISTRIBUTION_CENTER) {
      const whRate = node.warehousingCostOverride ?? params.warehousingCost ?? 10;
      const dailyWhCost = ((node.throughputCapacity || 500) * whRate) / 365;
      warehousingCostTotal += dailyWhCost * inflationMult;
    }
  });

  // ── Step 3c: Shelf-life expiry (F8) ───────────────────────────────────────
  nextNodes.forEach(node => {
    if (node.shelfLife && node.shelfLife > 0 && node.inventoryLevel > 0) {
      const expired = Math.floor(node.inventoryLevel * (1 / node.shelfLife));
      if (expired > 0) {
        node.inventoryLevel = Math.max(0, node.inventoryLevel - expired);
        expiredUnits += expired;
        if (expired > 50) {
          newLogs.push(`Day ${nextDay}: ${expired} units EXPIRED at ${node.name} (shelf life: ${node.shelfLife}d)`);
        }
      }
    }
  });

  // ── Step 4: Inventory pooling ─────────────────────────────────────────────
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
          const transfer = Math.min(Math.floor(src.inventoryLevel * 0.1), dst.maxCapacity - dst.inventoryLevel);
          if (transfer > 0) {
            src.inventoryLevel -= transfer;
            dst.inventoryLevel += transfer;
            newLogs.push(`Day ${nextDay}: POOL ${src.name}→${dst.name} (${transfer} units)`);
          }
        }
      });
    });
  }

  // ── Step 5a: BOM-aware per-material reorder (factories with materialInventory) ──
  if (bom) {
    nextNodes.forEach(node => {
      if (node.status === NodeStatus.OFFLINE) return;
      if (node.type !== NodeType.FACTORY || !node.bomProductId || !node.materialInventory) return;

      const bomInputs = bom.entries.filter(e => e.parentProductId === node.bomProductId);
      if (bomInputs.length === 0) return;

      for (const input of bomInputs) {
        const onHand = node.materialInventory[input.childProductId] || 0;
        const dailyUsage = (node.productionCapacity || 100) * input.quantityPer;
        const bufferDays = 2;
        const materialReorderPoint = dailyUsage * bufferDays;
        if (onHand > materialReorderPoint) continue;

        // Find routes from suppliers that provide this specific material
        const materialRoutes = routes.filter(r => {
          const src = nextNodes.find(n => n.id === r.fromId);
          return r.toId === node.id && src?.bomProductId === input.childProductId;
        });
        if (materialRoutes.length === 0) continue;

        // Select best route (prefer highest stock)
        const bestRoute = materialRoutes.reduce<Route | null>((best, r) => {
          const src = nextNodes.find(n => n.id === r.fromId);
          if (!src || src.status === NodeStatus.OFFLINE || src.inventoryLevel <= 0) return best;
          if (!best) return r;
          const bestSrc = nextNodes.find(n => n.id === best.fromId);
          if (!bestSrc) return r;
          return src.inventoryLevel > bestSrc.inventoryLevel ? r : best;
        }, null);
        if (!bestRoute) continue;

        const source = nextNodes.find(n => n.id === bestRoute.fromId);
        if (!source || source.status === NodeStatus.OFFLINE || source.inventoryLevel <= 0) continue;

        // Order enough for leadTime + buffer days of production
        const leadTimeDays = Math.max(1, bestRoute.baseLeadTime);
        let orderQty = Math.ceil(dailyUsage * (leadTimeDays + bufferDays));
        const moq = node.moq || 0;
        if (moq > 0 && orderQty < moq) orderQty = moq;
        const vCap = bestRoute.vehicleCapacity || 99999;
        orderQty = Math.min(orderQty, vCap);
        const actualQty = Math.min(orderQty, source.inventoryLevel);
        if (actualQty <= 0) continue;

        source.inventoryLevel -= actualQty;

        // Compute delay
        let delayDays = 0;
        if (params.geopoliticalTension) delayDays += 5;
        if (params.logisticDisruption) delayDays += 2;
        if (params.weatherEvent) delayDays += 3;
        if (params.tariffImposition) delayDays += (bestRoute.customsTime || 2);
        if (Math.random() < params.portCongestionProb) delayDays += 3;
        if (Math.random() < params.transportDelayProb) delayDays += 1;
        const ltv = bestRoute.leadTimeVariability || 0;
        if (ltv > 0) delayDays += Math.round(bestRoute.baseLeadTime * ltv * (Math.random() * 2 - 1));
        const totalLeadTime = Math.max(1, bestRoute.baseLeadTime + delayDays);

        // Costs
        const freightMult = (params.freightCostIndex || 100) / 100;
        const shipTransport = actualQty * (bestRoute.costPerUnitDistance || 0) * bestRoute.distance * freightMult * inflationMult;
        transportCostTotal += shipTransport;
        const modeFactor = CARBON_FACTORS[bestRoute.mode] || 62;
        carbonTotal += (actualQty * 0.01) * bestRoute.distance * modeFactor / 1000;

        const sourceUnitCost = source.accumulatedUnitCost || (source.supplierCostPerUnit || 10);
        const transportPerUnit = actualQty > 0 ? shipTransport / actualQty : 0;
        const shipUnitCost = sourceUnitCost + transportPerUnit;

        nextShipments.push({
          id: Math.random().toString(36).substr(2, 9),
          fromId: source.id,
          toId: node.id,
          quantity: actualQty,
          remainingDays: totalLeadTime,
          carbonKg: Math.round((actualQty * 0.01) * bestRoute.distance * modeFactor / 1000 * 100) / 100,
          transportCost: Math.round(shipTransport * 100) / 100,
          unitCost: Math.round(shipUnitCost * 100) / 100,
          materialId: input.childProductId,
        });
        newShipmentsTotal++;
        if (delayDays > 0) newShipmentsDelayed++;
        const matName = bom.products.find(p => p.id === input.childProductId)?.name || input.childProductId;
        newLogs.push(`Day ${nextDay}: ${source.name} → ${node.name} (${actualQty} ${matName}, ${totalLeadTime}d)`);
      }
    });
  }

  // ── Step 5b: Standard reorder logic ───────────────────────────────────────
  nextNodes.forEach(node => {
    if (node.status === NodeStatus.OFFLINE) return;
    // Skip factories that use BOM per-material reordering
    if (bom && node.type === NodeType.FACTORY && node.bomProductId && node.materialInventory) return;

    // Auto-heal
    if (node.status === NodeStatus.CRITICAL && node.inventoryLevel > 0 && node.type !== NodeType.RETAIL) {
      node.status = node.inventoryLevel < (node.reorderPoint || 50) ? NodeStatus.WARNING : NodeStatus.OPTIMAL;
    }
    if (node.status === NodeStatus.WARNING && node.inventoryLevel >= (node.reorderPoint || 50)) {
      node.status = NodeStatus.OPTIMAL;
    }

    // Review frequency: only check reorder on review days (default 1 = every day)
    const reviewFreq = node.reviewFrequency || 1;
    if (reviewFreq > 1 && nextDay % reviewFreq !== 0) return;

    const safetyBuffer = (node.safetyStock || 0) * 0.5;
    const effectiveReorderPoint = (node.reorderPoint || 50) + safetyBuffer;

    let shouldReorder = node.inventoryLevel < effectiveReorderPoint;
    if (!shouldReorder && params.forecastAccuracy > 70 && node.type === NodeType.RETAIL) {
      const dailyDemand = (node.demandVolume || 20) * (1 + params.demandSurge / 100);
      if (dailyDemand > 0) {
        const daysOfSupply = node.inventoryLevel / dailyDemand;
        const minLeadTime = routes.filter(r => r.toId === node.id)
          .reduce((min, r) => Math.min(min, r.baseLeadTime), 999);
        const forecastHorizon = minLeadTime * (2 - params.forecastAccuracy / 100);
        if (daysOfSupply < forecastHorizon) shouldReorder = true;
      }
    }

    if (!shouldReorder) return;

    const candidateRoutes = routes.filter(r => r.toId === node.id);
    const isEmergency = node.status === NodeStatus.CRITICAL;

    // Multi-sourcing: score all viable routes
    let selectedRoute: Route | null = null;
    if (params.multiSourcing && candidateRoutes.length > 1) {
      const scored = candidateRoutes
        .map(r => {
          const src = nextNodes.find(n => n.id === r.fromId);
          if (!src || src.status === NodeStatus.OFFLINE || src.inventoryLevel <= 0) return null;
          const stockScore = src.inventoryLevel / src.maxCapacity;
          const speedScore = 1 / Math.max(1, r.baseLeadTime);
          // Emergency: prioritize speed more heavily
          return { route: r, score: isEmergency ? speedScore * 0.8 + stockScore * 0.2 : stockScore * 0.6 + speedScore * 0.4 };
        })
        .filter((x): x is { route: Route; score: number } => x !== null);
      scored.sort((a, b) => b.score - a.score);
      selectedRoute = scored[0]?.route ?? null;
    } else {
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

    // ── Compute shipment delay ──────────────────────────────────────────────
    let delayDays = 0;
    if (params.geopoliticalTension) delayDays += 5;
    if (params.logisticDisruption) delayDays += 2;
    if (params.weatherEvent) delayDays += 3;
    if (params.tariffImposition) delayDays += (selectedRoute.customsTime || 2);
    if (Math.random() < params.portCongestionProb) delayDays += 3;
    if (Math.random() < params.transportDelayProb) delayDays += 1;

    const ltv = selectedRoute.leadTimeVariability || 0;
    if (ltv > 0) {
      const jitter = Math.round(selectedRoute.baseLeadTime * ltv * (Math.random() * 2 - 1));
      delayDays += jitter;
    }

    // Order quantity with bullwhip + MOQ enforcement + vehicle capacity cap
    // Tier-aware: if tierBullwhipAmplification is on, bullwhip compounds per tier hop
    // (each upstream tier magnifies the demand signal distortion).
    const tierDist = node.supplyChainTier != null ? Math.max(0, node.supplyChainTier) : 1;
    const effectiveBullwhip = (params.tierBullwhipAmplification && node.type !== NodeType.RETAIL)
      ? Math.pow(params.bullwhipFactor, tierDist)
      : (node.type !== NodeType.RETAIL ? params.bullwhipFactor : 1);
    let orderQty = Math.ceil((node.orderQuantity || 100) * effectiveBullwhip);
    // Enforce MOQ
    const moq = node.moq || 0;
    if (moq > 0 && orderQty < moq) orderQty = moq;
    // Cap at vehicle capacity
    const vCap = selectedRoute.vehicleCapacity || 99999;
    orderQty = Math.min(orderQty, vCap);
    const actualQty = Math.min(orderQty, source.inventoryLevel);

    source.inventoryLevel -= actualQty;
    const totalLeadTime = Math.max(1, selectedRoute.baseLeadTime + delayDays);

    // Transport cost: qty × costPerUnitDistance × distance × freightIndex
    const freightMult = (params.freightCostIndex || 100) / 100;
    const shipmentTransportCost = actualQty * (selectedRoute.costPerUnitDistance || 0) * selectedRoute.distance * freightMult * inflationMult;
    transportCostTotal += shipmentTransportCost;

    // Tariff cost
    let shipmentTariffCost = 0;
    if (params.tariffImposition && (params.tariffRate ?? 10) > 0) {
      const unitCost = params.procurementCost || 10;
      shipmentTariffCost = actualQty * unitCost * ((params.tariffRate ?? 10) / 100);
      tariffCostTotal += shipmentTariffCost;
    }

    // Carbon emissions
    const modeFactor = CARBON_FACTORS[selectedRoute.mode] || 62;
    const shipmentCarbonKg = (actualQty * 0.01) * selectedRoute.distance * modeFactor / 1000;
    carbonTotal += shipmentCarbonKg;

    // Expediting cost for emergency orders
    let shipExpediting = 0;
    if (isEmergency) {
      shipExpediting = actualQty * (params.expeditingCost || 150) * 0.01; // 1% of expediting rate per unit
      expeditingCostTotal += shipExpediting;
    }

    // Unit cost carried through the chain: source cost + transport per unit + tariff per unit
    const sourceUnitCost = source.accumulatedUnitCost || (source.supplierCostPerUnit || 10);
    const transportPerUnit = actualQty > 0 ? shipmentTransportCost / actualQty : 0;
    const tariffPerUnit = actualQty > 0 ? shipmentTariffCost / actualQty : 0;
    const shipmentUnitCost = sourceUnitCost + transportPerUnit + tariffPerUnit;

    nextShipments.push({
      id: Math.random().toString(36).substr(2, 9),
      fromId: source.id,
      toId: node.id,
      quantity: actualQty,
      remainingDays: totalLeadTime,
      carbonKg: Math.round(shipmentCarbonKg * 100) / 100,
      tariffCost: Math.round(shipmentTariffCost * 100) / 100,
      transportCost: Math.round(shipmentTransportCost * 100) / 100,
      unitCost: Math.round(shipmentUnitCost * 100) / 100,
    });
    newShipmentsTotal++;
    if (delayDays > 0) newShipmentsDelayed++;
    newLogs.push(`Day ${nextDay}: ${source.name} → ${node.name} (${actualQty} units, ${totalLeadTime}d)`);
  });

  // ── Step 6: Working capital cost ──────────────────────────────────────────
  const inventoryValue = nextNodes.reduce((s, n) => s + n.inventoryLevel * (n.accumulatedUnitCost || n.supplierCostPerUnit || 10), 0);
  const transitValue = nextShipments.reduce((s, sh) => s + sh.quantity * (sh.unitCost || 10), 0);
  const wcRate = ((params.workingCapitalCost || 8) + (params.interestRateChange || 0)) / 100 / 365;
  const dailyWCCost = (inventoryValue + transitValue) * wcRate;

  // ── Build snapshot ────────────────────────────────────────────────────────
  const r2 = (v: number) => Math.round(v * 100) / 100;

  const snapshot: HistorySnapshot = {
    day: nextDay,
    nodes: nextNodes.map(n => ({ id: n.id, inv: n.inventoryLevel, status: n.status })),
    shipmentsInFlight: nextShipments.length,
    unitsInFlight: nextShipments.reduce((sum, s) => sum + s.quantity, 0),
    demandTotal,
    demandFulfilled,
    newShipmentsTotal,
    newShipmentsDelayed,
    holdingCost: r2(holdingCost),
    stockoutCost: r2(stockoutCost),
    disruptionCounts,
    factoryUtilization,
    expiredUnits,
    defectUnits,
    tariffCost: r2(tariffCostTotal),
    carbonEmissions: r2(carbonTotal),
    transportCost: r2(transportCostTotal),
    productionCost: r2(productionCostTotal),
    warehousingCost: r2(warehousingCostTotal),
    revenue: r2(revenueTotal),
    cogs: r2(cogsTotal),
    workingCapitalCost: r2(dailyWCCost),
    expeditingCost: r2(expeditingCostTotal),
    // BOM enrichments
    bomRiskScores: bom ? computeBOMRiskScores(nextNodes, bom, explodedDemand) : undefined,
    demandExplosion: bom ? Array.from(explodedDemand.entries()).map(([productId, requiredQty]) => {
      const suppliers = nextNodes.filter(n => n.bomProductId === productId);
      const availableQty = suppliers.reduce((s, n) => s + n.inventoryLevel, 0);
      return { productId, requiredQty: r2(requiredQty), availableQty };
    }) : undefined,
    materialBottlenecks: materialBottlenecks.length > 0 ? materialBottlenecks : undefined,
    // Supply chain tier metrics
    tierMetrics: computeTierMetrics(nextNodes, nextShipments, routes),
    tierAlerts: computeTierAlerts(nextNodes, routes),
  };

  return { nextNodes, nextShipments, newLogs, snapshot };
}

// ── Tier Metrics: per-tier aggregation for analytics ─────────────────────────
function computeTierMetrics(
  nodes: SupplyNode[],
  shipments: InTransitShipment[],
  routes: Route[],
): Record<number, import('./types').TierMetrics> | undefined {
  const tieredNodes = nodes.filter(n => n.supplyChainTier !== undefined);
  if (tieredNodes.length === 0) return undefined;

  const metrics: Record<number, import('./types').TierMetrics> = {};

  // Group nodes by tier
  const byTier: Record<number, SupplyNode[]> = {};
  for (const n of tieredNodes) {
    const t = n.supplyChainTier!;
    if (!byTier[t]) byTier[t] = [];
    byTier[t].push(n);
  }

  for (const [tierStr, tierNodes] of Object.entries(byTier)) {
    const tier = Number(tierStr);

    // Average lead time of routes FROM this tier to next tier downstream
    const outboundRoutes = routes.filter(r => {
      const src = nodes.find(n => n.id === r.fromId);
      return src?.supplyChainTier === tier;
    });
    const avgLeadTime = outboundRoutes.length > 0
      ? outboundRoutes.reduce((s, r) => s + r.baseLeadTime, 0) / outboundRoutes.length
      : 0;

    // Disruption count: nodes not OPTIMAL
    const disruptionCount = tierNodes.filter(n => n.status !== NodeStatus.OPTIMAL).length;

    // Risk score: 0-100 based on status + days-of-supply
    const riskScore = Math.round(
      tierNodes.reduce((sum, n) => {
        const statusScore = n.status === 'OFFLINE' ? 100
          : n.status === 'CRITICAL' ? 75
          : n.status === 'WARNING' ? 30 : 0;
        const daysOfSupply = n.reorderPoint > 0 ? n.inventoryLevel / Math.max(1, n.reorderPoint) : 1;
        const coverageScore = Math.max(0, 100 - daysOfSupply * 20);
        return sum + statusScore * 0.6 + coverageScore * 0.4;
      }, 0) / tierNodes.length
    );

    // Cost: holding cost contribution from this tier
    const totalCost = tierNodes.reduce((s, n) =>
      s + n.inventoryLevel * (n.accumulatedUnitCost || n.supplierCostPerUnit || 10) * 0.0001, 0);

    // Fill rate from shipments arriving at this tier's nodes
    const tierNodeIds = new Set(tierNodes.map(n => n.id));
    const tierShipments = shipments.filter(s => s.toId && tierNodeIds.has(s.toId));
    const fillRate = tierNodes.length > 0
      ? tierNodes.filter(n => n.status !== 'CRITICAL' && n.inventoryLevel > 0).length / tierNodes.length * 100
      : 100;

    metrics[tier] = {
      nodeCount: tierNodes.length,
      totalInventory: Math.round(tierNodes.reduce((s, n) => s + n.inventoryLevel, 0)),
      totalCost: Math.round(totalCost * 100) / 100,
      avgLeadTime: Math.round(avgLeadTime * 10) / 10,
      disruptionCount,
      fillRate: Math.round(fillRate),
      riskScore,
    };
  }

  return metrics;
}

// ── Tier Alerts: disruptions with estimated impact delay to focal ─────────────
function computeTierAlerts(
  nodes: SupplyNode[],
  routes: Route[],
): import('./types').TierAlert[] | undefined {
  const focalNode = nodes.find(n => n.isFocalCompany);
  if (!focalNode) return undefined;

  const alerts: import('./types').TierAlert[] = [];
  for (const n of nodes) {
    if (n.supplyChainTier == null || n.supplyChainTier <= 0) continue;
    if (n.status === NodeStatus.OFFLINE || n.status === NodeStatus.CRITICAL) {
      const impactDays = estimateImpactDelay(n.id, focalNode.id, routes);
      alerts.push({
        tier: n.supplyChainTier,
        nodeId: n.id,
        nodeName: n.name,
        estimatedImpactDays: impactDays > 0 ? impactDays : 0,
        type: n.status === NodeStatus.OFFLINE ? 'disruption' : 'stockout',
      });
    }
  }
  return alerts.length > 0 ? alerts : undefined;
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<SupplyNode[]>(INITIAL_NODES);
  const [routes, setRoutes] = useState<Route[]>(INITIAL_ROUTES);
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const [selectedNode, setSelectedNode] = useState<SupplyNode | null>(null);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [industryConfig, setIndustryConfig] = useState<IndustryConfig>(PRESET_INDUSTRIES[0]);
  const [lowStockThreshold, setLowStockThreshold] = useState(20);
  const [viewingRun, setViewingRun] = useState<any | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [bom, setBom] = useState<BillOfMaterials | null>(null);
  const [routeIntelState, setRouteIntelState] = useState<RouteIntelligenceState>({
    events: [], newsItems: [], affectedRoutes: [], suggestions: [],
    autoPauseOnCritical: true, autoApplyMinor: false,
  });
  const routeIntelStateRef = useRef<RouteIntelligenceState>(routeIntelState);
  const globeRef = useRef<HTMLDivElement>(null);
  const [costVarianceThreshold, setCostVarianceThreshold] = useState(15);

  // Scroll content area to top whenever user switches tabs
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // --- SESSION-LIVE SIMULATION ENGINE ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [day, setDay] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [shipments, setShipments] = useState<InTransitShipment[]>([]);

  // Snapshot of node state before simulation — used by resetSimulation to restore original values
  const preSimNodesRef = useRef<SupplyNode[] | null>(null);
  // Tracks the set of node IDs to detect when a new network is imported
  const nodeIdFingerprintRef = useRef<string>('');

  // Refs so the interval callback always reads the latest state without stale closures
  const nodesRef = useRef<SupplyNode[]>(nodes);
  const shipmentsRef = useRef<InTransitShipment[]>(shipments);
  const dayRef = useRef<number>(day);
  const routesRef = useRef<Route[]>(routes);
  const paramsRef = useRef<SimulationParams>(params);
  const industryConfigRef = useRef<IndustryConfig>(industryConfig);
  const bomRef = useRef<BillOfMaterials | null>(bom);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  // When the set of node IDs changes (e.g. Excel import), invalidate the pre-sim snapshot
  // so resetSimulation restores the new nodes instead of the old ones.
  useEffect(() => {
    const fingerprint = nodes.map(n => n.id).sort().join(',');
    if (nodeIdFingerprintRef.current !== '' && nodeIdFingerprintRef.current !== fingerprint) {
      preSimNodesRef.current = null;
    }
    nodeIdFingerprintRef.current = fingerprint;
  }, [nodes]);
  useEffect(() => { shipmentsRef.current = shipments; }, [shipments]);
  useEffect(() => { dayRef.current = day; }, [day]);
  useEffect(() => { routesRef.current = routes; }, [routes]);
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { industryConfigRef.current = industryConfig; }, [industryConfig]);
  useEffect(() => { bomRef.current = bom; }, [bom]);
  useEffect(() => { routeIntelStateRef.current = routeIntelState; }, [routeIntelState]);

  // ── Auto-reclassify supply chain tiers whenever nodes or routes change ──
  // Runs BFS from the focal company node; skips tierLocked nodes.
  useEffect(() => {
    if (nodes.length === 0) return;
    const reclassified = classifySupplyChainTiers(nodes, routes);
    // Only update state if something actually changed (avoid infinite loops)
    const changed = reclassified.some(
      (n, i) => n.supplyChainTier !== nodes[i]?.supplyChainTier
    );
    if (changed) setNodes(reclassified);
  }, [routes, nodes.map(n => n.isFocalCompany).join(','), nodes.map(n => n.tierLocked).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

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
        bom: bomRef.current,
        simulation: {
          day: dayRef2.current,
          speed: speedRef.current,
          history: historyRef.current,
          logs: logsRef.current.slice(0, 200),
          shipments: shipmentsRef2.current,
          preSimNodes: preSimNodesRef.current,
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
    // Snapshot node state at the start of the very first play so reset can restore it
    if (preSimNodesRef.current === null) {
      preSimNodesRef.current = nodesRef.current.map(n => ({ ...n }));
    }
    const interval = setInterval(() => {
      const nextDay = dayRef.current + 1;

      // Apply event effects to routes (working copy, originals not mutated)
      const intelState = routeIntelStateRef.current;
      const activeEvents = intelState.events.filter(e => e.active);
      const workingRoutes = activeEvents.length > 0
        ? applyEventEffectsToRoutes(routesRef.current, activeEvents, nodesRef.current)
        : routesRef.current;

      const { nextNodes, nextShipments, newLogs, snapshot } = computeNextSimulationState(
        nodesRef.current,
        shipmentsRef.current,
        workingRoutes,
        paramsRef.current,
        nextDay,
        industryConfigRef.current,
        bomRef.current
      );

      // Log active event effects periodically (every 10 days)
      if (activeEvents.length > 0 && nextDay % 10 === 1) {
        const affectedCount = intelState.affectedRoutes.length;
        if (affectedCount > 0) {
          newLogs.push(`Day ${nextDay}: ${activeEvents.length} active event(s) affecting ${affectedCount} route(s).`);
        }
      }

      // Critical event auto-pause
      const hasCritical = activeEvents.some(e => e.severity === 'critical');
      if (hasCritical && intelState.autoPauseOnCritical) {
        setIsPlaying(false);
        setActiveTab('intelligence');
        newLogs.push(`Day ${nextDay}: CRITICAL EVENT detected — simulation paused.`);
      }

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
    // Restore nodes to their pre-simulation state (inventory, status, etc.)
    if (preSimNodesRef.current) {
      setNodes(preSimNodesRef.current.map(n => ({ ...n })));
      preSimNodesRef.current = null;
    }
  };

  const handleWizardComplete = (config: IndustryConfig) => {
    setIndustryConfig(config);
    const starter = getStarterNetwork(config.id);
    setRoutes(starter.routes);
    // Auto-load BOM template and map nodes to BOM products
    const industryBom = getIndustryBOM(config.id);
    const baseNodes = industryBom
      ? autoMapNodesToBOM(starter.nodes, industryBom)
      : starter.nodes;
    // Classify supply chain tiers based on routes
    const tieredNodes = classifySupplyChainTiers(baseNodes, starter.routes);
    if (industryBom) {
      setBom(industryBom);
    } else {
      setBom(null);
    }
    setNodes(tieredNodes);
    resetSimulation();
    setShowWizard(false);
    setActiveTab('dashboard');
    if (user?.id) localStorage.setItem(`sc_wizard_done_${user.id}`, '1');
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
            const loadedRoutes: Route[] = data.routes || [];
            // Backfill new supply chain tier fields on loaded nodes
            const loadedNodes: SupplyNode[] = (data.nodes || []).map((n: SupplyNode) => ({
              supplyChainTier: undefined,
              isFocalCompany: false,
              tierLocked: false,
              ...n,
            }));
            const tieredNodes = classifySupplyChainTiers(loadedNodes, loadedRoutes);
            setNodes(tieredNodes);
            setRoutes(loadedRoutes);

            const saved = data.params || {};

            // Restore simulation params (backfill new tier params if missing)
            if (saved.simulationParams) setParams(prev => ({
              ...prev,
              tierVisibilityDecay: 20,
              tierBullwhipAmplification: true,
              ...saved.simulationParams,
            }));

            // Restore industry config
            if (saved.industryConfig) {
              const match = PRESET_INDUSTRIES.find((p: IndustryConfig) => p.id === saved.industryConfig.id);
              setIndustryConfig(match || saved.industryConfig);
            }

            // Restore settings
            if (saved.lowStockThreshold != null) setLowStockThreshold(saved.lowStockThreshold);
            if (saved.costVarianceThreshold != null) setCostVarianceThreshold(saved.costVarianceThreshold);

            // Restore BOM
            if (saved.bom) setBom(saved.bom);

            // Restore simulation progress
            if (saved.simulation) {
              const sim = saved.simulation;
              if (sim.day > 0) setDay(sim.day);
              if (sim.speed) setSpeed(sim.speed);
              if (sim.history?.length > 0) setHistory(sim.history);
              if (sim.logs?.length > 0) setLogs(sim.logs);
              if (sim.shipments?.length > 0) setShipments(sim.shipments);
              // Restore pre-simulation snapshot so reset works across sessions
              if (sim.preSimNodes?.length > 0) {
                preSimNodesRef.current = sim.preSimNodes;
              }
            }

            networkIdRef.current = latest.id;
            initialLoadDone.current = true;
            // Backfill flag so users with saved networks never see wizard again
            if (user?.id) localStorage.setItem(`sc_wizard_done_${user.id}`, '1');
            return;
          }
        }
      } catch {}

      // 2. Show industry wizard only for users who haven't completed it
      const wizardDone = user?.id && localStorage.getItem(`sc_wizard_done_${user.id}`);
      if (!wizardDone) setShowWizard(true);
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
    { label: 'Industry', done: workflowState.industryConfigured, tab: 'industry' },
    { label: 'Network',  done: workflowState.networkBuilt,       tab: 'builder' },
    { label: 'Risk',     done: workflowState.riskConfigured,     tab: 'simulation' },
    { label: 'Simulate', done: workflowState.simulationRun,      tab: 'simulation' },
    { label: 'Analyze',  done: workflowState.analysisReady,      tab: 'analytics' },
    { label: 'Optimize', done: false,                            tab: 'optimization' },
  ];

  const handleLoadRun = (run: any) => {
    setViewingRun(run);
    setActiveTab('analytics');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Workflow Progress Strip */}
            <div className="bg-white/5 rounded-2xl border border-white/5 p-3 md:p-4 flex items-center justify-between gap-2 overflow-x-auto">
              {workflowSteps.map((step, i) => (
                <React.Fragment key={step.label}>
                  <button onClick={() => setActiveTab(step.tab)} className="flex flex-col items-center gap-1 group">
                    {step.done
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: currentTheme.accent }} />
                      : <Circle className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />}
                    <span className="text-[9px] uppercase tracking-widest font-bold" style={step.done ? { color: currentTheme.accent } : { color: 'rgba(255,255,255,0.3)' }}>{step.label}</span>
                  </button>
                  {i < workflowSteps.length - 1 && (
                    <div className="flex-1 h-px" style={{ backgroundColor: step.done ? currentTheme.accentMuted : 'rgba(255,255,255,0.1)' }} />
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
        return <NetworkBuilder nodes={nodes} routes={routes} setNodes={setNodes} setRoutes={setRoutes} industryConfig={industryConfig} bom={bom} setBom={setBom} />;
      case 'bom':
        return <BOMView bom={bom} setBom={setBom} nodes={nodes} setNodes={setNodes} history={history} industryId={industryConfig.id} accentColor={currentTheme.accent} />;
      case 'simulation':
        return (
          <SimulationEngine
            nodes={nodes} routes={routes} setNodes={setNodes}
            day={day} isPlaying={isPlaying} setIsPlaying={setIsPlaying}
            speed={speed} setSpeed={setSpeed} logs={logs}
            shipments={shipments} resetSimulation={resetSimulation}
            params={params} setParams={setParams} industryConfig={industryConfig}
            history={history}
          />
        );
      case 'analytics':
        return (
          <div className="space-y-4">
            {viewingRun && (
              <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-sm text-blue-300 flex-1">
                  Viewing saved run: <span className="font-bold text-white">{viewingRun.name}</span>
                  <span className="text-blue-400/60 ml-2">&middot; {viewingRun.total_days} days</span>
                </span>
                <button
                  onClick={() => setViewingRun(null)}
                  className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                >
                  Return to Live
                </button>
              </div>
            )}
            <AnalyticsView
              history={viewingRun ? viewingRun.history : history}
              nodes={viewingRun ? viewingRun.nodes_snapshot : nodes}
              industryConfig={industryConfig}
            />
          </div>
        );
      case 'intelligence':
        return (
          <RouteIntelligenceView
            state={routeIntelState}
            setState={setRouteIntelState}
            routes={routes}
            nodes={nodes}
            setRoutes={setRoutes}
            onPauseSimulation={() => setIsPlaying(false)}
            addLog={(msg: string) => setLogs(prev => [msg, ...prev].slice(0, 50))}
            day={day}
          />
        );
      case 'optimization':
        return <OptimizationView nodes={nodes} routes={routes} history={history} params={params} industryConfig={industryConfig} analysisReady={workflowState.analysisReady} />;
      case 'industry':
        return <IndustryView
          industryConfig={industryConfig} setIndustryConfig={setIndustryConfig}
          setNodes={setNodes} setRoutes={setRoutes}
          resetSimulation={resetSimulation}
          onOpenWizard={() => setShowWizard(true)}
        />;
      case 'history':
        return <SimulationHistoryView industryConfig={industryConfig} onLoadRun={handleLoadRun} />;
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
    { id: 'industry', label: 'Industry', icon: Factory },
    { id: 'builder', label: 'Builder', icon: Network },
    { id: 'bom', label: 'BOM', icon: Layers },
    { id: 'simulation', label: 'Simulation', icon: PlayCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'optimization', label: 'Optimize', icon: Zap },
    { id: 'intelligence', label: 'Intelligence', icon: Radar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentTheme = INDUSTRY_THEMES[industryConfig.id] || INDUSTRY_THEMES.solar;

  return (
    <ThemeProvider industryId={industryConfig.id}>
      {showWizard && <IndustryWizard onComplete={handleWizardComplete} />}
      <div className="flex min-h-screen bg-black">
        {/* Sidebar — hidden below md (768px), icon-only at md, full at lg */}
        <nav className="hidden md:flex w-20 lg:w-64 border-r border-white/5 flex-col shrink-0">
          <div className="p-4 lg:p-8 flex items-center justify-center lg:justify-start"><h1 className="text-white font-black text-2xl tracking-tighter hidden lg:flex items-center gap-2"><Zap className="w-8 h-8" style={{ fill: currentTheme.accent, color: currentTheme.accent }} />ChainSim</h1><Zap className="lg:hidden w-7 h-7" style={{ fill: currentTheme.accent, color: currentTheme.accent }} /></div>
          <div className="flex-1 px-2 lg:px-4 space-y-2">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-center lg:justify-start gap-4 px-2 lg:px-4 py-3 lg:py-4 rounded-2xl transition-all min-h-[44px] ${activeTab === item.id ? 'text-white' : 'text-white/40'}`}
                style={activeTab === item.id ? { backgroundColor: currentTheme.accentLight, borderLeft: `3px solid ${currentTheme.accent}` } : {}}
              >
                <item.icon className="w-5 h-5 shrink-0" /><span className="hidden lg:block text-[10px] font-bold uppercase">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-14 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-12 shrink-0">
            {/* Logo — visible only on mobile where sidebar is hidden */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: currentTheme.accent }}>
                <Zap className="w-4 h-4 text-black fill-black" />
              </div>
              <span className="text-white font-black tracking-tighter text-base">CHAIN<span className="text-white/40 font-light">SIM</span></span>
            </div>
            {/* Session info — hidden on mobile to avoid clutter */}
            <p className="hidden md:block text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">
              {user?.name || user?.email} • <span style={{ color: currentTheme.accent }}>{industryConfig.name}</span>
            </p>
            <div className="flex items-center gap-2">
              <DeployMenu
                nodes={nodes}
                routes={routes}
                industryConfig={industryConfig}
                params={params}
                history={history}
                day={day}
              />
              <button
                onClick={logout}
                title="Sign out"
                className="p-2 text-white/40 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
          <div ref={contentRef} className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-8 lg:pb-12 custom-scrollbar">{renderContent()}</div>
        </main>

        {/* Bottom nav — visible below md (768px): phones + small tablets in portrait */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/5 flex">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex items-center justify-center min-h-[56px] transition-colors ${activeTab === item.id ? '' : 'text-white/30'}`}
              style={activeTab === item.id ? { color: currentTheme.accent } : {}}
            >
              <item.icon className="w-5 h-5" />
            </button>
          ))}
        </nav>
      </div>
    </ThemeProvider>
  );
}

export default App;
