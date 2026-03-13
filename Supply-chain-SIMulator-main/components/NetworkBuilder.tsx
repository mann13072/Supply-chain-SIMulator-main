import React, { useState } from 'react';
import { Plus, Trash2, Link as LinkIcon, MapPin, Factory, Warehouse, Truck, ShoppingCart, Layers, Globe as GlobeIcon } from 'lucide-react';
import { SupplyNode, NodeType, NodeStatus, Route, TransportMode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { geocode } from '../utils/geocoding';
import NetworkMap from './NetworkMap';

interface NetworkBuilderProps {
  nodes: SupplyNode[];
  routes: Route[];
  setNodes: React.Dispatch<React.SetStateAction<SupplyNode[]>>;
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>;
}

const NetworkBuilder: React.FC<NetworkBuilderProps> = ({ nodes, routes, setNodes, setRoutes }) => {
  const [selectedNode, setSelectedNode] = useState<SupplyNode | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [activeNodeTab, setActiveNodeTab] = useState<'basic' | 'inventory' | 'supplier' | 'production' | 'warehouse' | 'demand'>('basic');
  const [newNode, setNewNode] = useState<Partial<SupplyNode>>({
    type: NodeType.SUPPLIER,
    status: NodeStatus.OPTIMAL,
    inventoryLevel: 50,
    maxCapacity: 100,
    reorderPoint: 20,
    orderQuantity: 50,
    safetyStock: 10,
    targetServiceLevel: 95,
    reviewFrequency: 1,
    moq: 1,
    holdingCost: 1,
    obsolescenceRate: 0.01,
    shelfLife: 365,
    location: '',
    name: '',
    // Supplier defaults
    supplierLeadTime: 14,
    supplierLeadTimeVariability: 2,
    supplierCapacity: 1000,
    supplierReliability: 95,
    supplierCostPerUnit: 10,
    supplierMinOrderQuantity: 100,
    supplierDisruptionProb: 0.01,
    supplierRecoveryTime: 30,
    alternativeSuppliersCount: 1,
    supplierSwitchingCost: 500,
    // Production defaults
    productionCapacity: 500,
    utilizationRate: 80,
    batchSize: 50,
    setupTime: 4,
    setupCost: 200,
    cycleTime: 2,
    yieldRate: 98,
    defectRate: 2,
    reworkRate: 1,
    schedulingRule: 'FIFO',
    overtimeCapacity: 100,
    // Warehouse defaults
    storageCapacity: 2000,
    throughputCapacity: 500,
    pickingRate: 100,
    packingRate: 80,
    handlingCost: 2,
    laborAvailability: 0.95,
    crossDocking: false,
    processingTime: 1,
    automationLevel: 2,
    fulfillmentAccuracy: 99,
    // Demand defaults
    demandVolume: 100,
    demandVariability: 10,
    demandSeasonality: 1.1,
    demandGrowthRate: 0.05,
    orderFrequency: 1,
    orderSizeDistribution: 'Normal',
    leadTimeTolerance: 3,
    backorderRate: 0.1,
    substitutionBehavior: 'None',
    priceElasticity: -1.2
  });
  const [newRoute, setNewRoute] = useState<Partial<Route>>({
    mode: TransportMode.ROAD,
    costPerUnitDistance: 0.004,
    baseLeadTime: 2,
    leadTimeVariability: 0.1,
    vehicleCapacity: 100,
    shipmentFrequency: 1,
    fuelPrice: 1.5,
    customsTime: 0,
    disruptionProb: 0.01,
    consolidationPolicy: 'None'
  });

  const handleAddNode = async () => {
    if (!newNode.name || !newNode.location) return;
    
    // Default random coordinates
    let lat = (Math.random() * 140) - 70;
    let lng = (Math.random() * 360) - 180;

    // Attempt real geocoding
    const coords = await geocode(newNode.location);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
    
    const node: SupplyNode = {
      id: Math.random().toString(36).substr(2, 9),
      name: newNode.name!,
      location: newNode.location!,
      type: newNode.type as NodeType,
      status: NodeStatus.OPTIMAL,
      inventoryLevel: newNode.inventoryLevel || 50,
      maxCapacity: newNode.maxCapacity || 100,
      reorderPoint: newNode.reorderPoint || 20,
      orderQuantity: newNode.orderQuantity || 50,
      safetyStock: newNode.safetyStock || 10,
      targetServiceLevel: newNode.targetServiceLevel || 95,
      reviewFrequency: newNode.reviewFrequency || 1,
      moq: newNode.moq || 1,
      holdingCost: newNode.holdingCost || 1,
      obsolescenceRate: newNode.obsolescenceRate || 0.01,
      shelfLife: newNode.shelfLife || 365,
      // Supplier
      supplierLeadTime: newNode.supplierLeadTime,
      supplierLeadTimeVariability: newNode.supplierLeadTimeVariability,
      supplierCapacity: newNode.supplierCapacity,
      supplierReliability: newNode.supplierReliability,
      supplierCostPerUnit: newNode.supplierCostPerUnit,
      supplierMinOrderQuantity: newNode.supplierMinOrderQuantity,
      supplierDisruptionProb: newNode.supplierDisruptionProb,
      supplierRecoveryTime: newNode.supplierRecoveryTime,
      alternativeSuppliersCount: newNode.alternativeSuppliersCount,
      supplierSwitchingCost: newNode.supplierSwitchingCost,
      // Production
      productionCapacity: newNode.productionCapacity,
      utilizationRate: newNode.utilizationRate,
      batchSize: newNode.batchSize,
      setupTime: newNode.setupTime,
      setupCost: newNode.setupCost,
      cycleTime: newNode.cycleTime,
      yieldRate: newNode.yieldRate,
      defectRate: newNode.defectRate,
      reworkRate: newNode.reworkRate,
      schedulingRule: newNode.schedulingRule,
      overtimeCapacity: newNode.overtimeCapacity,
      // Warehouse
      storageCapacity: newNode.storageCapacity,
      throughputCapacity: newNode.throughputCapacity,
      pickingRate: newNode.pickingRate,
      packingRate: newNode.packingRate,
      handlingCost: newNode.handlingCost,
      laborAvailability: newNode.laborAvailability,
      crossDocking: newNode.crossDocking,
      processingTime: newNode.processingTime,
      automationLevel: newNode.automationLevel,
      fulfillmentAccuracy: newNode.fulfillmentAccuracy,
      // Demand
      demandVolume: newNode.demandVolume,
      demandVariability: newNode.demandVariability,
      demandSeasonality: newNode.demandSeasonality,
      demandGrowthRate: newNode.demandGrowthRate,
      orderFrequency: newNode.orderFrequency,
      orderSizeDistribution: newNode.orderSizeDistribution,
      leadTimeTolerance: newNode.leadTimeTolerance,
      backorderRate: newNode.backorderRate,
      substitutionBehavior: newNode.substitutionBehavior,
      priceElasticity: newNode.priceElasticity,
      coordinates: { x: Math.random() * 800, y: Math.random() * 400, lat, lng }
    };

    setNodes([...nodes, node]);
    setIsAddingNode(false);
  };

  const handleAddRoute = () => {
    if (!newRoute.fromId || !newRoute.toId) return;

    const route: Route = {
      id: Math.random().toString(36).substr(2, 9),
      fromId: newRoute.fromId!,
      toId: newRoute.toId!,
      mode: newRoute.mode as TransportMode,
      distance: 1000,
      baseLeadTime: newRoute.baseLeadTime || 2,
      leadTimeVariability: newRoute.leadTimeVariability || 0.1,
      costPerUnitDistance: newRoute.costPerUnitDistance || 0.004,
      vehicleCapacity: newRoute.vehicleCapacity || 100,
      shipmentFrequency: newRoute.shipmentFrequency || 1,
      fuelPrice: newRoute.fuelPrice || 1.5,
      customsTime: newRoute.customsTime || 0,
      disruptionProb: newRoute.disruptionProb || 0.01,
      consolidationPolicy: newRoute.consolidationPolicy
    };

    setRoutes([...routes, route]);
    setIsAddingRoute(false);
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    setRoutes(routes.filter(r => r.fromId !== id && r.toId !== id));
  };

  const deleteRoute = (id: string) => {
    setRoutes(routes.filter(r => r.id !== id));
  };

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case NodeType.SUPPLIER: return <MapPin className="w-4 h-4" />;
      case NodeType.FACTORY: return <Factory className="w-4 h-4" />;
      case NodeType.WAREHOUSE: return <Warehouse className="w-4 h-4" />;
      case NodeType.DISTRIBUTION_CENTER: return <Truck className="w-4 h-4" />;
      case NodeType.RETAIL: return <ShoppingCart className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Network Builder</h2>
          <p className="text-white/40 text-sm mt-1">Design and configure your supply chain topology</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddingRoute(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Connect Nodes</span>
          </button>
          <button 
            onClick={() => setIsAddingNode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-white/90 rounded-xl transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Node</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Network Map */}
        <div className="col-span-12">
          <NetworkMap 
            nodes={nodes} 
            routes={routes} 
            onNodeSelect={setSelectedNode} 
            selectedNodeId={selectedNode?.id || null} 
          />
        </div>

        {/* Nodes List */}
        <div className="col-span-12 lg:col-span-4 bg-white/5 rounded-3xl border border-white/5 p-8">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-white/40" />
            Active Nodes
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
...
          </div>
        </div>

        {/* Routes List */}
        <div className="col-span-12 lg:col-span-4 bg-white/5 rounded-3xl border border-white/5 p-8">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-white/40" />
            Active Routes
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
...
          </div>
        </div>

        {/* Node Details */}
        <div className="col-span-12 lg:col-span-4 bg-[#050505] rounded-3xl border border-white/5 p-8">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <GlobeIcon className="w-5 h-5 text-white/40" />
            Node Specification
          </h3>
          {selectedNode ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <h4 className="text-2xl font-bold text-white">{selectedNode.name}</h4>
                <p className="text-white/40 text-sm uppercase tracking-widest">{selectedNode.type} • {selectedNode.location}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Inventory</p>
                  <p className="text-xl font-bold text-white">{selectedNode.inventoryLevel}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Capacity</p>
                  <p className="text-xl font-bold text-white">{selectedNode.maxCapacity}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-xs font-medium"
              >
                Deselect
              </button>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center opacity-20">
              <GlobeIcon className="w-12 h-12 mb-4" />
              <p className="text-sm">Select a node on the map or list to view specifications</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Node Modal */}
      <AnimatePresence>
        {isAddingNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingNode(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white">New Supply Node</h3>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                  {(['basic', 'inventory', 'supplier', 'production', 'warehouse', 'demand'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveNodeTab(tab)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        activeNodeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {activeNodeTab === 'basic' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Identity</h4>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Node Name</label>
                        <input 
                          type="text" 
                          value={newNode.name}
                          onChange={(e) => setNewNode({...newNode, name: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                          placeholder="e.g. Shanghai Factory"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Location</label>
                        <input 
                          type="text" 
                          value={newNode.location}
                          onChange={(e) => setNewNode({...newNode, location: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                          placeholder="e.g. China"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Classification</h4>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Node Type</label>
                        <select 
                          value={newNode.type}
                          onChange={(e) => setNewNode({...newNode, type: e.target.value as NodeType})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                        >
                          {Object.values(NodeType).map(type => (
                            <option key={type} value={type} className="bg-[#0a0a0a]">{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeNodeTab === 'inventory' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Policy Levers</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Reorder Point</label>
                          <input type="number" value={newNode.reorderPoint} onChange={(e) => setNewNode({...newNode, reorderPoint: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Order Quantity</label>
                          <input type="number" value={newNode.orderQuantity} onChange={(e) => setNewNode({...newNode, orderQuantity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Safety Stock</label>
                          <input type="number" value={newNode.safetyStock} onChange={(e) => setNewNode({...newNode, safetyStock: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Target Service %</label>
                          <input type="number" value={newNode.targetServiceLevel} onChange={(e) => setNewNode({...newNode, targetServiceLevel: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Constraints & Costs</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Max Capacity</label>
                          <input type="number" value={newNode.maxCapacity} onChange={(e) => setNewNode({...newNode, maxCapacity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Holding Cost</label>
                          <input type="number" value={newNode.holdingCost} onChange={(e) => setNewNode({...newNode, holdingCost: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Shelf Life (d)</label>
                          <input type="number" value={newNode.shelfLife} onChange={(e) => setNewNode({...newNode, shelfLife: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Obs. Rate %</label>
                          <input type="number" step="0.01" value={newNode.obsolescenceRate} onChange={(e) => setNewNode({...newNode, obsolescenceRate: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeNodeTab === 'supplier' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Lead Time & Reliability</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Lead Time (d)</label>
                          <input type="number" value={newNode.supplierLeadTime} onChange={(e) => setNewNode({...newNode, supplierLeadTime: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">LT Var (std)</label>
                          <input type="number" value={newNode.supplierLeadTimeVariability} onChange={(e) => setNewNode({...newNode, supplierLeadTimeVariability: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Reliability %</label>
                          <input type="number" value={newNode.supplierReliability} onChange={(e) => setNewNode({...newNode, supplierReliability: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Disruption %</label>
                          <input type="number" step="0.01" value={newNode.supplierDisruptionProb} onChange={(e) => setNewNode({...newNode, supplierDisruptionProb: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Capacity & Costs</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Capacity</label>
                          <input type="number" value={newNode.supplierCapacity} onChange={(e) => setNewNode({...newNode, supplierCapacity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Cost/Unit ($)</label>
                          <input type="number" value={newNode.supplierCostPerUnit} onChange={(e) => setNewNode({...newNode, supplierCostPerUnit: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">MOQ</label>
                          <input type="number" value={newNode.supplierMinOrderQuantity} onChange={(e) => setNewNode({...newNode, supplierMinOrderQuantity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Recovery (d)</label>
                          <input type="number" value={newNode.supplierRecoveryTime} onChange={(e) => setNewNode({...newNode, supplierRecoveryTime: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeNodeTab === 'production' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Efficiency & Output</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Capacity</label>
                          <input type="number" value={newNode.productionCapacity} onChange={(e) => setNewNode({...newNode, productionCapacity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Utilization %</label>
                          <input type="number" value={newNode.utilizationRate} onChange={(e) => setNewNode({...newNode, utilizationRate: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Yield %</label>
                          <input type="number" value={newNode.yieldRate} onChange={(e) => setNewNode({...newNode, yieldRate: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Defect %</label>
                          <input type="number" value={newNode.defectRate} onChange={(e) => setNewNode({...newNode, defectRate: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Setup & Scheduling</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Setup Time (h)</label>
                          <input type="number" value={newNode.setupTime} onChange={(e) => setNewNode({...newNode, setupTime: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Setup Cost ($)</label>
                          <input type="number" value={newNode.setupCost} onChange={(e) => setNewNode({...newNode, setupCost: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Scheduling Rule</label>
                        <select value={newNode.schedulingRule} onChange={(e) => setNewNode({...newNode, schedulingRule: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                          <option value="FIFO">FIFO</option>
                          <option value="LIFO">LIFO</option>
                          <option value="EDD">Earliest Due Date</option>
                          <option value="SPT">Shortest Processing Time</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeNodeTab === 'warehouse' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Throughput</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Picking Rate</label>
                          <input type="number" value={newNode.pickingRate} onChange={(e) => setNewNode({...newNode, pickingRate: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Packing Rate</label>
                          <input type="number" value={newNode.packingRate} onChange={(e) => setNewNode({...newNode, packingRate: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Automation (1-5)</label>
                          <input type="number" min="1" max="5" value={newNode.automationLevel} onChange={(e) => setNewNode({...newNode, automationLevel: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Accuracy %</label>
                          <input type="number" value={newNode.fulfillmentAccuracy} onChange={(e) => setNewNode({...newNode, fulfillmentAccuracy: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Capabilities</h4>
                      <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                        <input type="checkbox" checked={newNode.crossDocking} onChange={(e) => setNewNode({...newNode, crossDocking: e.target.checked})} className="w-4 h-4 rounded bg-white/10 border-white/20" />
                        <label className="text-xs text-white/60">Enable Cross-Docking</label>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Labor Availability %</label>
                        <input type="number" step="0.01" value={newNode.laborAvailability} onChange={(e) => setNewNode({...newNode, laborAvailability: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                      </div>
                    </div>
                  </div>
                )}

                {activeNodeTab === 'demand' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Market Dynamics</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Volume</label>
                          <input type="number" value={newNode.demandVolume} onChange={(e) => setNewNode({...newNode, demandVolume: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Variability %</label>
                          <input type="number" value={newNode.demandVariability} onChange={(e) => setNewNode({...newNode, demandVariability: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Seasonality</label>
                          <input type="number" step="0.1" value={newNode.demandSeasonality} onChange={(e) => setNewNode({...newNode, demandSeasonality: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Elasticity</label>
                          <input type="number" step="0.1" value={newNode.priceElasticity} onChange={(e) => setNewNode({...newNode, priceElasticity: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Customer Behavior</h4>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">LT Tolerance (d)</label>
                        <input type="number" value={newNode.leadTimeTolerance} onChange={(e) => setNewNode({...newNode, leadTimeTolerance: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Substitution</label>
                        <select value={newNode.substitutionBehavior} onChange={(e) => setNewNode({...newNode, substitutionBehavior: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                          <option value="None">None</option>
                          <option value="Internal">Internal Brand</option>
                          <option value="External">External Competitor</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-12">
                <button 
                  onClick={() => setIsAddingNode(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddNode}
                  className="flex-1 py-4 bg-white text-black hover:bg-white/90 rounded-2xl transition-all font-bold shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                >
                  Create Node
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Route Modal */}
      <AnimatePresence>
        {isAddingRoute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingRoute(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] rounded-3xl border border-white/10 p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Connect Nodes</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Route Definition</h4>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">From Node</label>
                    <select 
                      value={newRoute.fromId}
                      onChange={(e) => setNewRoute({...newRoute, fromId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                    >
                      <option value="" className="bg-[#0a0a0a]">Select source...</option>
                      {nodes.map(node => (
                        <option key={node.id} value={node.id} className="bg-[#0a0a0a]">{node.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">To Node</label>
                    <select 
                      value={newRoute.toId}
                      onChange={(e) => setNewRoute({...newRoute, toId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                    >
                      <option value="" className="bg-[#0a0a0a]">Select destination...</option>
                      {nodes.map(node => (
                        <option key={node.id} value={node.id} className="bg-[#0a0a0a]">{node.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Transport Mode</label>
                    <select 
                      value={newRoute.mode}
                      onChange={(e) => setNewRoute({...newRoute, mode: e.target.value as TransportMode})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                    >
                      {Object.values(TransportMode).map(mode => (
                        <option key={mode} value={mode} className="bg-[#0a0a0a]">{mode}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Logistics Parameters</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Cost/Unit/km</label>
                      <input 
                        type="number" 
                        step="0.001"
                        value={newRoute.costPerUnitDistance}
                        onChange={(e) => setNewRoute({...newRoute, costPerUnitDistance: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Lead Time (d)</label>
                      <input 
                        type="number" 
                        value={newRoute.baseLeadTime}
                        onChange={(e) => setNewRoute({...newRoute, baseLeadTime: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">LT Var (std)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={newRoute.leadTimeVariability}
                        onChange={(e) => setNewRoute({...newRoute, leadTimeVariability: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Vehicle Cap</label>
                      <input 
                        type="number" 
                        value={newRoute.vehicleCapacity}
                        onChange={(e) => setNewRoute({...newRoute, vehicleCapacity: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Freq (d)</label>
                      <input 
                        type="number" 
                        value={newRoute.shipmentFrequency}
                        onChange={(e) => setNewRoute({...newRoute, shipmentFrequency: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Fuel Price ($/L)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={newRoute.fuelPrice}
                        onChange={(e) => setNewRoute({...newRoute, fuelPrice: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Customs (d)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={newRoute.customsTime}
                        onChange={(e) => setNewRoute({...newRoute, customsTime: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Disruption %</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={newRoute.disruptionProb}
                        onChange={(e) => setNewRoute({...newRoute, disruptionProb: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Consolidation Policy</label>
                    <input 
                      type="text" 
                      value={newRoute.consolidationPolicy}
                      onChange={(e) => setNewRoute({...newRoute, consolidationPolicy: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                      placeholder="e.g. Full Truckload (FTL)"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setIsAddingRoute(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddRoute}
                  className="flex-1 py-3 bg-white text-black hover:bg-white/90 rounded-xl transition-all font-bold"
                >
                  Establish Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkBuilder;
