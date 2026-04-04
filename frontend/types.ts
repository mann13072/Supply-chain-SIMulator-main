export enum NodeType {
  SUPPLIER = 'SUPPLIER',
  FACTORY = 'FACTORY',
  WAREHOUSE = 'WAREHOUSE',
  DISTRIBUTION_CENTER = 'DISTRIBUTION_CENTER',
  RETAIL = 'RETAIL'
}

export enum NodeStatus {
  OPTIMAL = 'OPTIMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  OFFLINE = 'OFFLINE'
}

export enum TransportMode {
  SEA = 'Sea',
  AIR = 'Air',
  ROAD = 'Road',
  RAIL = 'Rail'
}

export interface SupplyNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  location: string;
  coordinates: { x: number; y: number; lat: number; lng: number };
  
  // Inventory Policy Levers
  inventoryLevel: number;
  maxCapacity: number;
  reorderPoint: number;
  orderQuantity: number;
  safetyStock: number;
  targetServiceLevel: number;
  reviewFrequency: number;
  moq: number;
  holdingCost: number;
  obsolescenceRate: number;
  shelfLife: number;

  // Supplier Variables (if Supplier)
  supplierLeadTime?: number;
  supplierLeadTimeVariability?: number;
  supplierCapacity?: number;
  supplierReliability?: number;
  supplierCostPerUnit?: number;
  supplierMinOrderQuantity?: number;
  supplierDisruptionProb?: number;
  supplierRecoveryTime?: number;
  alternativeSuppliersCount?: number;
  supplierSwitchingCost?: number;
  materialId?: string;  // which commodity this supplier provides

  // Production / Manufacturing Variables (if Factory)
  productionCapacity?: number;
  utilizationRate?: number;
  batchSize?: number;
  setupTime?: number;
  setupCost?: number;
  cycleTime?: number;
  yieldRate?: number;
  defectRate?: number;
  reworkRate?: number;
  schedulingRule?: string;
  overtimeCapacity?: number;
  inputMaterialIds?: string[];  // commodities consumed by this factory
  outputProduct?: string;       // what this factory produces (label)
  unitProductionCost?: number;  // per-node override (falls back to global param)

  // Warehouse / Distribution Variables (if Warehouse/DC)
  storageCapacity?: number;
  throughputCapacity?: number;
  pickingRate?: number;
  packingRate?: number;
  handlingCost?: number;
  laborAvailability?: number;
  crossDocking?: boolean;
  processingTime?: number;
  automationLevel?: number;
  fulfillmentAccuracy?: number;
  warehouseCapabilities?: string[];
  warehousingCostOverride?: number;   // per-node override for warehousing cost
  carryingCostOverride?: number;      // per-node override for inventory carrying %

  // Demand & Market Variables (if Retail)
  demandVolume?: number;
  demandVariability?: number;
  demandSeasonality?: number;
  demandGrowthRate?: number;
  orderFrequency?: number;
  orderSizeDistribution?: string;
  leadTimeTolerance?: number;
  backorderRate?: number;
  substitutionBehavior?: string;
  priceElasticity?: number;
  markupPct?: number;             // per-retail markup override (falls back to global)

  // Financial tracking (computed at runtime)
  accumulatedUnitCost?: number;  // weighted-avg cost per unit at this node
  sellingPricePerUnit?: number;  // retail selling price (if RETAIL)

  // BOM linkage
  bomProductId?: string;        // which BOM product this node produces/supplies
  tier?: number;                // 0–4, inferred from BOM or manually set
  materialInventory?: Record<string, number>;  // material-specific inventory (factories only)

  // Supply Chain Tier Classification (proximity to focal company)
  supplyChainTier?: number;     // 0=focal, 1/2/3+=upstream supplier tiers, -1/-2/-3=downstream
  isFocalCompany?: boolean;     // only ONE node should be true — the OEM/manufacturer
  tierLocked?: boolean;         // true = user manually assigned tier, skip auto-recalc

  // Runtime simulation state (not persisted)
  offlineRecoveryDaysRemaining?: number;
  demandShockDaysRemaining?: number;
  cyberRecoveryDaysRemaining?: number;  // cyber attack recovery timer
  _baseThroughputCapacity?: number;     // original throughput before cyber attack
}

export interface Route {
  id: string;
  fromId: string;
  toId: string;
  mode: TransportMode;
  distance: number;
  
  // Transportation Variables
  costPerUnitDistance: number;
  baseLeadTime: number;
  leadTimeVariability: number;
  vehicleCapacity: number;
  consolidationPolicy?: string;
  shipmentFrequency: number;
  fuelPrice: number;
  customsTime: number;
  disruptionProb: number;
  regionTags?: string[];
}

export interface Commodity {
  id: string;
  name: string;
  unit: string;
  basePrice: number;
  color: string;
}

export interface IndustryConfig {
  id: string;
  name: string;
  commodities: Commodity[];
  baseCurrency: string;
  currencySymbol: string;
  exchangeRates: Record<string, number>;
  defaultBOM?: BillOfMaterials;
}

