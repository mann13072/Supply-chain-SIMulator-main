import React, { useState } from 'react';
import { Layers, Plus, Trash2, Play, Save, Download, FileSpreadsheet } from 'lucide-react';
import { Scenario, SupplyNode, Route, SimulationParams } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

interface ScenariosViewProps {
  nodes: SupplyNode[];
  routes: Route[];
  setNodes: (nodes: SupplyNode[]) => void;
  setRoutes: (routes: Route[]) => void;
}

const DEFAULT_PARAMS: SimulationParams = {
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
  logisticDisruption: false,
  seasonalityPattern: 'none',
  seasonalityAmplitude: 0,
  tariffRate: 10,
};

const ScenariosView: React.FC<ScenariosViewProps> = ({ nodes, routes, setNodes, setRoutes }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');

  const saveCurrentAsScenario = () => {
    if (!newScenarioName) return;
    
    const newScenario: Scenario = {
      id: Math.random().toString(36).substr(2, 9),
      name: newScenarioName,
      description: newScenarioDesc,
      nodes: JSON.parse(JSON.stringify(nodes)),
      routes: JSON.parse(JSON.stringify(routes)),
      params: DEFAULT_PARAMS,
      createdAt: new Date().toISOString()
    };

    setScenarios([...scenarios, newScenario]);
    setIsSaving(false);
    setNewScenarioName('');
    setNewScenarioDesc('');
  };

  const loadScenario = (scenario: Scenario) => {
    setNodes(scenario.nodes);
    setRoutes(scenario.routes);
  };

  const deleteScenario = (id: string) => {
    setScenarios(scenarios.filter(s => s.id !== id));
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Nodes Sheet
    const nodesData = nodes.map(n => ({
      ID: n.id,
      Name: n.name,
      Type: n.type,
      Location: n.location,
      Inventory: n.inventoryLevel,
      MaxCapacity: n.maxCapacity,
      SafetyStock: n.safetyStock,
      ReorderPoint: n.reorderPoint,
      OrderQuantity: n.orderQuantity,
      HoldingCost: n.inventoryHoldingCost,
      ObsolescenceRate: n.inventoryObsolescenceRate,
      ShelfLife: n.shelfLife,
      TargetServiceLevel: n.targetServiceLevel,
      SupplierLeadTime: n.supplierLeadTime,
      SupplierReliability: n.supplierReliability,
      SupplierCapacity: n.supplierCapacity,
      SupplierCostPerUnit: n.supplierCostPerUnit,
      ProductionCapacity: n.productionCapacity,
      ProductionYield: n.productionYieldRate,
      WarehousePickingRate: n.warehousePickingRate,
      WarehousePackingRate: n.warehousePackingRate,
      DemandVolume: n.demandVolume,
      DemandVariability: n.demandVariability,
      OperatingCost: n.operatingCost,
      Status: n.status
    }));
    const wsNodes = XLSX.utils.json_to_sheet(nodesData);
    XLSX.utils.book_append_sheet(wb, wsNodes, "Nodes");

    // Routes Sheet
    const routesData = routes.map(r => ({
      ID: r.id,
      From: nodes.find(n => n.id === r.fromId)?.name,
      To: nodes.find(n => n.id === r.toId)?.name,
      Mode: r.mode,
      CostPerUnitKm: r.costPerUnitDistance,
      BaseLeadTime: r.baseLeadTime,
      LeadTimeVariability: r.leadTimeVariability,
      VehicleCapacity: r.vehicleCapacity,
      ConsolidationPolicy: r.consolidationPolicy,
      ShipmentFrequency: r.shipmentFrequency,
      FuelPrice: r.fuelPrice,
      CustomsTime: r.customsTime,
      DisruptionProb: r.disruptionProb
    }));
    const wsRoutes = XLSX.utils.json_to_sheet(routesData);
    XLSX.utils.book_append_sheet(wb, wsRoutes, "Routes");

    XLSX.writeFile(wb, "SupplyChain_DigitalTwin_Export.xlsx");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Scenario Management</h2>
          <p className="text-white/40 text-sm mt-1">Save and compare different network configurations</p>
        </div>
        <div className="flex gap-2 md:gap-3 self-start sm:self-auto">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => setIsSaving(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-white text-black hover:bg-white/90 rounded-xl transition-all font-medium"
          >
            <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Save Current State</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.length === 0 ? (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-center p-8 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <Layers className="w-12 h-12 text-white/10 mb-4" />
            <p className="text-white/40">No scenarios saved yet. Save your current network configuration to start comparing.</p>
          </div>
        ) : (
          scenarios.map(scenario => (
            <motion.div 
              layout
              key={scenario.id} 
              className="bg-white/5 rounded-3xl border border-white/5 p-6 hover:border-white/10 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{scenario.name}</h3>
                  <p className="text-xs text-white/40">{new Date(scenario.createdAt).toLocaleDateString()}</p>
                </div>
                <button 
                  onClick={() => deleteScenario(scenario.id)}
                  className="p-2 text-white/20 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-white/60 mb-6 line-clamp-2">{scenario.description || 'No description provided.'}</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">Nodes</p>
                  <p className="text-xl font-bold text-white">{scenario.nodes.length}</p>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">Routes</p>
                  <p className="text-xl font-bold text-white">{scenario.routes.length}</p>
                </div>
              </div>
              <button 
                onClick={() => loadScenario(scenario)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Load Scenario
              </button>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isSaving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaving(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Save Scenario</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Scenario Name</label>
                  <input 
                    type="text" 
                    value={newScenarioName}
                    onChange={(e) => setNewScenarioName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                    placeholder="e.g. Peak Season Expansion"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Description</label>
                  <textarea 
                    value={newScenarioDesc}
                    onChange={(e) => setNewScenarioDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all h-24 resize-none"
                    placeholder="Describe the goals of this scenario..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setIsSaving(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveCurrentAsScenario}
                  className="flex-1 py-3 bg-white text-black hover:bg-white/90 rounded-xl transition-all font-bold"
                >
                  Save Scenario
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScenariosView;
