import { SupplyNode, Route, NodeType, NodeStatus, TransportMode, SimulationParams } from '../types';

// Coordinate helper — maps lat/lng to the internal x/y canvas space used by the Globe
const coords = (lat: number, lng: number) => ({
  x: (lng + 180) * (800 / 360),
  y: (90 - lat) * (400 / 180),
  lat,
  lng,
});

// ─── 11 Supply Chain Nodes ────────────────────────────────────────────────────
// Based on JinkoSolar / First Solar case study data
// Metrics sourced from: Shanxi Lighthouse factory (22→7 day cycle), Saudi 10GW hub,
// UFLPA compliance requirements, US 50GW panic stockpile (2025), AD/CVD 274% tariffs

export const SOLAR_NODES: SupplyNode[] = [

  // ── SUPPLIERS ──────────────────────────────────────────────────────────────

  {
    id: 'POLYSI_CHINA',
    name: 'Xinjiang Polysilicon',
    type: NodeType.SUPPLIER,
    status: NodeStatus.OPTIMAL,
    location: 'Xinjiang, China',
    coordinates: coords(41.0, 86.0),
    // ~95% of global polysilicon from China; $8.5/kg case study price
    inventoryLevel: 800,
    maxCapacity: 1000,
    reorderPoint: 200,
    orderQuantity: 400,
    safetyStock: 150,
    targetServiceLevel: 88,
    reviewFrequency: 3,
    moq: 100,
    holdingCost: 1,
    obsolescenceRate: 0.005,
    shelfLife: 730,
    supplierLeadTime: 5,
    supplierReliability: 82,    // Low: high UFLPA seizure risk
    supplierCostPerUnit: 9,     // $8.5–9/kg polysilicon (case study)
    supplierDisruptionProb: 0.08,
    supplierRecoveryTime: 21,
  },
  {
    id: 'POLYSI_COMPLIANT',
    name: 'UFLPA-Compliant Supplier (DE)',
    type: NodeType.SUPPLIER,
    status: NodeStatus.OPTIMAL,
    location: 'Saxony, Germany',
    coordinates: coords(51.0, 10.0),
    // German quartzite sourcing — traceable, certified, premium cost
    inventoryLevel: 250,
    maxCapacity: 500,
    reorderPoint: 80,
    orderQuantity: 180,
    safetyStock: 60,
    targetServiceLevel: 99,
    reviewFrequency: 7,
    moq: 50,
    holdingCost: 2,
    obsolescenceRate: 0.003,
    shelfLife: 730,
    supplierLeadTime: 14,
    supplierReliability: 98,    // High: fully traceable chain-of-custody via Circulor
    supplierCostPerUnit: 14,    // 65% premium over Xinjiang for compliance
    supplierDisruptionProb: 0.02,
    supplierRecoveryTime: 7,
  },

  // ── FACTORIES ──────────────────────────────────────────────────────────────

  {
    id: 'FACTORY_SHANXI',
    name: 'JinkoSolar Shanxi Lighthouse',
    type: NodeType.FACTORY,
    status: NodeStatus.OPTIMAL,
    location: 'Shanxi, China',
    coordinates: coords(37.5, 112.0),
    // WEF Lighthouse factory: 5G + AI + AGVs; 22→7 day cycle (68% improvement)
    inventoryLevel: 600,
    maxCapacity: 1000,
    reorderPoint: 150,
    orderQuantity: 350,
    safetyStock: 100,
    targetServiceLevel: 97,
    reviewFrequency: 1,
    moq: 50,
    holdingCost: 1,
    obsolescenceRate: 0.02,     // N-type TOPCon disrupts P-type PERC stock
    shelfLife: 365,
    productionCapacity: 180,    // High throughput — 68% lead time reduction
    yieldRate: 97,              // AI visual inspection → defect rate ~3% (vs 5% baseline)
    setupTime: 2,               // Fast changeover — automated lines
    batchSize: 50,
    throughputCapacity: 1000,
    automationLevel: 5,         // Maximum — Lighthouse designation
    utilizationRate: 88,
    defectRate: 3,
  },
  {
    id: 'FACTORY_MALAYSIA',
    name: 'Malaysia Assembly Hub',
    type: NodeType.FACTORY,
    status: NodeStatus.OPTIMAL,
    location: 'Penang, Malaysia',
    coordinates: coords(3.1, 101.7),
    // Legacy Southeast Asia tariff-avoidance plant — now hit by AD/CVD up to 274%
    inventoryLevel: 350,
    maxCapacity: 700,
    reorderPoint: 100,
    orderQuantity: 220,
    safetyStock: 80,
    targetServiceLevel: 93,
    reviewFrequency: 2,
    moq: 40,
    holdingCost: 1,
    obsolescenceRate: 0.02,
    shelfLife: 365,
    productionCapacity: 100,
    yieldRate: 93,              // 5% scrap baseline (case study) + less automation
    setupTime: 6,
    batchSize: 40,
    throughputCapacity: 600,
    automationLevel: 3,
    utilizationRate: 75,
    defectRate: 5,
  },
  {
    id: 'FACTORY_SAUDI',
    name: 'Saudi Arabia Neutral Bridge',
    type: NodeType.FACTORY,
    status: NodeStatus.OPTIMAL,
    location: 'Tabuk, Saudi Arabia',
    coordinates: coords(28.0, 36.5),
    // JinkoSolar 10 GW Saudi hub — bypasses US tariffs; Saudi-origin exempt
    inventoryLevel: 300,
    maxCapacity: 600,
    reorderPoint: 90,
    orderQuantity: 200,
    safetyStock: 70,
    targetServiceLevel: 95,
    reviewFrequency: 1,
    moq: 40,
    holdingCost: 1,
    obsolescenceRate: 0.015,
    shelfLife: 365,
    productionCapacity: 120,    // 10 GW nameplate capacity (scaled for sim)
    yieldRate: 95,
    setupTime: 4,
    batchSize: 45,
    throughputCapacity: 800,
    automationLevel: 4,
    utilizationRate: 70,        // Initially underutilized — ramping up
    defectRate: 4,
  },

  // ── WAREHOUSES ─────────────────────────────────────────────────────────────

  {
    id: 'WH_SHENZHEN',
    name: 'Shenzhen Export Hub',
    type: NodeType.WAREHOUSE,
    status: NodeStatus.OPTIMAL,
    location: 'Shenzhen, China',
    coordinates: coords(22.5, 114.1),
    // China's primary maritime export staging point for modules
    inventoryLevel: 500,
    maxCapacity: 900,
    reorderPoint: 150,
    orderQuantity: 350,
    safetyStock: 120,
    targetServiceLevel: 95,
    reviewFrequency: 1,
    moq: 50,
    holdingCost: 1,
    obsolescenceRate: 0.01,
    shelfLife: 365,
    throughputCapacity: 800,
    automationLevel: 4,
    processingTime: 1,
  },
  {
    id: 'WH_JEDDAH',
    name: 'Jeddah Saudi Hub',
    type: NodeType.WAREHOUSE,
    status: NodeStatus.OPTIMAL,
    location: 'Jeddah, Saudi Arabia',
    coordinates: coords(21.5, 39.2),
    // Neutral bridge staging point — Saudi-origin modules for US and EU
    inventoryLevel: 280,
    maxCapacity: 600,
    reorderPoint: 100,
    orderQuantity: 250,
    safetyStock: 80,
    targetServiceLevel: 95,
    reviewFrequency: 1,
    moq: 40,
    holdingCost: 1,
    obsolescenceRate: 0.01,
    shelfLife: 365,
    throughputCapacity: 500,
    automationLevel: 3,
    processingTime: 1,
  },

  // ── DISTRIBUTION CENTERS ───────────────────────────────────────────────────

  {
    id: 'DC_LOS_ANGELES',
    name: 'L.A. Import DC',
    type: NodeType.DISTRIBUTION_CENTER,
    status: NodeStatus.OPTIMAL,
    location: 'Los Angeles, USA',
    coordinates: coords(34.0, -118.2),
    // Reflects US ~50 GW panic stockpile (early 2025); high holding cost, obsolescence risk
    inventoryLevel: 900,
    maxCapacity: 1500,
    reorderPoint: 200,
    orderQuantity: 450,
    safetyStock: 160,
    targetServiceLevel: 96,
    reviewFrequency: 1,
    moq: 50,
    holdingCost: 3,             // Expensive US warehousing
    obsolescenceRate: 0.03,     // High — P-type stock at risk of N-type obsolescence
    shelfLife: 365,
    throughputCapacity: 900,
    automationLevel: 3,
    processingTime: 1,
    laborAvailability: 85,
  },
  {
    id: 'DC_ROTTERDAM',
    name: 'Rotterdam European Hub',
    type: NodeType.DISTRIBUTION_CENTER,
    status: NodeStatus.OPTIMAL,
    location: 'Rotterdam, Netherlands',
    coordinates: coords(51.9, 4.5),
    // Europe's largest solar import gateway
    inventoryLevel: 400,
    maxCapacity: 800,
    reorderPoint: 150,
    orderQuantity: 300,
    safetyStock: 100,
    targetServiceLevel: 95,
    reviewFrequency: 1,
    moq: 40,
    holdingCost: 2,
    obsolescenceRate: 0.01,
    shelfLife: 365,
    throughputCapacity: 700,
    automationLevel: 4,
    processingTime: 1,
    laborAvailability: 90,
  },

  // ── RETAIL / END CUSTOMERS ─────────────────────────────────────────────────

  {
    id: 'RETAIL_US',
    name: 'US Utility Customer',
    type: NodeType.RETAIL,
    status: NodeStatus.OPTIMAL,
    location: 'Texas, USA',
    coordinates: coords(31.0, -97.5),
    // Hyperscaler utility contracts (Microsoft, Google, Amazon) — First Solar 50.1 GW backlog
    inventoryLevel: 180,
    maxCapacity: 500,
    reorderPoint: 80,
    orderQuantity: 150,
    safetyStock: 50,
    targetServiceLevel: 98,
    reviewFrequency: 1,
    moq: 30,
    holdingCost: 2,
    obsolescenceRate: 0.005,
    shelfLife: 1825,            // Modules last 25+ years in field
    demandVolume: 35,           // Consistent hyperscaler off-take
    demandVariability: 20,
    priceElasticity: -0.8,      // Relatively inelastic — long-term contracts
    leadTimeTolerance: 30,
  },
  {
    id: 'RETAIL_EU',
    name: 'EU Utility Customer',
    type: NodeType.RETAIL,
    status: NodeStatus.OPTIMAL,
    location: 'Baden-Württemberg, Germany',
    coordinates: coords(48.5, 9.0),
    // European Green Deal utility buyers — slightly more price elastic
    inventoryLevel: 220,
    maxCapacity: 500,
    reorderPoint: 70,
    orderQuantity: 130,
    safetyStock: 45,
    targetServiceLevel: 97,
    reviewFrequency: 1,
    moq: 30,
    holdingCost: 2,
    obsolescenceRate: 0.005,
    shelfLife: 1825,
    demandVolume: 25,
    demandVariability: 12,
    priceElasticity: -1.0,
    leadTimeTolerance: 45,
  },
];