export interface WorkflowState {
  industryConfigured: boolean;
  networkBuilt: boolean;
  riskConfigured: boolean;
  simulationRun: boolean;
  analysisReady: boolean;
}

export interface SimulationParams {
  // Generic Commodity Price Changes (replaces solar-specific fields)
  commodityPriceChanges: Record<string, number>;
  yieldRateDegradation: number;
  energyCostChange: number;

  // Financial Variables
  unitProductionCost: number;
  procurementCost: number;
  transportationCost: number;
  inventoryCarryingCost: number;
  stockoutPenalty: number;
  expeditingCost: number;
  warehousingCost: number;
  workingCapitalCost: number;
  currencyExchangeRate: number;
  inflationRate: number;

  // Disruption & Risk Variables
  supplierFailureProb: number;
  naturalDisasterProb: number;
  portCongestionProb: number;
  transportDelayProb: number;
  laborStrikeProb: number;
  cyberRisk: number;
  qualityRecallProb: number;
  demandShockProb: number;
  pandemicFactor: number;
  recoveryTime: number;

  // Strategic Policy Levers
  mtsMtoRatio: number;
  postponementEnabled: boolean;
  inventoryPooling: boolean;
  multiSourcing: boolean;
  nearshoring: boolean;
  dynamicPricing: boolean;
  forecastAccuracy: number;
  forecastUpdateFrequency: number;
  bullwhipFactor: number;
  collaborationLevel: number;
  
  // Market & Policy
  demandSurge: number;
  tariffImposition: boolean;
  subsidyLevel: number;
  interestRateChange: number;
  
  // Risks
  weatherEvent: boolean;
  geopoliticalTension: boolean;
  freightCostIndex: number;
  logisticDisruption: boolean;

  // Demand Seasonality (F4)
  seasonalityPattern: 'none' | 'weekly' | 'monthly' | 'holiday';
  seasonalityAmplitude: number; // 0-100, % swing from baseline

  // Tariff cost (F10)
  tariffRate: number; // percentage, e.g. 25 = 25% tariff on procurement cost

  // Financial (Phase 3-5)
  defaultMarkupPct?: number;  // retail markup over COGS, default 50%

  // Supply Chain Tier-aware simulation controls
  tierVisibilityDecay: number;          // 0-100, demand signal degradation per tier hop (default 20)
  tierBullwhipAmplification: boolean;   // if true, bullwhipFactor compounds per supply chain tier
}

export interface SimulationResult {
  narrative: string;
  kpiImpact: {
    landedCostChange: number;
    otifChange: number;
    carbonFootprintChange: number;
    inventoryRisk: 'Low' | 'Medium' | 'High';
    financialRisk: number;
    operationalRisk: number;
  };
  recommendations: string[];
  qualitativeRisk: string;
  quantitativeRiskScore: number;
}

export interface KPI {
  label: string;
  value: string;
  unit: string;
  trend: number;
  status: 'positive' | 'negative' | 'neutral';
}

export interface SimulationState {
  day: number;
  isPlaying: boolean;
  speed: number;
  logs: string[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  nodes: SupplyNode[];
  routes: Route[];
  params: SimulationParams;
  results?: SimulationResult;
  createdAt: string;
}

export interface InTransitShipment {
  id: string;
  fromId?: string;
  toId: string;
  quantity: number;
  remainingDays: number;
  carbonKg?: number;       // F9: CO2 emissions for this shipment
  tariffCost?: number;     // F10: tariff cost for this shipment
  transportCost?: number;  // transport cost for this shipment
  unitCost?: number;       // accumulated cost per unit being shipped
  materialId?: string;     // BOM: which material this shipment carries
}

export interface HistorySnapshot {
  day: number;
  nodes: { id: string; inv: number; status: string }[];
  shipmentsInFlight: number;
  unitsInFlight: number;
  demandTotal: number;
  demandFulfilled: number;
  newShipmentsTotal: number;
  newShipmentsDelayed: number;
  holdingCost: number;
  stockoutCost: number;
  disruptionCounts: {
    naturalDisaster: number;
    cyberIncident: number;
    supplierFailure: number;
    laborStrike: number;
    demandShock: number;
    qualityRecall: number;
    pandemicEffect: number;
  };
  factoryUtilization: { id: string; name: string; util: number }[];

  // Phase 1 enrichments
  expiredUnits: number;       // F8: units lost to shelf-life expiry
  defectUnits: number;        // F8: units lost to factory defects
  tariffCost: number;         // F10: total tariff cost this day
  carbonEmissions: number;    // F9: kg CO2 emitted by shipments created this day

  // Financial enrichments (all optional for backward compat with old snapshots)
  transportCost?: number;     // total transport cost this day
  productionCost?: number;    // total production cost this day
  warehousingCost?: number;   // total warehousing cost this day
  revenue?: number;           // total revenue this day (retail sales)
  cogs?: number;              // cost of goods sold this day
  workingCapitalCost?: number; // daily financing cost on capital tied up
  expeditingCost?: number;    // extra cost for emergency shipments

