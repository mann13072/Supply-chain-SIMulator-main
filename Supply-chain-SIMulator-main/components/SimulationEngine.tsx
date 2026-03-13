import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, AlertTriangle, TrendingUp, DollarSign, Package, ShieldAlert, Activity, PlayCircle } from 'lucide-react';
import { SupplyNode, Route, SimulationState, KPI, NodeStatus } from '../types';
import { motion } from 'framer-motion';

interface SimulationEngineProps {
  nodes: SupplyNode[];
  routes: Route[];
  setNodes: React.Dispatch<React.SetStateAction<SupplyNode[]>>;
}

interface InTransitShipment {
  id: string;
  toId: string;
  quantity: number;
  remainingDays: number;
}

const SimulationEngine: React.FC<SimulationEngineProps> = ({ nodes, routes, setNodes }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [day, setDay] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [shipments, setShipments] = useState<InTransitShipment[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const runSimulationStep = () => {
    // 1. Increment day
    setDay(prev => prev + 1);
    
    // 2. We perform the heavy lifting in a single coordinated logic block
    // We'll use the current state values. Since this is in an interval,
    // we need to be careful with stale closures. 
    // However, setNodes(prev => ...) is the standard way.
    
    setNodes(currentNodes => {
      const nextNodes = JSON.parse(JSON.stringify(currentNodes)) as SupplyNode[];
      const arrivalLogs: string[] = [];
      const shipmentLogs: string[] = [];
      
      // Calculate next shipments based on CURRENT shipments state
      // (This is the tricky part because shipments state is separate)
      // We'll manage shipments slightly differently to avoid the crash.
      return nextNodes; 
    });
  };

  // REFACTORED: Unified Simulation Logic to prevent "Too many re-renders"
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setDay(d => {
          const nextDay = d + 1;
          
          setNodes(prevNodes => {
            const nextNodes = [...prevNodes.map(n => ({ ...n }))];
            let newShipments: InTransitShipment[] = [];
            
            // We use a functional update for shipments to keep them in sync
            setShipments(prevShipments => {
              const remaining: InTransitShipment[] = [];
              const processedArriving: string[] = [];

              // Process arriving
              prevShipments.forEach(s => {
                if (s.remainingDays <= 1) {
                  const targetNode = nextNodes.find(n => n.id === s.toId);
                  if (targetNode) {
                    targetNode.inventoryLevel = Math.min(targetNode.maxCapacity, targetNode.inventoryLevel + s.quantity);
                    processedArriving.push(`Day ${nextDay}: Shipment arrived at ${targetNode.name} (${s.quantity} units)`);
                  }
                } else {
                  remaining.push({ ...s, remainingDays: s.remainingDays - 1 });
                }
              });

              // Process Node Logic
              nextNodes.forEach(node => {
                if (node.type === 'RETAIL') {
                  const demand = Math.floor(Math.random() * (node.demandVolume || 20)) + 5;
                  node.inventoryLevel = Math.max(0, node.inventoryLevel - demand);
                  node.status = node.inventoryLevel < (node.reorderPoint || 20) ? NodeStatus.WARNING : NodeStatus.OPTIMAL;
                } else if (node.type === 'FACTORY') {
                  const production = Math.floor(Math.random() * (node.productionCapacity || 100)) + 10;
                  node.inventoryLevel = Math.min(node.maxCapacity, node.inventoryLevel + production);
                }

                // Trigger shipments
                if (node.inventoryLevel < (node.reorderPoint || 50)) {
                  const route = routes.find(r => r.toId === node.id);
                  if (route) {
                    const source = nextNodes.find(n => n.id === route.fromId);
                    if (source && source.inventoryLevel >= (node.orderQuantity || 100)) {
                      const qty = node.orderQuantity || 100;
                      source.inventoryLevel -= qty;
                      remaining.push({
                        id: Math.random().toString(36).substr(2, 9),
                        toId: node.id,
                        quantity: qty,
                        remainingDays: route.baseLeadTime
                      });
                      processedArriving.push(`Day ${nextDay}: ${source.name} shipped ${qty} units to ${node.name}`);
                    }
                  }
                }
              });

              if (processedArriving.length > 0) {
                setLogs(prevLogs => [...processedArriving, ...prevLogs].slice(0, 50));
              }

              return remaining;
            });

            return nextNodes;
          });
          
          return nextDay;
        });
      }, 1000 / speed);
    }

    return () => clearInterval(interval);
  }, [isPlaying, speed, routes]); // day and shipments removed from deps to prevent re-render loops

  const resetSimulation = () => {
    setIsPlaying(false);
    setDay(0);
    setLogs([]);
    setShipments([]);
  };

  // Dynamic Calculations for Simulation View
  const serviceLevel = nodes.length > 0 ? Math.round(
    (nodes.filter(n => n.status === NodeStatus.OPTIMAL).length / nodes.length) * 100
  ) : 0;
  
  const totalCost = nodes.reduce((acc, n) => acc + (n.inventoryLevel * 0.5) + (n.operatingCost || 1000), 0);
  const inventoryValue = nodes.reduce((acc, n) => acc + (n.inventoryLevel * 100), 0);
  const transitValue = shipments.reduce((acc, s) => acc + (s.quantity * 100), 0);
  const riskCount = nodes.filter(n => n.status === NodeStatus.CRITICAL).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Simulation Engine</h2>
          <p className="text-white/40 text-sm mt-1">Real-time inventory flow and replenishment dynamics</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
          <div className="px-4 py-2">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Simulation Day</p>
            <p className="text-xl font-mono text-white font-bold">{day}</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex gap-1 p-1">
            <button 
              onClick={resetSimulation}
              className="p-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-white text-black rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black" />}
            </button>
            <button 
              onClick={() => setSpeed(prev => prev === 4 ? 1 : prev * 2)}
              className="p-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-1"
            >
              <FastForward className="w-5 h-5" />
              <span className="text-xs font-bold">{speed}x</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-24 h-24 text-white" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Service Level</p>
            <h3 className="text-5xl font-bold text-white tracking-tighter mb-4">{serviceLevel}<span className="text-white/20 text-2xl">%</span></h3>
            <div className={`flex items-center gap-2 text-xs font-medium ${serviceLevel > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${serviceLevel > 90 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {serviceLevel > 90 ? 'Optimal Performance' : 'Replenishment Lagging'}
            </div>
          </div>

          <div className="bg-white/5 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <DollarSign className="w-24 h-24 text-white" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Daily OpEx</p>
            <h3 className="text-5xl font-bold text-white tracking-tighter mb-4">${(totalCost / 1000).toFixed(1)}<span className="text-white/20 text-2xl">K</span></h3>
            <p className="text-white/40 text-xs">Based on current node activity</p>
          </div>

          <div className="bg-white/5 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Package className="w-24 h-24 text-white" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Chain Inventory Value</p>
            <h3 className="text-5xl font-bold text-white tracking-tighter mb-4">${((inventoryValue + transitValue) / 1000000).toFixed(2)}<span className="text-white/20 text-2xl">M</span></h3>
            <p className="text-white/40 text-xs">{shipments.length} Shipments In Transit</p>
          </div>

          <div className="bg-white/5 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-24 h-24 text-white" />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Network Health</p>
            <h3 className={`text-5xl font-bold tracking-tighter ${serviceLevel < 80 ? 'text-red-500' : 'text-white'}`}>
              {serviceLevel < 80 ? 'CRITICAL' : 'STABLE'}
            </h3>
            <p className="text-white/40 text-xs">{nodes.filter(n => n.status !== 'OPTIMAL').length} Nodes Requiring Attention</p>
          </div>
        </div>

        {/* Live Inventory Status */}
        <div className="bg-[#050505] rounded-3xl border border-white/5 p-8 flex flex-col h-[500px]">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Live Node Inventory
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {nodes.map(node => (
              <div key={node.id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-white truncate">{node.name}</span>
                  <span className={`text-[10px] font-mono ${node.inventoryLevel < node.reorderPoint! ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {node.inventoryLevel.toLocaleString()} / {node.maxCapacity.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${node.inventoryLevel < node.reorderPoint! ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${(node.inventoryLevel / node.maxCapacity) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Logs */}
        <div className="col-span-12 lg:col-span-3 bg-[#050505] rounded-3xl border border-white/5 p-8 flex flex-col h-[400px]">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-white/40" />
            Operational Log
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                <PlayCircle className="w-8 h-8 mb-2" />
                <p className="text-xs">Start simulation to stream events</p>
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-[10px] font-mono text-white/60 border-l border-white/10 pl-3 py-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationEngine;
