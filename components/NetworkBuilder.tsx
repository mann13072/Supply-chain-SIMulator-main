import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Link as LinkIcon, MapPin, Factory, Warehouse, Truck, ShoppingCart, Layers, Globe as GlobeIcon, Zap, Loader2 } from 'lucide-react';
import { SupplyNode, NodeType, NodeStatus, Route, TransportMode } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { geocode } from '../utils/geocoding';
import { routingService, Hub } from '../services/routingService';
import NetworkMap from './NetworkMap';

interface NetworkBuilderProps {
  nodes: SupplyNode[];
  routes: Route[];
  setNodes: React.Dispatch<React.SetStateAction<SupplyNode[]>>;
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>;
}

const NetworkBuilder: React.FC<NetworkBuilderProps> = ({ nodes, routes, setNodes, setRoutes }) => {
  const [selectedNode, setSelectedNode] = useState<SupplyNode | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [activeNodeTab, setActiveNodeTab] = useState<'basic' | 'inventory' | 'supplier' | 'production' | 'warehouse' | 'demand'>('basic');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  
  // Real-world Routing State
  const [availableHubs, setAvailableHubs] = useState<{ Air: Hub[], Sea: Hub[] }>({ Air: [], Sea: [] });
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHubs = async () => {
      const hubs = await routingService.getAvailableHubs();
      setAvailableHubs(hubs);
    };
    fetchHubs();
  }, []);

  const handleUpdateNode = (id: string, updates: Partial<SupplyNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    if (selectedNode?.id === id) {
      setSelectedNode(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleUpdateRoute = (id: string, updates: Partial<Route>) => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    if (selectedRoute?.id === id) {
      setSelectedRoute(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Hub suggestions
  const [nearbyHubs, setNearbyHubs] = useState<any[]>([]);
  const [showHubSuggestions, setShowHubSuggestions] = useState(false);

  const handleLocationChange = async (location: string) => {
    setNewNode({...newNode, location});
    if (location.length > 2) {
      const coords = await geocode(location);
      if (coords) {
        const nearby = await routingService.getNearbyHubs(coords.lat, coords.lng);
        setNearbyHubs(nearby);
        setShowHubSuggestions(true);
      }
    }
  };

  const snapToHub = (hub: any) => {
    setNewNode({
      ...newNode, 
      location: hub.name,
      name: newNode.name || hub.name,
      coordinates: { 
        ...newNode.coordinates,
        lat: hub.lat, 
        lng: hub.lon,
        // Map lat/lng to approximate 2D x/y for the network map
        x: (hub.lon + 180) * (800 / 360),
        y: (90 - hub.lat) * (400 / 180)
      }
    } as Partial<SupplyNode>);
    setShowHubSuggestions(false);
  };

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
    coordinates: { x: 400, y: 200, lat: 0, lng: 0 },
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

  const handleCalculateRealDistance = async () => {
    if (!newRoute.fromId || !newRoute.toId || !newRoute.mode) return;
    
    if (newRoute.mode !== TransportMode.AIR && newRoute.mode !== TransportMode.SEA) return;

    setIsCalculatingRoute(true);
    setRoutingError(null);

    const fromNode = nodes.find(n => n.id === newRoute.fromId);
    const toNode = nodes.find(n => n.id === newRoute.toId);

    if (fromNode && toNode) {
      const result = await routingService.getShortestPath(
        fromNode.location, 
        toNode.location,
        newRoute.mode === TransportMode.AIR ? 'Air' : 'Sea'
      );

      if (result.status === 'success') {
        setNewRoute(prev => ({ 
          ...prev, 
          distance: result.distance_km,
          baseLeadTime: Math.ceil(result.lead_time_days)
        }));
      } else {
        setRoutingError(result.message || 'Routing failed');
        setNewRoute(prev => ({ ...prev, distance: 0 }));
      }
    }
    setIsCalculatingRoute(false);
  };

  useEffect(() => {
    if (newRoute.fromId && newRoute.toId && (newRoute.mode === TransportMode.AIR || newRoute.mode === TransportMode.SEA)) {
      handleCalculateRealDistance();
    }
  }, [newRoute.fromId, newRoute.toId, newRoute.mode]);

  const handleAddNode = async () => {
    if (!newNode.name || !newNode.location) return;
    
    // Default coordinates
    let lat = newNode.coordinates?.lat || 0;
    let lng = newNode.coordinates?.lng || 0;
    let x = newNode.coordinates?.x || 400;
    let y = newNode.coordinates?.y || 200;

    // Only geocode if we haven't already "snapped" to a hub
    if (lat === 0 && lng === 0) {
      const coords = await geocode(newNode.location);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        x = (lng + 180) * (800 / 360);
        y = (90 - lat) * (400 / 180);
      }
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
      coordinates: { x, y, lat, lng }
    };

    setNodes([...nodes, node]);
    routingService.persistNode({ id: node.id, name: node.name, lat: node.coordinates.lat, lon: node.coordinates.lng, type: node.type === NodeType.RETAIL || node.type === NodeType.SUPPLIER || node.type === NodeType.FACTORY ? 'Air' : 'Sea' });
    
    // RESET FORM
    setNewNode({
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
      coordinates: { x: 400, y: 200, lat: 0, lng: 0 }
    });
    setIsAddingNode(false);
  };

  const handleAddRoute = () => {
    if (!newRoute.fromId || !newRoute.toId) return;

    const route: Route = {
      id: Math.random().toString(36).substr(2, 9),
      fromId: newRoute.fromId!,
      toId: newRoute.toId!,
      mode: newRoute.mode as TransportMode,
      distance: newRoute.distance || 1000,
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
    routingService.persistRoute(route.fromId, route.toId, route.mode === TransportMode.AIR ? 'Air' : 'Sea');
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
        <div className="col-span-12 xl:col-span-8 h-[600px]">
          <NetworkMap 
            nodes={nodes} 
            routes={routes} 
            onNodeSelect={setSelectedNode} 
            selectedNodeId={selectedNode?.id || null} 
          />
        </div>

        {/* Right Column: Property Inspector / Analytics */}
        <div className="col-span-12 xl:col-span-4 bg-[#050505] rounded-3xl border border-white/5 p-8 flex flex-col h-[600px]">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <GlobeIcon className="w-5 h-5 text-white/40" />
            {selectedNode ? 'Node Specification' : selectedRoute ? 'Route Specification' : 'Network Analytics'}
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div 
                  key={`node-${selectedNode.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 pb-8"
                >
                  <div className="flex justify-between items-start border-b border-white/5 pb-4">
                    <div className="flex-1 mr-4">
                      <input 
                        className="text-2xl font-bold text-white bg-transparent border-none focus:ring-0 p-0 w-full mb-1"
                        value={selectedNode.name}
                        onChange={(e) => handleUpdateNode(selectedNode.id, { name: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-[10px] uppercase tracking-widest">{selectedNode.type}</span>
                        <span className="text-white/20">•</span>
                        <input 
                          className="text-white/40 text-[10px] uppercase tracking-widest bg-transparent border-none p-0 focus:ring-0 w-24"
                          value={selectedNode.location}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { location: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <select 
                        value={selectedNode.status}
                        onChange={(e) => handleUpdateNode(selectedNode.id, { status: e.target.value as NodeStatus })}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase transition-all focus:outline-none focus:border-white/30 cursor-pointer"
                        style={{ color: selectedNode.status === NodeStatus.OPTIMAL ? '#10b981' : selectedNode.status === NodeStatus.WARNING ? '#f59e0b' : '#ef4444' }}
                      >
                        {Object.values(NodeStatus).map(status => (
                          <option key={status} value={status} className="bg-[#0a0a0a]">{status}</option>
                        ))}
                      </select>
                      <button onClick={() => deleteNode(selectedNode.id)} className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[9px] text-white/40 uppercase block mb-1">Inventory</p>
                      <input 
                        type="number"
                        className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                        value={selectedNode.inventoryLevel}
                        onChange={(e) => handleUpdateNode(selectedNode.id, { inventoryLevel: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <p className="text-[9px] text-white/40 uppercase block mb-1">Max Capacity</p>
                      <input 
                        type="number"
                        className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                        value={selectedNode.maxCapacity}
                        onChange={(e) => handleUpdateNode(selectedNode.id, { maxCapacity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-[9px] font-bold uppercase tracking-widest mt-4"
                  >
                    Close Inspector
                  </button>
                </motion.div>
              ) : selectedRoute ? (
                <motion.div 
                  key={`route-${selectedRoute.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xl font-bold text-white">Route Properties</h4>
                      <p className="text-white/40 text-sm uppercase tracking-widest">
                        {nodes.find(n => n.id === selectedRoute.fromId)?.name} → {nodes.find(n => n.id === selectedRoute.toId)?.name}
                      </p>
                    </div>
                    <button onClick={() => deleteRoute(selectedRoute.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Distance (km)</p>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          className="text-xl font-bold text-white bg-transparent border-none p-0 w-full"
                          value={selectedRoute.distance}
                          onChange={(e) => handleUpdateRoute(selectedRoute.id, { distance: parseInt(e.target.value) })}
                        />
                        <button 
                          onClick={async () => {
                            if (!selectedRoute.fromId || !selectedRoute.toId) return;
                            setIsCalculatingRoute(true);
                            const fromNode = nodes.find(n => n.id === selectedRoute.fromId);
                            const toNode = nodes.find(n => n.id === selectedRoute.toId);
                            if (fromNode && toNode) {
                              const result = await routingService.getShortestPath(
                                fromNode.location,
                                toNode.location,
                                selectedRoute.mode === TransportMode.AIR ? 'Air' : 'Sea'
                              );
                              if (result.status === 'success') {
                                handleUpdateRoute(selectedRoute.id, { 
                                  distance: result.distance_km,
                                  baseLeadTime: Math.ceil(result.lead_time_days)
                                });
                              }
                            }
                            setIsCalculatingRoute(false);
                          }}
                          disabled={isCalculatingRoute || (selectedRoute.mode !== TransportMode.AIR && selectedRoute.mode !== TransportMode.SEA)}
                          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg border border-blue-500/30 transition-all disabled:opacity-20"
                        >
                          {isCalculatingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Lead Time (d)</p>
                      <input 
                        type="number"
                        className="text-xl font-bold text-white bg-transparent border-none p-0 w-full"
                        value={selectedRoute.baseLeadTime}
                        onChange={(e) => handleUpdateRoute(selectedRoute.id, { baseLeadTime: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedRoute(null)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-xs font-medium"
                  >
                    Close Inspector
                  </button>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <GlobeIcon className="w-12 h-12 mb-4" />
                  <p className="text-xs italic">Select a node or route to view details</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nodes List */}
        <div className="col-span-12 lg:col-span-6 bg-white/5 rounded-3xl border border-white/5 p-8">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-white/40" />
            Active Nodes
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {nodes.map(node => (
              <div 
                key={node.id} 
                className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedNode?.id === node.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
                onClick={() => { setSelectedNode(node); setSelectedRoute(null); }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg text-white">
                      {getNodeIcon(node.type)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{node.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{node.location}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Routes List */}
        <div className="col-span-12 lg:col-span-6 bg-white/5 rounded-3xl border border-white/5 p-8">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-white/40" />
            Active Routes
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {routes.map(route => (
              <div 
                key={route.id} 
                className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedRoute?.id === route.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
                onClick={() => { setSelectedRoute(route); setSelectedNode(null); }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {nodes.find(n => n.id === route.fromId)?.name} → {nodes.find(n => n.id === route.toId)?.name}
                      </p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{route.mode}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteRoute(route.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                  {(['basic', 'inventory', 'supplier', 'production', 'warehouse', 'demand'] as const)
                    .filter(tab => {
                      if (tab === 'basic' || tab === 'inventory') return true;
                      if (newNode.type === NodeType.SUPPLIER) return tab === 'supplier';
                      if (newNode.type === NodeType.FACTORY) return tab === 'production';
                      if (newNode.type === NodeType.WAREHOUSE || newNode.type === NodeType.DISTRIBUTION_CENTER) return tab === 'warehouse';
                      if (newNode.type === NodeType.RETAIL) return tab === 'demand';
                      return false;
                    })
                    .map(tab => (
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
                      <div className="relative">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Location</label>
                        <input 
                          type="text" 
                          value={newNode.location}
                          onChange={(e) => handleLocationChange(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                          placeholder="e.g. China or London"
                        />
                        {showHubSuggestions && nearbyHubs.length > 0 && (
                          <div className="absolute z-10 w-full mt-2 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-2">
                            <p className="text-[9px] text-white/40 uppercase p-2 tracking-widest">Suggested Logistics Hubs</p>
                            {nearbyHubs.map(hub => (
                              <button
                                key={hub.id}
                                onClick={() => snapToHub(hub)}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group transition-all"
                              >
                                <div className="text-left">
                                  <p className="text-xs font-bold text-white group-hover:text-blue-400">{hub.name}</p>
                                  <p className="text-[9px] text-white/40 uppercase">{hub.id} • {hub.type}</p>
                                </div>
                                <span className="text-[9px] font-mono text-blue-400/60 bg-blue-400/10 px-2 py-0.5 rounded-full">
                                  {hub.dist}km
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
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
                {/* ... (rest of the tabs) */}
              </div>

              <div className="flex gap-3 mt-12">
                <button onClick={() => setIsAddingNode(false)} className="flex-1 py-4 bg-white/5 text-white rounded-2xl border border-white/10 font-medium">Cancel</button>
                <button onClick={handleAddNode} className="flex-1 py-4 bg-white text-black rounded-2xl font-bold">Create Node</button>
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
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Distance (km)</label>
                      <div className="flex gap-2">
                        <input type="number" value={newRoute.distance} readOnly className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/40" />
                        {isCalculatingRoute && <Loader2 className="w-4 h-4 animate-spin self-center" />}
                      </div>
                      {routingError && <p className="text-[9px] text-red-500 mt-1">{routingError}</p>}
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Lead Time (d)</label>
                      <input type="number" value={newRoute.baseLeadTime} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/40" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setIsAddingRoute(false)} className="flex-1 py-3 bg-white/5 text-white rounded-xl border border-white/10">Cancel</button>
                <button onClick={handleAddRoute} className="flex-1 py-3 bg-white text-black rounded-xl font-bold">Establish Link</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkBuilder;