// ─── 12 Routes ────────────────────────────────────────────────────────────────

export const SOLAR_ROUTES: Route[] = [
  {
    id: 'POLYSI_CHINA__FACTORY_SHANXI',
    fromId: 'POLYSI_CHINA',
    toId: 'FACTORY_SHANXI',
    mode: TransportMode.RAIL,
    distance: 2500,
    baseLeadTime: 3,            // Domestic rail — fast
    leadTimeVariability: 0.10,
    costPerUnitDistance: 0.002,
    vehicleCapacity: 300,
    shipmentFrequency: 2,
    fuelPrice: 1.2,
    customsTime: 0,
    disruptionProb: 0.02,
  },
  {
    id: 'POLYSI_COMPLIANT__FACTORY_SHANXI',
    fromId: 'POLYSI_COMPLIANT',
    toId: 'FACTORY_SHANXI',
    mode: TransportMode.SEA,
    distance: 9000,
    baseLeadTime: 14,           // Europe to China — premium but UFLPA-clean
    leadTimeVariability: 0.15,
    costPerUnitDistance: 0.003,
    vehicleCapacity: 500,
    shipmentFrequency: 1,
    fuelPrice: 1.5,
    customsTime: 1,
    disruptionProb: 0.04,
  },
  {
    id: 'FACTORY_SHANXI__WH_SHENZHEN',
    fromId: 'FACTORY_SHANXI',
    toId: 'WH_SHENZHEN',
    mode: TransportMode.ROAD,
    distance: 1800,
    baseLeadTime: 3,
    leadTimeVariability: 0.10,
    costPerUnitDistance: 0.003,
    vehicleCapacity: 200,
    shipmentFrequency: 3,
    fuelPrice: 1.3,
    customsTime: 0,
    disruptionProb: 0.01,
  },
  {
    id: 'FACTORY_SHANXI__FACTORY_MALAYSIA',
    fromId: 'FACTORY_SHANXI',
    toId: 'FACTORY_MALAYSIA',
    mode: TransportMode.SEA,
    distance: 4500,
    baseLeadTime: 8,            // Semi-finished goods for final assembly
    leadTimeVariability: 0.12,
    costPerUnitDistance: 0.003,
    vehicleCapacity: 400,
    shipmentFrequency: 1,
    fuelPrice: 1.5,
    customsTime: 1,
    disruptionProb: 0.04,
  },
  {
    id: 'FACTORY_SHANXI__FACTORY_SAUDI',
    fromId: 'FACTORY_SHANXI',
    toId: 'FACTORY_SAUDI',
    mode: TransportMode.SEA,
    distance: 8500,
    baseLeadTime: 14,           // China to Saudi — establishing neutral bridge
    leadTimeVariability: 0.15,
    costPerUnitDistance: 0.003,
    vehicleCapacity: 400,
    shipmentFrequency: 1,
    fuelPrice: 1.5,
    customsTime: 1,
    disruptionProb: 0.04,
  },
  {
    id: 'FACTORY_MALAYSIA__DC_LOS_ANGELES',
    fromId: 'FACTORY_MALAYSIA',
    toId: 'DC_LOS_ANGELES',
    mode: TransportMode.SEA,
    distance: 15000,
    baseLeadTime: 21,           // Trans-Pacific — THE TARIFF CHOKEPOINT
    leadTimeVariability: 0.20,
    costPerUnitDistance: 0.004,
    vehicleCapacity: 600,
    shipmentFrequency: 1,
    fuelPrice: 1.8,
    customsTime: 3,             // US CBP inspection + AD/CVD verification
    disruptionProb: 0.10,       // High disruption risk — seizure / detention
  },
  {
    id: 'FACTORY_SAUDI__WH_JEDDAH',
    fromId: 'FACTORY_SAUDI',
    toId: 'WH_JEDDAH',
    mode: TransportMode.ROAD,
    distance: 350,
    baseLeadTime: 2,
    leadTimeVariability: 0.05,
    costPerUnitDistance: 0.003,
    vehicleCapacity: 200,
    shipmentFrequency: 3,
    fuelPrice: 0.6,             // Low domestic fuel cost in Saudi Arabia
    customsTime: 0,
    disruptionProb: 0.01,
  },
  {
    id: 'WH_JEDDAH__DC_LOS_ANGELES',
    fromId: 'WH_JEDDAH',
    toId: 'DC_LOS_ANGELES',
    mode: TransportMode.SEA,
    distance: 14000,            // Via Suez → Atlantic → Panama → Pacific
    baseLeadTime: 20,           // Tariff-clean: Saudi-origin exempt from AD/CVD
    leadTimeVariability: 0.15,
    costPerUnitDistance: 0.004,
    vehicleCapacity: 500,
    shipmentFrequency: 1,
    fuelPrice: 1.7,
    customsTime: 2,             // Routine customs — no AD/CVD hold
    disruptionProb: 0.05,
  },
  {
    id: 'WH_JEDDAH__DC_ROTTERDAM',
    fromId: 'WH_JEDDAH',
    toId: 'DC_ROTTERDAM',
    mode: TransportMode.SEA,
    distance: 7500,             // Via Suez Canal
    baseLeadTime: 12,
    leadTimeVariability: 0.12,
    costPerUnitDistance: 0.003,
    vehicleCapacity: 500,
    shipmentFrequency: 1,
    fuelPrice: 1.6,
    customsTime: 1,
    disruptionProb: 0.03,
  },
  {
    id: 'WH_SHENZHEN__DC_ROTTERDAM',
    fromId: 'WH_SHENZHEN',
    toId: 'DC_ROTTERDAM',
    mode: TransportMode.SEA,
    distance: 20000,            // China → Europe via Suez Canal
    baseLeadTime: 28,
    leadTimeVariability: 0.15,
    costPerUnitDistance: 0.003,
    vehicleCapacity: 600,
    shipmentFrequency: 1,
    fuelPrice: 1.6,
    customsTime: 2,
    disruptionProb: 0.05,
  },
  {
    id: 'DC_LOS_ANGELES__RETAIL_US',
    fromId: 'DC_LOS_ANGELES',
    toId: 'RETAIL_US',
    mode: TransportMode.ROAD,
    distance: 2000,
    baseLeadTime: 3,
    leadTimeVariability: 0.10,
    costPerUnitDistance: 0.005,
    vehicleCapacity: 150,
    shipmentFrequency: 5,
    fuelPrice: 1.8,
    customsTime: 0,
    disruptionProb: 0.01,
  },
  {
    id: 'DC_ROTTERDAM__RETAIL_EU',
    fromId: 'DC_ROTTERDAM',
    toId: 'RETAIL_EU',
    mode: TransportMode.ROAD,
    distance: 700,
    baseLeadTime: 2,
    leadTimeVariability: 0.08,
    costPerUnitDistance: 0.004,
    vehicleCapacity: 150,
    shipmentFrequency: 5,
    fuelPrice: 1.6,
    customsTime: 0,
    disruptionProb: 0.01,
  },
];

