import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Link as LinkIcon, MapPin, Factory, Warehouse, Truck, ShoppingCart, Layers, Globe as GlobeIcon, Zap, Loader2 } from 'lucide-react';
import { SupplyNode, NodeType, NodeStatus, Route, TransportMode, IndustryConfig } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { geocode } from '../utils/geocoding';
import { routingService, Hub } from '../services/routingService';
import NetworkMap from './NetworkMap';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface NetworkBuilderProps {
  nodes: SupplyNode[];
  routes: Route[];
  setNodes: React.Dispatch<React.SetStateAction<SupplyNode[]>>;
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>;
  industryConfig?: IndustryConfig;
}

const NetworkBuilder: React.FC<NetworkBuilderProps> = ({ nodes, routes, setNodes, setRoutes, industryConfig }) => {
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
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  const handleLocationChange = (location: string) => {
    setNewNode(prev => ({ ...prev, location }));

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (location.length <= 1) {
      requestIdRef.current++;
      setShowHubSuggestions(false);
      setNearbyHubs([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;

      // Search the 14K+ UNLOCODE port atlas by name
      const results = await routingService.searchPorts(location, undefined, 10);
      if (requestId !== requestIdRef.current) return;

      if (results.length > 0) {
        // Map to the format snapToHub expects
        const mapped = results.map((p: any) => ({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lon: p.lon,
          type: p.type === 'sea' ? 'Sea' : p.type === 'air' ? 'Air' : 'Sea/Air',
          dist: p.distance_km ? Math.round(p.distance_km) : null,
          country: p.country,
        }));
        setNearbyHubs(mapped);
        setShowHubSuggestions(true);
      } else {
        // Fallback: geocode then search nearby ports
        const coords = await geocode(location);
        if (requestId !== requestIdRef.current) return;
        if (coords) {
          const nearby = await routingService.searchPortsNearby(coords.lat, coords.lng, undefined, 10);
          if (requestId !== requestIdRef.current) return;
          const mapped = nearby.map((p: any) => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lon: p.lon,
            type: p.type === 'sea' ? 'Sea' : p.type === 'air' ? 'Air' : 'Sea/Air',
            dist: p.distance_km ? Math.round(p.distance_km) : null,
            country: p.country,
          }));
          setNearbyHubs(mapped);
          setShowHubSuggestions(mapped.length > 0);
        }
      }
    }, 300);
  };

  const snapToHub = (hub: any) => {
    // Bug 1 fix: use functional updater to avoid stale closure
    setNewNode(prev => ({
      ...prev,
      location: hub.name,
      name: prev.name || hub.name,
      coordinates: {
        ...prev.coordinates,
        lat: hub.lat,
        lng: hub.lon,
        x: (hub.lon + 180) * (800 / 360),
        y: (90 - hub.lat) * (400 / 180)
      }
    } as Partial<SupplyNode>));
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
    warehouseCapabilities: [],
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

  // Bug 2 fix: resolve nearest hub of the correct transport mode by coordinates,
  // so routing uses the right hub ID rather than fragile location-string matching.
  const resolveHubId = async (node: SupplyNode, modeStr: 'Air' | 'Sea'): Promise<string> => {
    if (node.coordinates.lat !== 0 || node.coordinates.lng !== 0) {
      const nearby = await routingService.getNearbyHubs(node.coordinates.lat, node.coordinates.lng);
      const hub = nearby.find((h: any) => h.type === modeStr);
      if (hub) return hub.id;
    }
    return node.location;
  };

  const calcAbortRef = useRef<number>(0);

  const handleCalculateRealDistance = async () => {
    if (!newRoute.fromId || !newRoute.toId || !newRoute.mode) return;
    if (newRoute.mode !== TransportMode.AIR && newRoute.mode !== TransportMode.SEA) return;

    // Bug 5 fix: cancel any in-flight calculation before starting a new one
    const callId = ++calcAbortRef.current;

    setIsCalculatingRoute(true);
    setRoutingError(null);

    const fromNode = nodes.find(n => n.id === newRoute.fromId);
    const toNode = nodes.find(n => n.id === newRoute.toId);

    if (fromNode && toNode) {
      const modeStr = newRoute.mode === TransportMode.AIR ? 'Air' : 'Sea';
      const [fromKey, toKey] = await Promise.all([
        resolveHubId(fromNode, modeStr),
        resolveHubId(toNode, modeStr)
      ]);

      if (callId !== calcAbortRef.current) return; // superseded by newer call

      const result = await routingService.getShortestPath(fromKey, toKey, modeStr);

      if (callId !== calcAbortRef.current) return;

      if (result.status === 'success') {
        setNewRoute(prev => ({
          ...prev,
          distance: result.distance_km,
          baseLeadTime: Math.ceil(result.lead_time_days)
        }));
      } else {
        // Bug 4 fix: haversine fallback when backend is unavailable (e.g. Vercel)
        const dist = Math.round(haversineKm(
          fromNode.coordinates.lat, fromNode.coordinates.lng,
          toNode.coordinates.lat, toNode.coordinates.lng
        ));
        const speed = newRoute.mode === TransportMode.AIR ? 850 : 40;
        const leadTime = Math.max(1, Math.ceil(dist / speed / 24));
        setNewRoute(prev => ({ ...prev, distance: dist, baseLeadTime: leadTime }));
        setRoutingError('Routing engine offline — using straight-line estimate');
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
    routingService.persistNode({ 
      id: node.id, 
      name: node.name, 
      lat: node.coordinates.lat, 
      lon: node.coordinates.lng, 
      type: 'Air',
      is_hub: false 
    });
    
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Network Builder</h2>
          <p className="text-white/40 text-sm mt-1">Design and configure your supply chain topology</p>
        </div>
        <div className="flex gap-2 md:gap-3 self-start sm:self-auto">
          <button
            onClick={() => setIsAddingRoute(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all"
          >
            <LinkIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Connect Nodes</span>
          </button>
          <button
            onClick={() => setIsAddingNode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-white text-black hover:bg-white/90 rounded-xl transition-all font-medium"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Add Node</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Network Map */}
        <div className="col-span-12 xl:col-span-8">
          <NetworkMap
            nodes={nodes}
            routes={routes}
            onNodeSelect={setSelectedNode}
            selectedNodeId={selectedNode?.id || null}
          />
        </div>

        {/* Right Column: Property Inspector / Analytics */}
        <div className="col-span-12 xl:col-span-4 bg-[#050505] rounded-3xl border border-white/5 p-8 flex flex-col h-auto xl:h-[600px]">
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

                  <div className="space-y-4">
                    <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Inventory Policy</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] text-white/40 uppercase block mb-1">Safety Stock</p>
                        <input 
                          type="number"
                          className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                          value={selectedNode.safetyStock}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { safetyStock: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] text-white/40 uppercase block mb-1">Reorder Point</p>
                        <input 
                          type="number"
                          className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                          value={selectedNode.reorderPoint}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { reorderPoint: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] text-white/40 uppercase block mb-1">Order Quantity</p>
                        <input 
                          type="number"
                          className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                          value={selectedNode.orderQuantity}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { orderQuantity: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] text-white/40 uppercase block mb-1">Target Service %</p>
                        <input 
                          type="number"
                          className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                          value={selectedNode.targetServiceLevel}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { targetServiceLevel: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Constraints & Costs</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] text-white/40 uppercase block mb-1">Holding Cost</p>
                        <input 
                          type="number"
                          className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                          value={selectedNode.holdingCost}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { holdingCost: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] text-white/40 uppercase block mb-1">Obs. Rate %</p>
                        <input 
                          type="number"
                          step="0.01"
                          className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                          value={selectedNode.obsolescenceRate}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { obsolescenceRate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] text-white/40 uppercase block mb-1">Shelf Life (d)</p>
                        <input 
                          type="number"
                          className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                          value={selectedNode.shelfLife}
                          onChange={(e) => handleUpdateNode(selectedNode.id, { shelfLife: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedNode.type === NodeType.SUPPLIER && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Lead Time & Reliability</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Lead Time (d)</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.supplierLeadTime}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { supplierLeadTime: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">LT Var (std)</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.supplierLeadTimeVariability}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { supplierLeadTimeVariability: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Reliability %</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.supplierReliability}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { supplierReliability: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Disruption %</p>
                          <input 
                            type="number"
                            step="0.01"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.supplierDisruptionProb}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { supplierDisruptionProb: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2 mt-4">Capacity & Costs</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Capacity</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.supplierCapacity}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { supplierCapacity: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Cost/Unit ($)</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.supplierCostPerUnit}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { supplierCostPerUnit: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">MOQ</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.supplierMinOrderQuantity}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { supplierMinOrderQuantity: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Recovery (d)</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.supplierRecoveryTime}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { supplierRecoveryTime: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === NodeType.FACTORY && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Efficiency & Output</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Capacity</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.productionCapacity}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { productionCapacity: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Utilization %</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.utilizationRate}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { utilizationRate: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Yield %</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.yieldRate}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { yieldRate: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Defect %</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.defectRate}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { defectRate: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2 mt-4">Setup & Scheduling</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Setup Time (h)</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.setupTime}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { setupTime: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Setup Cost ($)</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.setupCost}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { setupCost: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 col-span-2">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Scheduling Rule</p>
                          <input 
                            type="text"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.schedulingRule}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { schedulingRule: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(selectedNode.type === NodeType.WAREHOUSE || selectedNode.type === NodeType.DISTRIBUTION_CENTER) && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Throughput</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Picking Rate</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.pickingRate}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { pickingRate: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Packing Rate</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.packingRate}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { packingRate: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Automation (1-5)</p>
                          <input 
                            type="number"
                            min="1" max="5"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.automationLevel}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { automationLevel: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Accuracy %</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.fulfillmentAccuracy}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { fulfillmentAccuracy: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2 mt-4">Capabilities</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                          <input 
                            type="checkbox" 
                            checked={selectedNode.crossDocking}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { crossDocking: e.target.checked })}
                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-white focus:ring-0"
                          />
                          <span className="text-xs font-bold text-white">Enable Cross-Docking</span>
                        </label>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Labor Availability %</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.laborAvailability}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { laborAvailability: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedNode.type === NodeType.RETAIL && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Market Dynamics</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Volume</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.demandVolume}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { demandVolume: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Variability %</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.demandVariability}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { demandVariability: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Seasonality</p>
                          <input 
                            type="number"
                            step="0.1"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.demandSeasonality}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { demandSeasonality: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Elasticity</p>
                          <input 
                            type="number"
                            step="0.1"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.priceElasticity}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { priceElasticity: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2 mt-4">Customer Behavior</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">LT Tolerance (d)</p>
                          <input 
                            type="number"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.leadTimeTolerance}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { leadTimeTolerance: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[9px] text-white/40 uppercase block mb-1">Substitution</p>
                          <input 
                            type="text"
                            className="text-sm font-bold text-white bg-transparent border-none p-0 w-full focus:ring-0"
                            value={selectedNode.substitutionBehavior}
                            onChange={(e) => handleUpdateNode(selectedNode.id, { substitutionBehavior: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

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
                              const modeStr = selectedRoute.mode === TransportMode.AIR ? 'Air' : 'Sea';
                              const [fromKey, toKey] = await Promise.all([
                                resolveHubId(fromNode, modeStr),
                                resolveHubId(toNode, modeStr)
                              ]);
                              const result = await routingService.getShortestPath(fromKey, toKey, modeStr);
                              if (result.status === 'success') {
                                handleUpdateRoute(selectedRoute.id, {
                                  distance: result.distance_km,
                                  baseLeadTime: Math.ceil(result.lead_time_days)
                                });
                              } else {
                                // Haversine fallback
                                const dist = Math.round(haversineKm(
                                  fromNode.coordinates.lat, fromNode.coordinates.lng,
                                  toNode.coordinates.lat, toNode.coordinates.lng
                                ));
                                const speed = selectedRoute.mode === TransportMode.AIR ? 850 : 40;
                                handleUpdateRoute(selectedRoute.id, {
                                  distance: dist,
                                  baseLeadTime: Math.max(1, Math.ceil(dist / speed / 24))
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6">
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
              className="relative w-full max-w-4xl bg-[#0a0a0a] rounded-2xl md:rounded-3xl border border-white/10 p-4 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex flex-col gap-3 mb-4 md:mb-8">
                <h3 className="text-lg md:text-2xl font-bold text-white">New Supply Node</h3>
                <div className="flex w-full bg-white/5 p-1 rounded-xl border border-white/5">
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
                      className={`flex-1 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${
                        activeNodeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:gap-8">
                {activeNodeTab === 'basic' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Identity</h4>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Node Name</label>
                        <input 
                          type="text" 
                          value={newNode.name}
                          onChange={(e) => setNewNode({...newNode, name: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                          placeholder="e.g. Shanghai Factory"
                        />
                      </div>
                      <div className="relative">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Location</label>
                        <input
                          type="text"
                          value={newNode.location}
                          onChange={(e) => handleLocationChange(e.target.value)}
                          onBlur={() => setTimeout(() => setShowHubSuggestions(false), 150)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white focus:outline-none focus:border-white/30 transition-all"
                          placeholder="e.g. China or London"
                          autoComplete="off"
                        />
                        {showHubSuggestions && nearbyHubs.length > 0 && (
                          <div className="absolute z-10 w-full mt-2 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-2 max-h-64 overflow-y-auto custom-scrollbar">
                            <p className="text-[9px] text-white/40 uppercase p-2 tracking-widest">UNLOCODE Port Atlas • {nearbyHubs.length} results</p>
                            {nearbyHubs.map(hub => (
                              <button
                                key={hub.id}
                                onClick={() => snapToHub(hub)}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group transition-all"
                              >
                                <div className="text-left">
                                  <p className="text-xs font-bold text-white group-hover:text-blue-400">{hub.name}</p>
                                  <p className="text-[9px] text-white/40 uppercase">{hub.country} • {hub.id} • {hub.type}</p>
                                </div>
                                {hub.dist != null && (
                                  <span className="text-[9px] font-mono text-blue-400/60 bg-blue-400/10 px-2 py-0.5 rounded-full shrink-0 ml-2">
                                    {hub.dist}km
                                  </span>
                                )}
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
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white focus:outline-none focus:border-white/30 transition-all"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Levels</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Initial Level</label>
                          <input type="number" value={newNode.inventoryLevel} onChange={(e) => setNewNode({...newNode, inventoryLevel: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Max Capacity</label>
                          <input type="number" value={newNode.maxCapacity} onChange={(e) => setNewNode({...newNode, maxCapacity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Replenishment</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Reorder Point</label>
                          <input type="number" value={newNode.reorderPoint} onChange={(e) => setNewNode({...newNode, reorderPoint: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Order Qty</label>
                          <input type="number" value={newNode.orderQuantity} onChange={(e) => setNewNode({...newNode, orderQuantity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeNodeTab === 'supplier' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Raw Material</h4>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Supplies Commodity</label>
                        <select
                          value={newNode.materialId || ''}
                          onChange={(e) => setNewNode({...newNode, materialId: e.target.value || undefined})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#111]">— None (generic) —</option>
                          {(industryConfig?.commodities || []).map(c => (
                            <option key={c.id} value={c.id} className="bg-[#111]">{c.name} ({industryConfig?.currencySymbol}{c.basePrice}/{c.unit})</option>
                          ))}
                        </select>
                      </div>
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2 mt-2">Lead Times</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Lead Time (d)</label>
                          <input type="number" value={newNode.supplierLeadTime} onChange={(e) => setNewNode({...newNode, supplierLeadTime: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Variability %</label>
                          <input type="number" value={newNode.supplierLeadTimeVariability} onChange={(e) => setNewNode({...newNode, supplierLeadTimeVariability: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Capability & Cost</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Reliability %</label>
                          <input type="number" value={newNode.supplierReliability} onChange={(e) => setNewNode({...newNode, supplierReliability: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Unit Cost</label>
                          <input type="number" value={newNode.supplierCostPerUnit} onChange={(e) => setNewNode({...newNode, supplierCostPerUnit: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                      {newNode.materialId && (
                        <p className="text-[10px] text-cyan-400/60 mt-1">
                          Linked to <span className="font-bold">{industryConfig?.commodities.find(c => c.id === newNode.materialId)?.name}</span> — commodity price changes will affect this supplier's cost
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeNodeTab === 'production' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Materials & Output</h4>
                      {(industryConfig?.commodities || []).length > 0 && (
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Input Materials</label>
                          <div className="flex flex-wrap gap-1.5">
                            {(industryConfig?.commodities || []).map(c => {
                              const selected = (newNode.inputMaterialIds || []).includes(c.id);
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    const current = newNode.inputMaterialIds || [];
                                    setNewNode({...newNode, inputMaterialIds: selected ? current.filter(id => id !== c.id) : [...current, c.id]});
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                                    selected
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                      : 'bg-white/[0.04] text-white/30 border-white/[0.06] hover:text-white/50'
                                  }`}
                                >
                                  {selected ? '✓ ' : ''}{c.name}
                                </button>
                              );
                            })}
                          </div>
                          {(newNode.inputMaterialIds || []).length > 0 && (
                            <p className="text-[10px] text-cyan-400/60 mt-1.5">Commodity price changes for selected materials will affect this factory's production cost</p>
                          )}
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Output Product</label>
                        <input type="text" value={newNode.outputProduct || ''} onChange={(e) => setNewNode({...newNode, outputProduct: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" placeholder="e.g. Solar Panels" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Capacity / Day</label>
                          <input type="number" value={newNode.productionCapacity} onChange={(e) => setNewNode({...newNode, productionCapacity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Yield Rate %</label>
                          <input type="number" value={newNode.yieldRate} onChange={(e) => setNewNode({...newNode, yieldRate: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Cost & Operations</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Production Cost/Unit</label>
                          <input type="number" value={newNode.unitProductionCost ?? ''} onChange={(e) => setNewNode({...newNode, unitProductionCost: e.target.value ? parseFloat(e.target.value) : undefined})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" placeholder="Global default" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Defect Rate %</label>
                          <input type="number" value={newNode.defectRate ?? 0} onChange={(e) => setNewNode({...newNode, defectRate: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Batch Size</label>
                          <input type="number" value={newNode.batchSize} onChange={(e) => setNewNode({...newNode, batchSize: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Setup Time (h)</label>
                          <input type="number" value={newNode.setupTime} onChange={(e) => setNewNode({...newNode, setupTime: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeNodeTab === 'warehouse' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Space & Cost</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Storage Cap</label>
                          <input type="number" value={newNode.storageCapacity} onChange={(e) => setNewNode({...newNode, storageCapacity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Throughput</label>
                          <input type="number" value={newNode.throughputCapacity} onChange={(e) => setNewNode({...newNode, throughputCapacity: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Warehousing $/unit</label>
                          <input type="number" value={newNode.warehousingCostOverride ?? ''} onChange={(e) => setNewNode({...newNode, warehousingCostOverride: e.target.value ? parseFloat(e.target.value) : undefined})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" placeholder="Global default" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Carrying Cost %</label>
                          <input type="number" value={newNode.carryingCostOverride ?? ''} onChange={(e) => setNewNode({...newNode, carryingCostOverride: e.target.value ? parseFloat(e.target.value) : undefined})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" placeholder="Global default" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Efficiency</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Picking Rate</label>
                          <input type="number" value={newNode.pickingRate} onChange={(e) => setNewNode({...newNode, pickingRate: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Labor Avail %</label>
                          <input type="number" value={newNode.laborAvailability} onChange={(e) => setNewNode({...newNode, laborAvailability: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeNodeTab === 'demand' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Volume</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Demand Vol</label>
                          <input type="number" value={newNode.demandVolume} onChange={(e) => setNewNode({...newNode, demandVolume: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Variability %</label>
                          <input type="number" value={newNode.demandVariability} onChange={(e) => setNewNode({...newNode, demandVariability: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Pricing & Growth</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Markup %</label>
                          <input type="number" value={newNode.markupPct ?? ''} onChange={(e) => setNewNode({...newNode, markupPct: e.target.value ? parseFloat(e.target.value) : undefined})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" placeholder="Global default" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Selling Price</label>
                          <input type="number" value={newNode.sellingPricePerUnit ?? ''} onChange={(e) => setNewNode({...newNode, sellingPricePerUnit: e.target.value ? parseFloat(e.target.value) : undefined})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" placeholder="Auto from markup" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Growth Rate %</label>
                          <input type="number" value={newNode.demandGrowthRate} onChange={(e) => setNewNode({...newNode, demandGrowthRate: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Backorder %</label>
                          <input type="number" value={newNode.backorderRate} onChange={(e) => setNewNode({...newNode, backorderRate: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 md:mt-12">
                <button onClick={() => setIsAddingNode(false)} className="flex-1 py-3 md:py-4 bg-white/5 text-white rounded-2xl border border-white/10 font-medium text-sm">Cancel</button>
                <button onClick={handleAddNode} className="flex-1 py-3 md:py-4 bg-white text-black rounded-2xl font-bold text-sm">Create Node</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Route Modal */}
      <AnimatePresence>
        {isAddingRoute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6">
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
              className="relative w-full max-w-2xl bg-[#0a0a0a] rounded-2xl md:rounded-3xl border border-white/10 p-4 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-lg md:text-2xl font-bold text-white mb-4 md:mb-6">Connect Nodes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">Route Definition</h4>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">From Node</label>
                    <select 
                      value={newRoute.fromId}
                      onChange={(e) => setNewRoute({...newRoute, fromId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white focus:outline-none focus:border-white/30 transition-all"
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
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white focus:outline-none focus:border-white/30 transition-all"
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
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 text-white focus:outline-none focus:border-white/30 transition-all"
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
