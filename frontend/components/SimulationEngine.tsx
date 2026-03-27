import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Activity, PlayCircle } from 'lucide-react';
import { SupplyNode, Route, NodeStatus, NodeType, InTransitShipment, SimulationParams, IndustryConfig } from '../types';
import SimulationPanel from './SimulationPanel';
import { formatCurrencyCompact } from '../utils/formatting';

interface SimulationEngineProps {
  nodes: SupplyNode[];
  routes: Route[];
  setNodes: (nodes: SupplyNode[]) => void;
  day: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  logs: string[];
  shipments: InTransitShipment[];
  resetSimulation: () => void;
  params: SimulationParams;
  setParams: (params: SimulationParams) => void;
  industryConfig: IndustryConfig;
}

const SimulationEngine: React.FC<SimulationEngineProps> = ({
  nodes, routes, day, isPlaying, setIsPlaying, speed, setSpeed, logs, shipments, resetSimulation,
  params, setParams, industryConfig
}) => {

  const serviceLevel = nodes.length > 0 ? Math.round(
    (nodes.filter(n => n.status === NodeStatus.OPTIMAL).length / nodes.length) * 100
  ) : 0;

  const totalCost = nodes.reduce((acc, n) => {
    const invCost = n.inventoryLevel * (n.holdingCost || 0.5);
    const opCost = n.type === NodeType.FACTORY
      ? (n.productionCapacity || 100) * (n.holdingCost || 0.5)
      : (n.throughputCapacity || 200) * 0.1;
    return acc + invCost + opCost;
  }, 0);

  const inventoryValue = nodes.reduce((acc, n) =>
    acc + (n.inventoryLevel * (n.supplierCostPerUnit || 10)), 0
  );
  const avgUnitCost = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + (n.supplierCostPerUnit || 10), 0) / nodes.length
    : 10;
  const transitValue = shipments.reduce((acc, s) => acc + (s.quantity * avgUnitCost), 0);

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Simulation Monitor</h2>
          <p className="text-white/40 text-sm mt-1">{industryConfig.name} · Live inventory flow</p>
        </div>

        <div className="flex items-center gap-2 md:gap-4 bg-white/5 p-1.5 md:p-2 rounded-2xl border border-white/10 self-start sm:self-auto">
          <div className="px-3 py-1 md:px-4 md:py-2 text-right">
            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-widest">Day</p>
            <p className="text-lg md:text-xl font-mono text-white font-bold">{day}</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex gap-0.5 md:gap-1 p-0.5 md:p-1">
            <button onClick={resetSimulation} className="p-2 md:p-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl"><RotateCcw className="w-4 h-4 md:w-5 md:h-5" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 md:p-3 bg-white text-black rounded-xl hover:scale-105 transition-all">
              {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-black" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-black" />}
            </button>
            <button onClick={() => setSpeed(speed === 4 ? 1 : speed * 2)} className="p-2 md:p-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-1">
              <FastForward className="w-4 h-4 md:w-5 md:h-5" /><span className="text-xs font-bold">{speed}x</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-8">
            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1 md:mb-2">Service Level</p>
            <h3 className="text-2xl md:text-5xl font-bold text-white tracking-tighter mb-1 md:mb-4">{serviceLevel}%</h3>
            <p className="text-white/40 text-xs">{serviceLevel > 90 ? 'Healthy' : 'Replenishment Lagging'}</p>
          </div>
          <div className="bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-8">
            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1 md:mb-2">Daily OpEx</p>
            <h3 className="text-2xl md:text-5xl font-bold text-white tracking-tighter mb-1 md:mb-4">{formatCurrencyCompact(totalCost, industryConfig)}</h3>
            <p className="text-white/40 text-xs">Dynamic operational costs</p>
          </div>
          <div className="bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-8">
            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1 md:mb-2">Chain Value</p>
            <h3 className="text-2xl md:text-5xl font-bold text-white tracking-tighter mb-1 md:mb-4">{formatCurrencyCompact(inventoryValue + transitValue, industryConfig)}</h3>
            <p className="text-white/40 text-xs">{shipments.length} Active Shipments</p>
          </div>
          <div className="bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-8">
            <p className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1 md:mb-2">Network Health</p>
            <h3 className={`text-2xl md:text-5xl font-bold tracking-tighter ${serviceLevel < 80 ? 'text-red-500' : 'text-white'}`}>{serviceLevel < 80 ? 'CRITICAL' : 'STABLE'}</h3>
            <p className="text-white/40 text-xs">{nodes.filter(n => n.status !== 'OPTIMAL').length} Warnings</p>
          </div>
        </div>

        <div className="bg-[#050505] rounded-2xl md:rounded-3xl border border-white/5 p-4 md:p-8 flex flex-col h-auto md:h-[500px]">
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
      </div>

      {/* Simulation Parameters Panel */}
      <SimulationPanel params={params} setParams={setParams} industryConfig={industryConfig} />

      <div className="bg-[#050505] rounded-3xl border border-white/5 p-8 flex flex-col h-[400px]">
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
  );
};

export default SimulationEngine;
