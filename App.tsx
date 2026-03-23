import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Globe from './components/Globe';
import NetworkBuilder from './components/NetworkBuilder';
import SimulationEngine from './components/SimulationEngine';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import ResilienceHub from './components/ResilienceHub';
import OptimizationView from './components/OptimizationView';
import { SupplyNode, NodeType, NodeStatus, Route, TransportMode, KPI, SimulationParams, InTransitShipment, HistorySnapshot } from './types';
import { routingService } from './services/routingService';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Network, PlayCircle, BarChart3, Settings, Layers, Zap, ShieldAlert, Activity, Globe as GlobeIcon } from 'lucide-react';

const INITIAL_NODES: SupplyNode[] = [];
const INITIAL_ROUTES: Route[] = [];

const INITIAL_PARAMS: SimulationParams = {
  polysiliconPriceChange: 0,
  silverPriceChange: 0,
  aluminumPriceChange: 0,
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
  nextDay: number
): { nextNodes: SupplyNode[]; nextShipments: InTransitShipment[]; newLogs: string[]; snapshot: HistorySnapshot } {
  const nextNodes = prevNodes.map(n => ({ ...n }));
  const newLogs: string[] = [];
  const nextShipments: InTransitShipment[] = [];

  // 1. Process arriving shipments (tick down remainingDays, deliver if <= 1)
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

  // 2. Apply risk events per node
  nextNodes.forEach(node => {
    // Natural disaster — any node can go OFFLINE
    if (Math.random() < params.naturalDisasterProb) {
      node.status = NodeStatus.OFFLINE;
      newLogs.push(`Day ${nextDay}: NATURAL DISASTER hit ${node.name}! Node offline.`);
      return; // skip further processing for offline node
    }

    // Cyber attack — DC/Warehouse throughput halved
    if ((node.type === NodeType.DISTRIBUTION_CENTER || node.type === NodeType.WAREHOUSE)
        && Math.random() < params.cyberRisk) {
      node.throughputCapacity = Math.floor((node.throughputCapacity || 500) * 0.5);
      newLogs.push(`Day ${nextDay}: CYBER INCIDENT at ${node.name}. Throughput halved.`);
    }

    // Supplier failure
    if (node.type === NodeType.SUPPLIER && Math.random() < params.supplierFailureProb) {
      node.status = NodeStatus.CRITICAL;
      newLogs.push(`Day ${nextDay}: SUPPLIER FAILURE at ${node.name}!`);
    }

    // Labor strike — factory production drops to 0 for this tick
    const isOnStrike = node.type === NodeType.FACTORY && Math.random() < params.laborStrikeProb;
    if (isOnStrike) {
      newLogs.push(`Day ${nextDay}: LABOR STRIKE at ${node.name}. No production this day.`);
    }

    // 3. Demand consumption (RETAIL nodes)
    if (node.type === NodeType.RETAIL) {
      const surgeFactor = 1 + (params.demandSurge / 100);
      const baseDemand = (node.demandVolume || 20) * surgeFactor;
      const isShocked = Math.random() < params.demandShockProb;
      const demand = Math.max(0, Math.floor(baseDemand * (isShocked ? 2 : 1)));
      node.inventoryLevel = Math.max(0, node.inventoryLevel - demand);
      node.status = node.inventoryLevel < (node.reorderPoint || 20) ? NodeStatus.WARNING : NodeStatus.OPTIMAL;
      if (node.inventoryLevel === 0 && demand > 0) {
        newLogs.push(`Day ${nextDay}: STOCKOUT at ${node.name}!`);
        node.status = NodeStatus.CRITICAL;
      }
    }

    // 4. Production (FACTORY nodes)
    if (node.type === NodeType.FACTORY && !isOnStrike) {
      const degradation = Math.max(0, params.yieldRateDegradation);
      const yieldRate = Math.max(0, ((node.yieldRate || 100) - degradation)) / 100;
      const netProduction = Math.floor((node.productionCapacity || 100) * yieldRate);
      node.inventoryLevel = Math.min(node.maxCapacity, node.inventoryLevel + netProduction);
    }
  });

  // 5. Reorder logic — trigger replenishment shipments
  nextNodes.forEach(node => {
    if (node.status === NodeStatus.OFFLINE || node.status === NodeStatus.CRITICAL) return;
    if (node.inventoryLevel < (node.reorderPoint || 50)) {
      const route = routes.find(r => r.toId === node.id);
      if (route) {
        const source = nextNodes.find(n => n.id === route.fromId);
        if (source && source.status !== NodeStatus.OFFLINE && source.inventoryLevel >= (node.orderQuantity || 100)) {
          // Compute delay
          let delayDays = 0;
          if (params.geopoliticalTension) delayDays += 5;
          if (params.logisticDisruption) delayDays += 2;
          if (params.weatherEvent) delayDays += 3;
          if (Math.random() < params.portCongestionProb) delayDays += 3;
          if (Math.random() < params.transportDelayProb) delayDays += 1;
          // Tariff imposition increases effective cost (represented as extra lead time from customs)
          if (params.tariffImposition) delayDays += 2;

          // Bullwhip effect: upstream orders are amplified
          const orderQty = Math.ceil((node.orderQuantity || 100) * (node.type !== NodeType.RETAIL ? params.bullwhipFactor : 1));
          const actualQty = Math.min(orderQty, source.inventoryLevel);

          source.inventoryLevel -= actualQty;
          nextShipments.push({
            id: Math.random().toString(36).substr(2, 9),
            toId: node.id,
            quantity: actualQty,
            remainingDays: Math.max(1, Math.ceil(route.baseLeadTime + delayDays))
          });
          newLogs.push(`Day ${nextDay}: ${source.name} → ${node.name} (${actualQty} units, ${Math.ceil(route.baseLeadTime + delayDays)}d)`);
        }
      }
    }
  });

  const snapshot: HistorySnapshot = {
    day: nextDay,
    nodes: nextNodes.map(n => ({ id: n.id, inv: n.inventoryLevel, status: n.status }))
  };

  return { nextNodes, nextShipments, newLogs, snapshot };
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [nodes, setNodes] = useState<SupplyNode[]>(INITIAL_NODES);
  const [routes, setRoutes] = useState<Route[]>(INITIAL_ROUTES);
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const [selectedNode, setSelectedNode] = useState<SupplyNode | null>(null);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);

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

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { shipmentsRef.current = shipments; }, [shipments]);
  useEffect(() => { dayRef.current = day; }, [day]);
  useEffect(() => { routesRef.current = routes; }, [routes]);
  useEffect(() => { paramsRef.current = params; }, [params]);

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
        nextDay
      );

      setDay(nextDay);
      setNodes(nextNodes);
      setShipments(nextShipments);
      if (newLogs.length > 0) {
        setLogs(prev => [...newLogs, ...prev].slice(0, 50));
      }
      setHistory(prev => [...prev, snapshot].slice(-100));
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
      const state = await routingService.getState();
      if (state.nodes && state.nodes.length > 0) {
        const mappedNodes: SupplyNode[] = state.nodes.map((n: any) => {
          const meta = n.metadata || {};
          return {
            id: n.id, name: n.name, location: n.name,
            type: (meta.node_type as NodeType) || NodeType.WAREHOUSE,
            status: NodeStatus.OPTIMAL, inventoryLevel: meta.inventory || 50,
            maxCapacity: meta.capacity || 100, reorderPoint: 20,
            orderQuantity: 50, safetyStock: 10, targetServiceLevel: 95,
            reviewFrequency: 1, moq: 1, holdingCost: 1, obsolescenceRate: 0.01, shelfLife: 365,
            supplierLeadTime: meta.lead_time || 14, supplierReliability: meta.reliability || 95,
            supplierCostPerUnit: meta.cost || 10, yieldRate: meta.yield_rate || 98,
            setupTime: meta.setup_time || 4, batchSize: meta.batch_size || 50,
            throughputCapacity: meta.throughput || 500, automationLevel: meta.automation || 2,
            demandVolume: meta.demand || 100, demandVariability: meta.variability || 10,
            priceElasticity: meta.elasticity || -1.2,
            coordinates: { x: (n.lon + 180) * (800 / 360), y: (90 - n.lat) * (400 / 180), lat: n.lat, lng: n.lon }
          };
        });
        setNodes(mappedNodes);
      }
      if (state.routes && state.routes.length > 0) {
        const mappedRoutes: Route[] = state.routes.map((r: any) => ({
          id: Math.random().toString(36).substr(2, 9), fromId: r.fromId, toId: r.toId,
          mode: r.mode as TransportMode, distance: r.distance, baseLeadTime: 2,
          leadTimeVariability: 0.1, costPerUnitDistance: 0.004, vehicleCapacity: 100,
          shipmentFrequency: 1, fuelPrice: 1.5, customsTime: 0, disruptionProb: 0.01
        }));
        setRoutes(mappedRoutes);
      }
    };
    loadState();
  }, []);

  // Fix #6: Guard against NaN when nodes array is empty
  const networkHealth = nodes.length === 0 ? 0 : Math.round(
    (nodes.filter(n => n.status === NodeStatus.OPTIMAL).length / nodes.length) * 100
  );
  const activeShipments = shipments.length;
  const riskLevel = nodes.some(n => n.status === NodeStatus.CRITICAL) ? 'HIGH' :
                   nodes.some(n => n.status === NodeStatus.WARNING) ? 'MED' : 'LOW';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-12 gap-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 rounded-3xl border border-white/5 p-8">
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Network Health</p>
                  <h3 className="text-4xl font-bold text-white tracking-tighter">{networkHealth}%</h3>
                </div>
                <div className="bg-white/5 rounded-3xl border border-white/5 p-8">
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Active Shipments</p>
                  <h3 className="text-4xl font-bold text-white tracking-tighter">{activeShipments}</h3>
                </div>
                <div className="bg-white/5 rounded-3xl border border-white/5 p-8">
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Risk Level</p>
                  <h3 className={`text-4xl font-bold tracking-tighter ${riskLevel === 'HIGH' ? 'text-red-500' : 'text-white'}`}>{riskLevel}</h3>
                </div>
              </div>
              <div className="flex-1 min-h-[500px] relative">
                <Globe nodes={nodes} routes={routes} onNodeSelect={setSelectedNode} selectedNodeId={selectedNode?.id || null} />
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 h-full overflow-hidden">
               <div className="bg-[#050505] rounded-3xl border border-white/5 p-8 h-full flex flex-col">
                  <h3 className="text-white font-semibold flex items-center gap-2 mb-8"><Activity className="w-5 h-5" /> Telemetry</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {nodes.map(node => (
                      <div key={node.id} onClick={() => setSelectedNode(node)} className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer">
                        <div className="flex justify-between items-center"><span className="text-sm font-bold text-white">{node.name}</span><div className={`w-2 h-2 rounded-full ${node.status === NodeStatus.OPTIMAL ? 'bg-emerald-500' : node.status === NodeStatus.OFFLINE ? 'bg-gray-500' : 'bg-red-500'}`} /></div>
                        <p className="text-xs text-white/40">{node.type} • {node.inventoryLevel} units</p>
                      </div>
                    ))}
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
          />
        );
      case 'analytics':
        return <AnalyticsView history={history} />;
      case 'resilience':
        return <ResilienceHub nodes={nodes} routes={routes} params={params} setParams={setParams} setIsPlaying={setIsPlaying} setActiveTab={setActiveTab} />;
      case 'optimization':
        return <OptimizationView nodes={nodes} routes={routes} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <div className="text-white">Coming Soon</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      <nav className="w-20 lg:w-64 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-8"><h1 className="text-white font-black text-2xl tracking-tighter flex items-center gap-2"><Zap className="w-8 h-8 fill-white" />SolarChain</h1></div>
        <div className="flex-1 px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'builder', label: 'Builder', icon: Network },
            { id: 'simulation', label: 'Simulation', icon: PlayCircle },
            { id: 'resilience', label: 'Resilience', icon: ShieldAlert },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'optimization', label: 'Optimization', icon: Zap },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white text-black' : 'text-white/40'}`}>
              <item.icon className="w-5 h-5" /><span className="hidden lg:block text-[10px] font-bold uppercase">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-12 shrink-0">
          <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">Session Active • v4.2.0</p>
          <button className="px-6 py-2 bg-white text-black text-xs font-bold rounded-full">DEPLOY</button>
        </header>
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">{renderContent()}</div>
      </main>
    </div>
  );
}

export default App;
