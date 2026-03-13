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
  SEA = 'SEA',
  AIR = 'AIR',
  ROAD = 'ROAD',
  RAIL = 'RAIL'
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
}

export interface SimulationParams {
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