// ─── Simulation Parameter Presets ────────────────────────────────────────────

const BASE_PARAMS: SimulationParams = {
  commodityPriceChanges: {},
  yieldRateDegradation: 0,
  energyCostChange: 0,
  unitProductionCost: 85,
  procurementCost: 45,
  transportationCost: 15,
  inventoryCarryingCost: 6,
  stockoutPenalty: 300,
  expeditingCost: 150,
  warehousingCost: 8,
  workingCapitalCost: 6,
  currencyExchangeRate: 1,
  inflationRate: 2,
  supplierFailureProb: 0.01,
  naturalDisasterProb: 0.001,
  portCongestionProb: 0.02,
  transportDelayProb: 0.01,
  laborStrikeProb: 0.005,
  cyberRisk: 0.002,
  qualityRecallProb: 0.002,
  demandShockProb: 0.005,
  pandemicFactor: 0,
  recoveryTime: 14,
  mtsMtoRatio: 0.8,
  postponementEnabled: false,
  inventoryPooling: false,
  multiSourcing: false,
  nearshoring: false,
  dynamicPricing: false,
  forecastAccuracy: 82,
  forecastUpdateFrequency: 30,
  bullwhipFactor: 1.2,
  collaborationLevel: 45,
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

export const SOLAR_SCENARIO_PARAMS: Record<string, SimulationParams> = {

  // ── Scenario A: Smooth pre-tariff operations ─────────────────────────────
  baseline: {
    ...BASE_PARAMS,
    // All defaults — Xinjiang polysilicon flows freely, Malaysia ships to LA
  },

  // ── Scenario B: AD/CVD Tariff Storm + UFLPA Seizures ─────────────────────
  // March 2025: US CBP seizes Malaysian modules; AD/CVD 274%; LA port congested
  // with 50 GW panic-buying inventory; freight costs +85%
  crisis: {
    ...BASE_PARAMS,
    tariffImposition: true,
    geopoliticalTension: true,       // US-China tensions → +5d delay on all routes
    logisticDisruption: true,        // LA port overwhelmed → +2d
    supplierFailureProb: 0.12,       // Xinjiang UFLPA seizure risk at peak
    portCongestionProb: 0.35,        // LA port congested with 50 GW trying to enter
    transportDelayProb: 0.15,
    laborStrikeProb: 0.04,           // Dock worker stoppages
    cyberRisk: 0.012,
    demandShockProb: 0.025,
    demandSurge: 40,                 // Panic stockpiling before tariff deadline
    bullwhipFactor: 1.95,            // Severe upstream order amplification
    freightCostIndex: 185,           // 85% freight cost surge
    unitProductionCost: 140,         // Tariff cost pass-through
    transportationCost: 38,
    inventoryCarryingCost: 14,
    stockoutPenalty: 800,
    expeditingCost: 400,
    yieldRateDegradation: 3,         // Supply chain stress degrades yield
    commodityPriceChanges: {
      polysilicon: 45,               // +45% from supply shock
      silver: 22,
      aluminum: 18,
      glass: 12,
    },
  },

  // ── Scenario C: Saudi Neutral Bridge + Digital Transformation Response ────
  // JinkoSolar activates Saudi 10GW hub; switches to compliant polysilicon;
  // Circulor blockchain provides instant UFLPA traceability; forecasting improves
  recovery: {
    ...BASE_PARAMS,
    tariffImposition: true,          // US tariffs still active — but Saudi route bypasses them
    geopoliticalTension: true,       // Tensions still ongoing
    logisticDisruption: false,       // Saudi re-routing resolves LA congestion
    supplierFailureProb: 0.03,       // Reduced — switched to compliant DE supplier
    portCongestionProb: 0.09,        // Better with route diversification
    transportDelayProb: 0.05,
    laborStrikeProb: 0.01,
    demandShockProb: 0.01,
    demandSurge: 12,                 // Demand stabilised
    bullwhipFactor: 1.3,             // Reduced by digital twin visibility
    freightCostIndex: 125,           // Partially normalised
    unitProductionCost: 20,
    transportationCost: 22,
    inventoryCarryingCost: 8,
    stockoutPenalty: 400,
    expeditingCost: 200,
    nearshoring: true,               // Saudi plant is now the primary US-bound node
    multiSourcing: true,             // Dual-source: compliant DE + China
    forecastAccuracy: 91,            // Circulor blockchain + digital twin
    collaborationLevel: 72,
    commodityPriceChanges: {
      polysilicon: 15,               // Partial normalisation
      silver: 8,
      aluminum: 6,
      glass: 4,
    },
  },
};

// ─── Scenario Metadata ────────────────────────────────────────────────────────

export interface DemoScenario {
  id: string;
  name: string;
  tagline: string;
  description: string;
  whatToWatch: string[];
  color: string;
  borderColor: string;
  params: SimulationParams;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'baseline',
    name: 'Scenario A — Smooth Operations',
    tagline: 'Pre-tariff baseline (2023)',
    description:
      'The network operates normally before U.S. trade actions. Xinjiang polysilicon flows freely via rail to the Shanxi Lighthouse factory. Malaysia assembles and ships trans-Pacific to LA. Europe is served directly from Shenzhen. Run this first — it is your benchmark.',
    whatToWatch: [
      'Fill Rate holds ~96–98%',
      'OTIF stays above 93%',
      'Risk tab: disruption chart stays nearly empty',
      'Shanxi factory utilisation peaks at 85–95%',
      'Cumulative cost stays flat and predictable',
    ],
    color: '#10b981',
    borderColor: 'border-emerald-500/30',
    params: SOLAR_SCENARIO_PARAMS.baseline,
  },
  {
    id: 'crisis',
    name: 'Scenario B — AD/CVD Tariff Storm',
    tagline: 'US tariff shock + UFLPA seizures (Mar 2025)',
    description:
      'US CBP begins seizing Malaysian-origin modules under AD/CVD duties up to 274%. UFLPA compliance checks freeze Xinjiang polysilicon shipments. LA port congests with a 50 GW panic-buying inventory pile. Freight costs surge 85%. This mirrors the real crisis JinkoSolar and its competitors faced in early 2025.',
    whatToWatch: [
      'Fill Rate collapses to 55–65%',
      'POLYSI_CHINA and FACTORY_MALAYSIA go CRITICAL/OFFLINE',
      'Cost tab: stockout penalties rapidly overwhelm holding costs',
      'DC_LOS_ANGELES capacity explosion → holding cost spike',
      'Disruption tab: supplier failure + port congestion dominate',
      'Bullwhip ratio amplified — upstream orders wildly oscillate',
    ],
    color: '#ef4444',
    borderColor: 'border-red-500/30',
    params: SOLAR_SCENARIO_PARAMS.crisis,
  },
  {
    id: 'recovery',
    name: 'Scenario C — Saudi Bridge + Digital Response',
    tagline: 'JinkoSolar neutral-bridge recovery (2025–2026)',
    description:
      'JinkoSolar activates its Saudi Arabia 10 GW "neutral bridge" plant — Saudi-origin modules are exempt from US tariffs. The compliant German polysilicon supplier takes over from Xinjiang. Circulor blockchain provides instant UFLPA traceability reports. Digital twin forecasting improves. Compare directly against Scenario B to see the value of the digital transformation investment.',
    whatToWatch: [
      'Fill Rate recovers to 82–88% (gap vs A = the "digital premium")',
      'FACTORY_SAUDI and WH_JEDDAH become the load-bearing nodes in Node Details',
      'Holding cost dominates cost mix (Saudi buffer) but stockout penalties drop sharply',
      'MTBD recovers from ~2–3 days back to ~12–15 days',
      'Factory utilisation shifts from Malaysia to Saudi plant',
      'Cumulative cost still higher than A — shows residual tariff friction',
    ],
    color: '#3b82f6',
    borderColor: 'border-blue-500/30',
    params: SOLAR_SCENARIO_PARAMS.recovery,
  },
];
