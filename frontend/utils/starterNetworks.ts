import { SupplyNode, NodeType, NodeStatus, Route, TransportMode } from '../types';

export function getStarterNetwork(industryId: string): { nodes: SupplyNode[], routes: Route[] } {
  switch (industryId) {
    case 'solar':
      return getSolarNetwork();
    case 'automotive':
      return getAutomotiveNetwork();
    case 'pharma':
      return getPharmaNetwork();
    case 'fmcg':
      return getFMCGNetwork();
    case 'tech':
      return getTechNetwork();
    case 'custom':
    default:
      return { nodes: [], routes: [] };
  }
}

// ---------------------------------------------------------------------------
// Solar
// ---------------------------------------------------------------------------
function getSolarNetwork(): { nodes: SupplyNode[], routes: Route[] } {
  const nodes: SupplyNode[] = [
    {
      id: 'solar_baotou', name: 'Baotou Silicon', location: 'Baotou Silicon',
      type: NodeType.SUPPLIER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 12000, maxCapacity: 25000, reorderPoint: 3000, orderQuantity: 5000,
      safetyStock: 2000, targetServiceLevel: 95, reviewFrequency: 1, moq: 1,
      holdingCost: 0.8, obsolescenceRate: 0.005, shelfLife: 730,
      supplierLeadTime: 7, supplierReliability: 92, supplierCostPerUnit: 8,
      yieldRate: 97, setupTime: 6, batchSize: 100,
      throughputCapacity: 600, automationLevel: 2,
      demandVolume: 150, demandVariability: 12, priceElasticity: -0.8,
      coordinates: { x: 0, y: 0, lat: 40.65, lng: 109.84 },
    },
    {
      id: 'solar_shanghai', name: 'Shanghai Cell Mfg', location: 'Shanghai Cell Mfg',
      type: NodeType.FACTORY, status: NodeStatus.OPTIMAL,
      inventoryLevel: 8000, maxCapacity: 18000, reorderPoint: 2000, orderQuantity: 4000,
      safetyStock: 1500, targetServiceLevel: 96, reviewFrequency: 1, moq: 1,
      holdingCost: 1.2, obsolescenceRate: 0.01, shelfLife: 365,
      supplierLeadTime: 5, supplierReliability: 94, supplierCostPerUnit: 12,
      yieldRate: 96, setupTime: 4, batchSize: 80,
      throughputCapacity: 500, automationLevel: 3,
      demandVolume: 120, demandVariability: 10, priceElasticity: -1.0,
      coordinates: { x: 0, y: 0, lat: 31.23, lng: 121.47 },
    },
    {
      id: 'solar_haiphong', name: 'Haiphong Assembly', location: 'Haiphong Assembly',
      type: NodeType.FACTORY, status: NodeStatus.OPTIMAL,
      inventoryLevel: 6000, maxCapacity: 15000, reorderPoint: 1500, orderQuantity: 3000,
      safetyStock: 1200, targetServiceLevel: 94, reviewFrequency: 1, moq: 1,
      holdingCost: 0.9, obsolescenceRate: 0.01, shelfLife: 365,
      supplierLeadTime: 6, supplierReliability: 90, supplierCostPerUnit: 9,
      yieldRate: 95, setupTime: 5, batchSize: 60,
      throughputCapacity: 400, automationLevel: 2,
      demandVolume: 100, demandVariability: 15, priceElasticity: -1.1,
      coordinates: { x: 0, y: 0, lat: 20.84, lng: 106.68 },
    },
    {
      id: 'solar_singapore', name: 'Singapore Nexus', location: 'Singapore Nexus',
      type: NodeType.DISTRIBUTION_CENTER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 10000, maxCapacity: 22000, reorderPoint: 2500, orderQuantity: 4500,
      safetyStock: 1800, targetServiceLevel: 97, reviewFrequency: 1, moq: 1,
      holdingCost: 1.5, obsolescenceRate: 0.008, shelfLife: 365,
      supplierLeadTime: 4, supplierReliability: 96, supplierCostPerUnit: 15,
      yieldRate: 99, setupTime: 2, batchSize: 50,
      throughputCapacity: 700, automationLevel: 3,
      demandVolume: 200, demandVariability: 8, priceElasticity: -1.2,
      coordinates: { x: 0, y: 0, lat: 1.35, lng: 103.82 },
    },
    {
      id: 'solar_rotterdam', name: 'Rotterdam Gateway', location: 'Rotterdam Gateway',
      type: NodeType.WAREHOUSE, status: NodeStatus.OPTIMAL,
      inventoryLevel: 9000, maxCapacity: 20000, reorderPoint: 2000, orderQuantity: 4000,
      safetyStock: 1500, targetServiceLevel: 96, reviewFrequency: 1, moq: 1,
      holdingCost: 1.8, obsolescenceRate: 0.008, shelfLife: 365,
      supplierLeadTime: 3, supplierReliability: 95, supplierCostPerUnit: 14,
      yieldRate: 99, setupTime: 2, batchSize: 50,
      throughputCapacity: 650, automationLevel: 3,
      demandVolume: 180, demandVariability: 10, priceElasticity: -1.2,
      coordinates: { x: 0, y: 0, lat: 51.92, lng: 4.48 },
    },
    {
      id: 'solar_berlin', name: 'Berlin Solar Store', location: 'Berlin Solar Store',
      type: NodeType.RETAIL, status: NodeStatus.OPTIMAL,
      inventoryLevel: 3000, maxCapacity: 8000, reorderPoint: 800, orderQuantity: 1500,
      safetyStock: 600, targetServiceLevel: 98, reviewFrequency: 1, moq: 1,
      holdingCost: 2.0, obsolescenceRate: 0.01, shelfLife: 365,
      supplierLeadTime: 2, supplierReliability: 97, supplierCostPerUnit: 20,
      yieldRate: 99, setupTime: 1, batchSize: 20,
      throughputCapacity: 200, automationLevel: 2,
      demandVolume: 80, demandVariability: 18, priceElasticity: -1.5,
      coordinates: { x: 0, y: 0, lat: 52.52, lng: 13.40 },
    },
    {
      id: 'solar_london', name: 'London Eco Hub', location: 'London Eco Hub',
      type: NodeType.RETAIL, status: NodeStatus.OPTIMAL,
      inventoryLevel: 2800, maxCapacity: 7000, reorderPoint: 700, orderQuantity: 1400,
      safetyStock: 500, targetServiceLevel: 98, reviewFrequency: 1, moq: 1,
      holdingCost: 2.2, obsolescenceRate: 0.01, shelfLife: 365,
      supplierLeadTime: 2, supplierReliability: 97, supplierCostPerUnit: 22,
      yieldRate: 99, setupTime: 1, batchSize: 20,
      throughputCapacity: 180, automationLevel: 2,
      demandVolume: 75, demandVariability: 20, priceElasticity: -1.4,
      coordinates: { x: 0, y: 0, lat: 51.50, lng: -0.12 },
    },
  ];

  const routes: Route[] = [
    {
      id: 'r_baotou_shanghai', fromId: 'solar_baotou', toId: 'solar_shanghai',
      mode: TransportMode.AIR, distance: 1580, baseLeadTime: 2, leadTimeVariability: 0.15,
      costPerUnitDistance: 0.008, vehicleCapacity: 500, shipmentFrequency: 1,
      fuelPrice: 2.5, customsTime: 0, disruptionProb: 0.02,
    },
    {
      id: 'r_shanghai_haiphong', fromId: 'solar_shanghai', toId: 'solar_haiphong',
      mode: TransportMode.SEA, distance: 1720, baseLeadTime: 4, leadTimeVariability: 0.2,
      costPerUnitDistance: 0.003, vehicleCapacity: 2000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 1, disruptionProb: 0.03,
    },
    {
      id: 'r_haiphong_singapore', fromId: 'solar_haiphong', toId: 'solar_singapore',
      mode: TransportMode.SEA, distance: 2160, baseLeadTime: 5, leadTimeVariability: 0.2,
      costPerUnitDistance: 0.003, vehicleCapacity: 2000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 1, disruptionProb: 0.02,
    },
    {
      id: 'r_singapore_rotterdam', fromId: 'solar_singapore', toId: 'solar_rotterdam',
      mode: TransportMode.SEA, distance: 10500, baseLeadTime: 22, leadTimeVariability: 0.25,
      costPerUnitDistance: 0.002, vehicleCapacity: 5000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 2, disruptionProb: 0.04,
    },
    {
      id: 'r_rotterdam_berlin', fromId: 'solar_rotterdam', toId: 'solar_berlin',
      mode: TransportMode.AIR, distance: 648, baseLeadTime: 1, leadTimeVariability: 0.1,
      costPerUnitDistance: 0.01, vehicleCapacity: 300, shipmentFrequency: 1,
      fuelPrice: 2.5, customsTime: 0, disruptionProb: 0.01,
    },
    {
      id: 'r_rotterdam_london', fromId: 'solar_rotterdam', toId: 'solar_london',
      mode: TransportMode.SEA, distance: 510, baseLeadTime: 2, leadTimeVariability: 0.15,
      costPerUnitDistance: 0.004, vehicleCapacity: 1500, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 1, disruptionProb: 0.01,
    },
  ];

  return { nodes, routes };
}