  // BOM enrichments (optional for backward compat)
  bomRiskScores?: { productId: string; riskPct: number }[];
  demandExplosion?: { productId: string; requiredQty: number; availableQty: number }[];
  materialBottlenecks?: { factoryId: string; materialId: string; materialName: string; daysUntilStockout: number }[];

  // Supply Chain Tier metrics (optional for backward compat)
  tierMetrics?: Record<number, TierMetrics>;
  tierAlerts?: TierAlert[];
}

export interface TierMetrics {
  nodeCount: number;
  totalInventory: number;
  totalCost: number;
  avgLeadTime: number;
  disruptionCount: number;
  fillRate: number;
  riskScore: number;
}

export interface TierAlert {
  tier: number;
  nodeId: string;
  nodeName: string;
  estimatedImpactDays: number;
  type: string;  // 'disruption' | 'stockout' | 'quality'
}

export interface SimulationRunSummary {
  id: string;
  name: string;
  description?: string;
  total_days: number;
  total_revenue?: number;
  total_cogs?: number;
  total_cost?: number;
  total_operating_cost?: number;
  avg_fill_rate?: number;
  total_disruptions?: number;
  total_carbon_kg?: number;
  tags: string[];
  is_shared: boolean;
  created_at: string;
  node_count: number;
  route_count: number;
}

export interface SimulationRunDetail extends SimulationRunSummary {
  nodes_snapshot: SupplyNode[];
  routes_snapshot: Route[];
  params_snapshot: SimulationParams;
  industry_config?: IndustryConfig;
  history: HistorySnapshot[];
  share_token?: string;
}

// ── BOM (Bill of Materials) Types ──────────────────────────────────────────

export interface BOMProduct {
  id: string;
  name: string;
  tier: number;              // 0=finished good, 1=major assembly, 2=component, 3=sub-component, 4=raw material
  category: 'finished-good' | 'assembly' | 'component' | 'sub-component' | 'raw-material';
  commodityId?: string;      // links to Commodity.id from IndustryConfig (for raw materials)
  defaultLeadTimeDays?: number;
}

export interface BOMEntry {
  parentProductId: string;
  childProductId: string;
  quantityPer: number;       // units of child needed per 1 unit of parent
  unit: string;              // "pcs", "kg", "liters"
  critical: boolean;
  substitutionDifficulty: 'easy' | 'moderate' | 'hard' | 'none';
  source: 'user-defined' | 'template-default' | 'ai-inferred';
  confidence: number;        // 0–100%
  rationale?: string;
}

export interface BillOfMaterials {
  id: string;
  finishedProductId: string;
  name: string;
  industry: string;
  products: BOMProduct[];
  entries: BOMEntry[];
}

export interface BOMRiskScore {
  productId: string;
  riskPct: number;
  driverProductId?: string;   // which child product is the risk driver
  driverNodeId?: string;      // which physical node is the root cause
}

export interface MaterialBottleneck {
  factoryId: string;
  factoryName: string;
  materialId: string;
  materialName: string;
  daysUntilStockout: number;
}

// ── Route Intelligence Types ─────────────────────────────────────────────────

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EventSource = 'manual' | 'news-rss';

export interface DisruptionEvent {
  id: string;
  title: string;
  description: string;
  location: { lat: number; lng: number };
  blastRadiusKm: number;
  severity: EventSeverity;
  affectedTags: string[];
  source: EventSource;
  active: boolean;
  timestamp: string;
  disruptionProbModifier: number;
  leadTimeDelayDays: number;
  costMultiplier: number;
}

export interface AffectedRoute {
  routeId: string;
  route: Route;
  eventId: string;
  matchType: 'geographic' | 'tag' | 'both';
  proximityKm: number;
  originalDisruptionProb: number;
  modifiedDisruptionProb: number;
  originalLeadTime: number;
  modifiedLeadTime: number;
}

export interface RouteAlternative {
  id: string;
  path: string[];
  routes: Route[];
  totalDistance: number;
  totalLeadTime: number;
  totalCost: number;
  riskScore: number;
  compositeScore: number;
  isCurrentRoute: boolean;
}

export interface RouteSuggestion {
  affectedRoute: AffectedRoute;
  alternatives: RouteAlternative[];
  status: 'pending' | 'accepted' | 'rejected';
  acceptedAlternativeId?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  publishedAt: string;
  extractedLocation?: { lat: number; lng: number };
  extractedSeverity: EventSeverity;
  keywords: string[];
  convertedToEvent: boolean;
}

export interface RouteIntelligenceState {
  events: DisruptionEvent[];
  newsItems: NewsItem[];
  affectedRoutes: AffectedRoute[];
  suggestions: RouteSuggestion[];
  autoPauseOnCritical: boolean;
  autoApplyMinor: boolean;
}

export interface OptimizationResult {
  suggestedChanges: {
    type: 'NODE' | 'ROUTE' | 'POLICY';
    targetId: string;
    property: string;
    oldValue: any;
    newValue: any;
    expectedBenefit: string;
  }[];
  overallEfficiencyGain: number;
}
