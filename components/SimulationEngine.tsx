import React from 'react';
import { Play, Pause, RotateCcw, FastForward, TrendingUp, DollarSign, Package, ShieldAlert, Activity, PlayCircle } from 'lucide-react';
import { SupplyNode, Route, NodeStatus, NodeType } from '../types';

interface SimulationEngineProps {
  nodes: SupplyNode[];
  routes: Route[];
  day: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  logs: string[];
  shipments: any[];
  resetSimulation: () => void;
}

const SimulationEngine: React.FC<SimulationEngineProps> = ({ 
  nodes, routes, day, isPlaying, setIsPlaying, speed, setSpeed, logs, shipments, resetSimulation 
}) => {
  
  // Calculations based on live session data
  const serviceLevel = nodes.length > 0 ? Math.round(
    (nodes.filter(n => n.status === NodeStatus.OPTIMAL).length / nodes.length) * 100
  ) : 0;
  
  const totalCost = nodes.reduce((acc, n) => {
    const invCost = n.inventoryLevel * (n.holdingCost || 0.5);
    const opCost = (n.type === NodeType.FACTORY ? 500 : 200); 
    return acc + invCost + opCost;
  }, 0);

  const inventoryValue = nodes.reduce((acc, n) => acc + (n.inventoryLevel * 100), 0);
  const transitValue = shipments.reduce((acc, s) => acc + (s.quantity * 100), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Simulation Monitor</h2>
          <p className="text-white/40 text-sm mt-1">Live tracking of global inventory flow</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
          <div className="px-4 py-2 text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Day</p>
            <p className="text-xl font-mono text-white font-bold">{day}</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex gap-1 p-1">
            <button onClick={resetSimulation} className="p-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl"><RotateCcw className="w-5 h-5" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-white text-black rounded-xl hover:scale-105 transition-all">
              {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black" />}
            </button>
            <button onClick={() => setSpeed(speed === 4 ? 1 : speed * 2)} className="p-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-1">
              <FastForward className="w-5 h-5" /><span className="text-xs font-bold">{speed}x</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Service Level</p>
            <h3 className="text-5xl font-bold text-white tracking-tighter mb-4">{serviceLevel}%</h3>
            <p className="text-white/40 text-xs">{serviceLevel > 90 ? 'Healthy' : 'Replenishment Lagging'}</p>
          </div>
          <div className="bg-white/5 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Daily OpEx</p>
            <h3 className="text-5xl font-bold text-white tracking-tighter mb-4">${(totalCost / 1000).toFixed(1)}K</h3>
            <p className="text-white/40 text-xs">Dynamic operational costs</p>
          </div>
          <div className="bg-white/5 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Chain Value</p>
            <h3 className="text-5xl font-bold text-white tracking-tighter mb-4">${((inventoryValue + transitValue) / 1000000).toFixed(2)}M</h3>
            <p className="text-white/40 text-xs">{shipments.length} Active Shipments</p>
          </div>
          <div className="bg-white/5 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Network Health</p>
            <h3 className={`text-5xl font-bold tracking-tighter ${serviceLevel < 80 ? 'text-red-500' : 'text-white'}`}>{serviceLevel < 80 ? 'CRITICAL' : 'STABLE'}</h3>
            <p className="text-white/40 text-xs">{nodes.filter(n => n.status !== 'OPTIMAL').length} Warnings</p>
          </div>
        </div>

        <div className="bg-[#050505] rounded-3xl border border-white/5 p-8 flex flex-col h-[500px]">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" />Node Inventory</h3>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {nodes.map(node => (
              <div key={node.id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-white truncate">{node.name}</span>
                  <span className={`text-[10px] font-mono ${node.inventoryLevel < (node.reorderPoint || 20) ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {node.inventoryLevel} / {node.maxCapacity}
                  </span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${(node.inventoryLevel / node.maxCapacity) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-[#050505] rounded-3xl border border-white/5 p-8 flex flex-col h-[400px]">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2"><Activity className="w-5 h-5" /> Operational Log</h3>
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20"><PlayCircle className="w-8 h-8 mb-2" /><p className="text-xs">No active events</p></div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-[10px] font-mono text-white/60 border-l border-white/10 pl-3 py-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationEngine;