// ---------------------------------------------------------------------------
// Automotive
// ---------------------------------------------------------------------------
function getAutomotiveNetwork(): { nodes: SupplyNode[], routes: Route[] } {
  const nodes: SupplyNode[] = [
    {
      id: 'auto_detroit', name: 'Detroit Steel Works', location: 'Detroit Steel Works',
      type: NodeType.SUPPLIER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 15000, maxCapacity: 30000, reorderPoint: 4000, orderQuantity: 6000,
      safetyStock: 3000, targetServiceLevel: 94, reviewFrequency: 1, moq: 10,
      holdingCost: 1.5, obsolescenceRate: 0.005, shelfLife: 1095,
      supplierLeadTime: 10, supplierReliability: 93, supplierCostPerUnit: 25,
      yieldRate: 97, setupTime: 8, batchSize: 200,
      throughputCapacity: 800, automationLevel: 3,
      demandVolume: 250, demandVariability: 15, priceElasticity: -0.6,
      coordinates: { x: 0, y: 0, lat: 42.33, lng: -83.05 },
    },
    {
      id: 'auto_stuttgart', name: 'Stuttgart Chip Supply', location: 'Stuttgart Chip Supply',
      type: NodeType.SUPPLIER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 8000, maxCapacity: 18000, reorderPoint: 2000, orderQuantity: 3500,
      safetyStock: 1500, targetServiceLevel: 96, reviewFrequency: 1, moq: 5,
      holdingCost: 3.0, obsolescenceRate: 0.03, shelfLife: 365,
      supplierLeadTime: 14, supplierReliability: 88, supplierCostPerUnit: 45,
      yieldRate: 94, setupTime: 6, batchSize: 100,
      throughputCapacity: 400, automationLevel: 4,
      demandVolume: 120, demandVariability: 20, priceElasticity: -0.4,
      coordinates: { x: 0, y: 0, lat: 48.77, lng: 9.18 },
    },
    {
      id: 'auto_nagoya', name: 'Nagoya Assembly Plant', location: 'Nagoya Assembly Plant',
      type: NodeType.FACTORY, status: NodeStatus.OPTIMAL,
      inventoryLevel: 5000, maxCapacity: 12000, reorderPoint: 1500, orderQuantity: 2500,
      safetyStock: 1000, targetServiceLevel: 97, reviewFrequency: 1, moq: 1,
      holdingCost: 2.5, obsolescenceRate: 0.008, shelfLife: 730,
      supplierLeadTime: 5, supplierReliability: 96, supplierCostPerUnit: 80,
      yieldRate: 99, setupTime: 12, batchSize: 20,
      throughputCapacity: 300, automationLevel: 5,
      demandVolume: 60, demandVariability: 10, priceElasticity: -0.9,
      coordinates: { x: 0, y: 0, lat: 35.18, lng: 136.91 },
    },
    {
      id: 'auto_wolfsburg', name: 'Wolfsburg Motor Works', location: 'Wolfsburg Motor Works',
      type: NodeType.FACTORY, status: NodeStatus.OPTIMAL,
      inventoryLevel: 4500, maxCapacity: 10000, reorderPoint: 1200, orderQuantity: 2000,
      safetyStock: 800, targetServiceLevel: 97, reviewFrequency: 1, moq: 1,
      holdingCost: 2.8, obsolescenceRate: 0.008, shelfLife: 730,
      supplierLeadTime: 5, supplierReliability: 95, supplierCostPerUnit: 85,
      yieldRate: 98, setupTime: 10, batchSize: 25,
      throughputCapacity: 350, automationLevel: 5,
      demandVolume: 70, demandVariability: 12, priceElasticity: -0.8,
      coordinates: { x: 0, y: 0, lat: 52.42, lng: 10.78 },
    },
    {
      id: 'auto_memphis', name: 'Memphis Logistics Hub', location: 'Memphis Logistics Hub',
      type: NodeType.DISTRIBUTION_CENTER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 3000, maxCapacity: 8000, reorderPoint: 800, orderQuantity: 1500,
      safetyStock: 600, targetServiceLevel: 96, reviewFrequency: 1, moq: 1,
      holdingCost: 2.0, obsolescenceRate: 0.005, shelfLife: 1095,
      supplierLeadTime: 3, supplierReliability: 97, supplierCostPerUnit: 90,
      yieldRate: 99, setupTime: 2, batchSize: 10,
      throughputCapacity: 500, automationLevel: 4,
      demandVolume: 90, demandVariability: 8, priceElasticity: -0.7,
      coordinates: { x: 0, y: 0, lat: 35.15, lng: -90.05 },
    },
    {
      id: 'auto_munich', name: 'Munich Showroom', location: 'Munich Showroom',
      type: NodeType.RETAIL, status: NodeStatus.OPTIMAL,
      inventoryLevel: 500, maxCapacity: 1500, reorderPoint: 100, orderQuantity: 200,
      safetyStock: 80, targetServiceLevel: 98, reviewFrequency: 1, moq: 1,
      holdingCost: 5.0, obsolescenceRate: 0.02, shelfLife: 730,
      supplierLeadTime: 2, supplierReliability: 98, supplierCostPerUnit: 120,
      yieldRate: 100, setupTime: 0, batchSize: 1,
      throughputCapacity: 50, automationLevel: 1,
      demandVolume: 20, demandVariability: 25, priceElasticity: -1.8,
      coordinates: { x: 0, y: 0, lat: 48.14, lng: 11.58 },
    },
  ];

  const routes: Route[] = [
    {
      id: 'r_detroit_memphis', fromId: 'auto_detroit', toId: 'auto_memphis',
      mode: TransportMode.RAIL, distance: 1050, baseLeadTime: 3, leadTimeVariability: 0.15,
      costPerUnitDistance: 0.004, vehicleCapacity: 3000, shipmentFrequency: 1,
      fuelPrice: 1.2, customsTime: 0, disruptionProb: 0.02,
    },
    {
      id: 'r_stuttgart_wolfsburg', fromId: 'auto_stuttgart', toId: 'auto_wolfsburg',
      mode: TransportMode.ROAD, distance: 510, baseLeadTime: 1, leadTimeVariability: 0.1,
      costPerUnitDistance: 0.006, vehicleCapacity: 500, shipmentFrequency: 2,
      fuelPrice: 1.8, customsTime: 0, disruptionProb: 0.01,
    },
    {
      id: 'r_nagoya_memphis', fromId: 'auto_nagoya', toId: 'auto_memphis',
      mode: TransportMode.SEA, distance: 10200, baseLeadTime: 25, leadTimeVariability: 0.25,
      costPerUnitDistance: 0.002, vehicleCapacity: 2000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 3, disruptionProb: 0.04,
    },
    {
      id: 'r_wolfsburg_munich', fromId: 'auto_wolfsburg', toId: 'auto_munich',
      mode: TransportMode.ROAD, distance: 580, baseLeadTime: 1, leadTimeVariability: 0.1,
      costPerUnitDistance: 0.005, vehicleCapacity: 200, shipmentFrequency: 2,
      fuelPrice: 1.8, customsTime: 0, disruptionProb: 0.01,
    },
    {
      id: 'r_detroit_nagoya', fromId: 'auto_detroit', toId: 'auto_nagoya',
      mode: TransportMode.SEA, distance: 10500, baseLeadTime: 28, leadTimeVariability: 0.25,
      costPerUnitDistance: 0.002, vehicleCapacity: 3000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 2, disruptionProb: 0.03,
    },
  ];

  return { nodes, routes };
}

