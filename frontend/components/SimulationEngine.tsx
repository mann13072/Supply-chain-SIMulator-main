import React from 'react';
import { Play, Pause, RotateCcw, Activity, PlayCircle } from 'lucide-react';
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
      <div className="space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Simulation Monitor</h2>
            <p className="text-white/40 text-sm mt-1">{industryConfig.name} · Live inventory flow</p>
          </div>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors duration-500 ${isPlaying ? 'text-emerald-400' : 'text-white/20'}`}>
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isPlaying ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-white/15'}`} />
            {isPlaying ? 'Running' : 'Paused'}
          </div>
        </div>

        {/* Full-width control bar */}
        <div className={`flex items-center w-full rounded-2xl border transition-all duration-500 overflow-hidden ${
          isPlaying ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_24px_rgba(16,185,129,0.07)]' : 'bg-white/5 border-white/10'
        }`}>
          {/* State accent bar */}
          <div className={`w-1 self-stretch shrink-0 transition-all duration-500 ${isPlaying ? 'bg-emerald-500' : 'bg-transparent'}`} />

          {/* DAY counter */}
          <div className="px-4 py-3 shrink-0">
            <p className="text-[9px] text-white/40 uppercase tracking-widest leading-none mb-1">Day</p>
            <p className={`text-2xl font-mono font-black tabular-nums leading-none transition-colors duration-300 ${isPlaying ? 'text-emerald-400' : 'text-white'}`}>
              {String(day).padStart(3, '0')}
            </p>
          </div>

          <div className="h-8 w-px bg-white/10 mx-1 shrink-0" />

          {/* Reset + Play buttons */}
          <div className="flex items-center gap-1 px-2 py-2 shrink-0">
            <button onClick={resetSimulation} className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${
                isPlaying
                  ? 'bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.5)] hover:bg-emerald-400'
                  : 'bg-white text-black hover:scale-105 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-black" />}
              <span className="hidden sm:inline text-xs tracking-wide">{isPlaying ? 'PAUSE' : 'RUN'}</span>
            </button>
          </div>

          {/* Speed segmented control — pushed to right */}
          <div className="flex gap-0.5 p-2 ml-auto shrink-0">
            {[1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                  speed === s
                    ? isPlaying ? 'bg-emerald-500 text-white' : 'bg-white text-black'
                    : 'text-white/30 hover:text-white hover:bg-white/5'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Simulation progress track */}
        <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min((day / 365) * 100, 100)}%`,
              backgroundColor: isPlaying ? '#10b981' : 'rgba(255,255,255,0.2)'
            }}
          />
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