// ---------------------------------------------------------------------------
// Pharma
// ---------------------------------------------------------------------------
function getPharmaNetwork(): { nodes: SupplyNode[], routes: Route[] } {
  const nodes: SupplyNode[] = [
    {
      id: 'pharma_mumbai', name: 'Mumbai API Plant', location: 'Mumbai API Plant',
      type: NodeType.SUPPLIER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 20000, maxCapacity: 40000, reorderPoint: 5000, orderQuantity: 8000,
      safetyStock: 4000, targetServiceLevel: 98, reviewFrequency: 1, moq: 50,
      holdingCost: 2.0, obsolescenceRate: 0.02, shelfLife: 180,
      supplierLeadTime: 12, supplierReliability: 90, supplierCostPerUnit: 35,
      yieldRate: 92, setupTime: 8, batchSize: 500,
      throughputCapacity: 1000, automationLevel: 3,
      demandVolume: 300, demandVariability: 8, priceElasticity: -0.3,
      coordinates: { x: 0, y: 0, lat: 19.08, lng: 72.88 },
    },
    {
      id: 'pharma_basel', name: 'Basel Formulation Lab', location: 'Basel Formulation Lab',
      type: NodeType.FACTORY, status: NodeStatus.OPTIMAL,
      inventoryLevel: 10000, maxCapacity: 22000, reorderPoint: 3000, orderQuantity: 5000,
      safetyStock: 2500, targetServiceLevel: 99, reviewFrequency: 1, moq: 10,
      holdingCost: 4.0, obsolescenceRate: 0.03, shelfLife: 365,
      supplierLeadTime: 8, supplierReliability: 96, supplierCostPerUnit: 60,
      yieldRate: 95, setupTime: 6, batchSize: 200,
      throughputCapacity: 600, automationLevel: 4,
      demandVolume: 200, demandVariability: 6, priceElasticity: -0.2,
      coordinates: { x: 0, y: 0, lat: 47.56, lng: 7.59 },
    },
    {
      id: 'pharma_dublin', name: 'Dublin Bio Center', location: 'Dublin Bio Center',
      type: NodeType.FACTORY, status: NodeStatus.OPTIMAL,
      inventoryLevel: 8000, maxCapacity: 18000, reorderPoint: 2500, orderQuantity: 4000,
      safetyStock: 2000, targetServiceLevel: 99, reviewFrequency: 1, moq: 10,
      holdingCost: 3.5, obsolescenceRate: 0.025, shelfLife: 270,
      supplierLeadTime: 7, supplierReliability: 95, supplierCostPerUnit: 55,
      yieldRate: 93, setupTime: 10, batchSize: 150,
      throughputCapacity: 500, automationLevel: 4,
      demandVolume: 180, demandVariability: 7, priceElasticity: -0.25,
      coordinates: { x: 0, y: 0, lat: 53.35, lng: -6.26 },
    },
    {
      id: 'pharma_singapore', name: 'Singapore Cold Hub', location: 'Singapore Cold Hub',
      type: NodeType.DISTRIBUTION_CENTER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 12000, maxCapacity: 25000, reorderPoint: 3500, orderQuantity: 6000,
      safetyStock: 3000, targetServiceLevel: 99, reviewFrequency: 1, moq: 1,
      holdingCost: 5.0, obsolescenceRate: 0.02, shelfLife: 180,
      supplierLeadTime: 4, supplierReliability: 97, supplierCostPerUnit: 70,
      yieldRate: 99, setupTime: 2, batchSize: 100,
      throughputCapacity: 800, automationLevel: 4,
      demandVolume: 250, demandVariability: 5, priceElasticity: -0.2,
      coordinates: { x: 0, y: 0, lat: 1.35, lng: 103.82 },
    },
    {
      id: 'pharma_newjersey', name: 'New Jersey Pharma Depot', location: 'New Jersey Pharma Depot',
      type: NodeType.WAREHOUSE, status: NodeStatus.OPTIMAL,
      inventoryLevel: 15000, maxCapacity: 30000, reorderPoint: 4000, orderQuantity: 7000,
      safetyStock: 3500, targetServiceLevel: 99, reviewFrequency: 1, moq: 1,
      holdingCost: 3.0, obsolescenceRate: 0.02, shelfLife: 270,
      supplierLeadTime: 3, supplierReliability: 96, supplierCostPerUnit: 65,
      yieldRate: 99, setupTime: 1, batchSize: 100,
      throughputCapacity: 700, automationLevel: 3,
      demandVolume: 220, demandVariability: 10, priceElasticity: -0.3,
      coordinates: { x: 0, y: 0, lat: 40.06, lng: -74.41 },
    },
    {
      id: 'pharma_chicago', name: 'Chicago MedStore', location: 'Chicago MedStore',
      type: NodeType.RETAIL, status: NodeStatus.OPTIMAL,
      inventoryLevel: 5000, maxCapacity: 12000, reorderPoint: 1500, orderQuantity: 2500,
      safetyStock: 1200, targetServiceLevel: 99, reviewFrequency: 1, moq: 1,
      holdingCost: 3.5, obsolescenceRate: 0.03, shelfLife: 180,
      supplierLeadTime: 2, supplierReliability: 98, supplierCostPerUnit: 80,
      yieldRate: 100, setupTime: 0, batchSize: 10,
      throughputCapacity: 300, automationLevel: 2,
      demandVolume: 150, demandVariability: 12, priceElasticity: -0.15,
      coordinates: { x: 0, y: 0, lat: 41.88, lng: -87.63 },
    },
  ];

  const routes: Route[] = [
    {
      id: 'r_mumbai_basel', fromId: 'pharma_mumbai', toId: 'pharma_basel',
      mode: TransportMode.AIR, distance: 6600, baseLeadTime: 3, leadTimeVariability: 0.15,
      costPerUnitDistance: 0.012, vehicleCapacity: 300, shipmentFrequency: 2,
      fuelPrice: 2.5, customsTime: 1, disruptionProb: 0.02,
    },
    {
      id: 'r_mumbai_singapore', fromId: 'pharma_mumbai', toId: 'pharma_singapore',
      mode: TransportMode.SEA, distance: 3900, baseLeadTime: 8, leadTimeVariability: 0.2,
      costPerUnitDistance: 0.004, vehicleCapacity: 1500, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 1, disruptionProb: 0.03,
    },
    {
      id: 'r_basel_dublin', fromId: 'pharma_basel', toId: 'pharma_dublin',
      mode: TransportMode.AIR, distance: 1100, baseLeadTime: 1, leadTimeVariability: 0.1,
      costPerUnitDistance: 0.01, vehicleCapacity: 400, shipmentFrequency: 2,
      fuelPrice: 2.5, customsTime: 0.5, disruptionProb: 0.01,
    },
    {
      id: 'r_dublin_newjersey', fromId: 'pharma_dublin', toId: 'pharma_newjersey',
      mode: TransportMode.AIR, distance: 5100, baseLeadTime: 2, leadTimeVariability: 0.15,
      costPerUnitDistance: 0.01, vehicleCapacity: 400, shipmentFrequency: 1,
      fuelPrice: 2.5, customsTime: 2, disruptionProb: 0.02,
    },
    {
      id: 'r_newjersey_chicago', fromId: 'pharma_newjersey', toId: 'pharma_chicago',
      mode: TransportMode.ROAD, distance: 1200, baseLeadTime: 2, leadTimeVariability: 0.1,
      costPerUnitDistance: 0.005, vehicleCapacity: 800, shipmentFrequency: 3,
      fuelPrice: 1.8, customsTime: 0, disruptionProb: 0.01,
    },
  ];

  return { nodes, routes };
}

// ---------------------------------------------------------------------------
// FMCG (Retail)
// ---------------------------------------------------------------------------
function getFMCGNetwork(): { nodes: SupplyNode[], routes: Route[] } {
  const nodes: SupplyNode[] = [
    {
      id: 'fmcg_saopaulo', name: 'Sao Paulo Grain Mill', location: 'Sao Paulo Grain Mill',
      type: NodeType.SUPPLIER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 25000, maxCapacity: 50000, reorderPoint: 6000, orderQuantity: 10000,
      safetyStock: 5000, targetServiceLevel: 93, reviewFrequency: 1, moq: 100,
      holdingCost: 0.5, obsolescenceRate: 0.04, shelfLife: 90,
      supplierLeadTime: 8, supplierReliability: 88, supplierCostPerUnit: 3,
      yieldRate: 96, setupTime: 3, batchSize: 1000,
      throughputCapacity: 2000, automationLevel: 2,
      demandVolume: 500, demandVariability: 20, priceElasticity: -1.5,
      coordinates: { x: 0, y: 0, lat: -23.55, lng: -46.63 },
    },
    {
      id: 'fmcg_amsterdam', name: 'Amsterdam Processing', location: 'Amsterdam Processing',
      type: NodeType.FACTORY, status: NodeStatus.OPTIMAL,
      inventoryLevel: 18000, maxCapacity: 35000, reorderPoint: 5000, orderQuantity: 8000,
      safetyStock: 4000, targetServiceLevel: 95, reviewFrequency: 1, moq: 50,
      holdingCost: 1.0, obsolescenceRate: 0.03, shelfLife: 120,
      supplierLeadTime: 5, supplierReliability: 94, supplierCostPerUnit: 5,
      yieldRate: 97, setupTime: 2, batchSize: 500,
      throughputCapacity: 1500, automationLevel: 3,
      demandVolume: 400, demandVariability: 15, priceElasticity: -1.3,
      coordinates: { x: 0, y: 0, lat: 52.37, lng: 4.90 },
    },
    {
      id: 'fmcg_dubai', name: 'Dubai Free Zone', location: 'Dubai Free Zone',
      type: NodeType.DISTRIBUTION_CENTER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 20000, maxCapacity: 40000, reorderPoint: 5000, orderQuantity: 9000,
      safetyStock: 4500, targetServiceLevel: 95, reviewFrequency: 1, moq: 1,
      holdingCost: 0.8, obsolescenceRate: 0.03, shelfLife: 120,
      supplierLeadTime: 4, supplierReliability: 95, supplierCostPerUnit: 6,
      yieldRate: 99, setupTime: 1, batchSize: 200,
      throughputCapacity: 1800, automationLevel: 3,
      demandVolume: 350, demandVariability: 12, priceElasticity: -1.2,
      coordinates: { x: 0, y: 0, lat: 25.20, lng: 55.27 },
    },
    {
      id: 'fmcg_london', name: 'London Supermart', location: 'London Supermart',
      type: NodeType.RETAIL, status: NodeStatus.OPTIMAL,
      inventoryLevel: 8000, maxCapacity: 15000, reorderPoint: 2000, orderQuantity: 3500,
      safetyStock: 1500, targetServiceLevel: 97, reviewFrequency: 1, moq: 1,
      holdingCost: 1.5, obsolescenceRate: 0.05, shelfLife: 60,
      supplierLeadTime: 2, supplierReliability: 96, supplierCostPerUnit: 8,
      yieldRate: 99, setupTime: 0, batchSize: 50,
      throughputCapacity: 600, automationLevel: 2,
      demandVolume: 300, demandVariability: 22, priceElasticity: -1.8,
      coordinates: { x: 0, y: 0, lat: 51.51, lng: -0.13 },
    },
    {
      id: 'fmcg_tokyo', name: 'Tokyo ConveniStore', location: 'Tokyo ConveniStore',
      type: NodeType.RETAIL, status: NodeStatus.OPTIMAL,
      inventoryLevel: 6000, maxCapacity: 12000, reorderPoint: 1800, orderQuantity: 3000,
      safetyStock: 1200, targetServiceLevel: 98, reviewFrequency: 1, moq: 1,
      holdingCost: 2.0, obsolescenceRate: 0.05, shelfLife: 45,
      supplierLeadTime: 2, supplierReliability: 97, supplierCostPerUnit: 9,
      yieldRate: 99, setupTime: 0, batchSize: 30,
      throughputCapacity: 400, automationLevel: 3,
      demandVolume: 250, demandVariability: 18, priceElasticity: -1.6,
      coordinates: { x: 0, y: 0, lat: 35.68, lng: 139.69 },
    },
  ];

  const routes: Route[] = [
    {
      id: 'r_saopaulo_amsterdam', fromId: 'fmcg_saopaulo', toId: 'fmcg_amsterdam',
      mode: TransportMode.SEA, distance: 9500, baseLeadTime: 20, leadTimeVariability: 0.25,
      costPerUnitDistance: 0.002, vehicleCapacity: 5000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 2, disruptionProb: 0.03,
    },
    {
      id: 'r_amsterdam_london', fromId: 'fmcg_amsterdam', toId: 'fmcg_london',
      mode: TransportMode.ROAD, distance: 360, baseLeadTime: 1, leadTimeVariability: 0.1,
      costPerUnitDistance: 0.005, vehicleCapacity: 800, shipmentFrequency: 3,
      fuelPrice: 1.8, customsTime: 0.5, disruptionProb: 0.01,
    },
    {
      id: 'r_amsterdam_dubai', fromId: 'fmcg_amsterdam', toId: 'fmcg_dubai',
      mode: TransportMode.SEA, distance: 6200, baseLeadTime: 14, leadTimeVariability: 0.2,
      costPerUnitDistance: 0.003, vehicleCapacity: 3000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 1, disruptionProb: 0.03,
    },
    {
      id: 'r_dubai_tokyo', fromId: 'fmcg_dubai', toId: 'fmcg_tokyo',
      mode: TransportMode.SEA, distance: 9800, baseLeadTime: 21, leadTimeVariability: 0.25,
      costPerUnitDistance: 0.002, vehicleCapacity: 4000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 2, disruptionProb: 0.03,
    },
  ];

  return { nodes, routes };
}

// ---------------------------------------------------------------------------
// Tech / Electronics
// ---------------------------------------------------------------------------
function getTechNetwork(): { nodes: SupplyNode[], routes: Route[] } {
  const nodes: SupplyNode[] = [
    {
      id: 'tech_taipei', name: 'Taipei TSMC Foundry', location: 'Taipei TSMC Foundry',
      type: NodeType.SUPPLIER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 10000, maxCapacity: 20000, reorderPoint: 2500, orderQuantity: 5000,
      safetyStock: 2000, targetServiceLevel: 97, reviewFrequency: 1, moq: 100,
      holdingCost: 5.0, obsolescenceRate: 0.05, shelfLife: 365,
      supplierLeadTime: 14, supplierReliability: 95, supplierCostPerUnit: 50,
      yieldRate: 92, setupTime: 12, batchSize: 500,
      throughputCapacity: 600, automationLevel: 5,
      demandVolume: 200, demandVariability: 15, priceElasticity: -0.5,
      coordinates: { x: 0, y: 0, lat: 25.03, lng: 121.57 },
    },
    {
      id: 'tech_seoul', name: 'Seoul Component Lab', location: 'Seoul Component Lab',
      type: NodeType.SUPPLIER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 9000, maxCapacity: 18000, reorderPoint: 2200, orderQuantity: 4000,
      safetyStock: 1800, targetServiceLevel: 96, reviewFrequency: 1, moq: 50,
      holdingCost: 4.5, obsolescenceRate: 0.04, shelfLife: 365,
      supplierLeadTime: 10, supplierReliability: 94, supplierCostPerUnit: 40,
      yieldRate: 94, setupTime: 8, batchSize: 300,
      throughputCapacity: 500, automationLevel: 5,
      demandVolume: 180, demandVariability: 12, priceElasticity: -0.5,
      coordinates: { x: 0, y: 0, lat: 37.57, lng: 126.98 },
    },
    {
      id: 'tech_shenzhen', name: 'Shenzhen Assembly', location: 'Shenzhen Assembly',
      type: NodeType.FACTORY, status: NodeStatus.OPTIMAL,
      inventoryLevel: 7000, maxCapacity: 15000, reorderPoint: 2000, orderQuantity: 3500,
      safetyStock: 1500, targetServiceLevel: 96, reviewFrequency: 1, moq: 10,
      holdingCost: 3.0, obsolescenceRate: 0.04, shelfLife: 365,
      supplierLeadTime: 5, supplierReliability: 93, supplierCostPerUnit: 65,
      yieldRate: 96, setupTime: 4, batchSize: 200,
      throughputCapacity: 800, automationLevel: 4,
      demandVolume: 250, demandVariability: 18, priceElasticity: -0.8,
      coordinates: { x: 0, y: 0, lat: 22.54, lng: 114.06 },
    },
    {
      id: 'tech_sanjose', name: 'San Jose Distribution', location: 'San Jose Distribution',
      type: NodeType.DISTRIBUTION_CENTER, status: NodeStatus.OPTIMAL,
      inventoryLevel: 12000, maxCapacity: 25000, reorderPoint: 3000, orderQuantity: 5000,
      safetyStock: 2500, targetServiceLevel: 97, reviewFrequency: 1, moq: 1,
      holdingCost: 3.5, obsolescenceRate: 0.03, shelfLife: 365,
      supplierLeadTime: 3, supplierReliability: 96, supplierCostPerUnit: 75,
      yieldRate: 99, setupTime: 1, batchSize: 50,
      throughputCapacity: 900, automationLevel: 4,
      demandVolume: 300, demandVariability: 10, priceElasticity: -1.0,
      coordinates: { x: 0, y: 0, lat: 37.34, lng: -121.89 },
    },
    {
      id: 'tech_frankfurt', name: 'Frankfurt EU Warehouse', location: 'Frankfurt EU Warehouse',
      type: NodeType.WAREHOUSE, status: NodeStatus.OPTIMAL,
      inventoryLevel: 8000, maxCapacity: 18000, reorderPoint: 2000, orderQuantity: 3500,
      safetyStock: 1500, targetServiceLevel: 96, reviewFrequency: 1, moq: 1,
      holdingCost: 2.5, obsolescenceRate: 0.03, shelfLife: 365,
      supplierLeadTime: 3, supplierReliability: 95, supplierCostPerUnit: 72,
      yieldRate: 99, setupTime: 1, batchSize: 50,
      throughputCapacity: 700, automationLevel: 3,
      demandVolume: 200, demandVariability: 12, priceElasticity: -1.0,
      coordinates: { x: 0, y: 0, lat: 50.11, lng: 8.68 },
    },
    {
      id: 'tech_newyork', name: 'New York TechMart', location: 'New York TechMart',
      type: NodeType.RETAIL, status: NodeStatus.OPTIMAL,
      inventoryLevel: 4000, maxCapacity: 10000, reorderPoint: 1000, orderQuantity: 2000,
      safetyStock: 800, targetServiceLevel: 98, reviewFrequency: 1, moq: 1,
      holdingCost: 4.0, obsolescenceRate: 0.05, shelfLife: 270,
      supplierLeadTime: 2, supplierReliability: 97, supplierCostPerUnit: 90,
      yieldRate: 100, setupTime: 0, batchSize: 10,
      throughputCapacity: 400, automationLevel: 2,
      demandVolume: 150, demandVariability: 22, priceElasticity: -1.5,
      coordinates: { x: 0, y: 0, lat: 40.71, lng: -74.01 },
    },
  ];

  const routes: Route[] = [
    {
      id: 'r_taipei_shenzhen', fromId: 'tech_taipei', toId: 'tech_shenzhen',
      mode: TransportMode.AIR, distance: 810, baseLeadTime: 1, leadTimeVariability: 0.1,
      costPerUnitDistance: 0.01, vehicleCapacity: 400, shipmentFrequency: 3,
      fuelPrice: 2.5, customsTime: 0.5, disruptionProb: 0.02,
    },
    {
      id: 'r_seoul_shenzhen', fromId: 'tech_seoul', toId: 'tech_shenzhen',
      mode: TransportMode.AIR, distance: 2100, baseLeadTime: 1, leadTimeVariability: 0.1,
      costPerUnitDistance: 0.009, vehicleCapacity: 400, shipmentFrequency: 2,
      fuelPrice: 2.5, customsTime: 0.5, disruptionProb: 0.02,
    },
    {
      id: 'r_shenzhen_sanjose', fromId: 'tech_shenzhen', toId: 'tech_sanjose',
      mode: TransportMode.SEA, distance: 10900, baseLeadTime: 24, leadTimeVariability: 0.25,
      costPerUnitDistance: 0.002, vehicleCapacity: 4000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 3, disruptionProb: 0.04,
    },
    {
      id: 'r_shenzhen_frankfurt', fromId: 'tech_shenzhen', toId: 'tech_frankfurt',
      mode: TransportMode.SEA, distance: 11200, baseLeadTime: 26, leadTimeVariability: 0.25,
      costPerUnitDistance: 0.002, vehicleCapacity: 4000, shipmentFrequency: 1,
      fuelPrice: 1.5, customsTime: 2, disruptionProb: 0.04,
    },
    {
      id: 'r_sanjose_newyork', fromId: 'tech_sanjose', toId: 'tech_newyork',
      mode: TransportMode.AIR, distance: 4100, baseLeadTime: 2, leadTimeVariability: 0.1,
      costPerUnitDistance: 0.008, vehicleCapacity: 500, shipmentFrequency: 2,
      fuelPrice: 2.5, customsTime: 0, disruptionProb: 0.01,
    },
  ];

  return { nodes, routes };
}
