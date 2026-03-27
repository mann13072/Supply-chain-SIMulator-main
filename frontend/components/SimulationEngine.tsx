import React from 'react';
import { Play, Pause, RotateCcw, Activity } from 'lucide-react';
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
  const warnings = nodes.filter(n => n.status !== NodeStatus.OPTIMAL).length;

  const kpis = [
    {
      label: 'Service Level',
      value: `${serviceLevel}%`,
      sub: serviceLevel > 90 ? 'Healthy' : 'Lagging',
      accent: serviceLevel < 80 ? 'text-red-400' : 'text-white',
    },
    {
      label: 'Daily OpEx',
      value: formatCurrencyCompact(totalCost, industryConfig),
      sub: 'Holding + ops',
      accent: 'text-white',
    },
    {
      label: 'Chain Value',
      value: formatCurrencyCompact(inventoryValue + transitValue, industryConfig),
      sub: `${shipments.length} shipments`,
      accent: 'text-white',
    },
    {
      label: 'Network',
      value: serviceLevel < 80 ? 'CRITICAL' : 'STABLE',
      sub: `${warnings} warning${warnings !== 1 ? 's' : ''}`,
      accent: serviceLevel < 80 ? 'text-red-500' : 'text-emerald-400',
    },
  ];

  return (
    <div className="space-y-3 animate-in fade-in duration-500">

      {/* ── Unified top bar ─────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-500 ${
        isPlaying
          ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.06)]'
          : 'bg-white/[0.03] border-white/[0.08]'
      }`}>
        {/* State accent line */}
        <div className={`w-0.5 h-5 rounded-full shrink-0 transition-all duration-500 ${isPlaying ? 'bg-emerald-500' : 'bg-white/10'}`} />

        {/* Title */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-bold text-white tracking-tight">Simulation Monitor</span>
          <span className="hidden sm:inline text-white/25 text-xs">{industryConfig.name}</span>
        </div>

        {/* Day counter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[8px] text-white/25 uppercase tracking-widest font-bold">Day</span>
          <span className={`text-lg font-mono font-black tabular-nums leading-none transition-colors duration-300 ${
            isPlaying ? 'text-emerald-400' : 'text-white'
          }`}>
            {String(day).padStart(3, '0')}
          </span>
        </div>

        <div className="h-4 w-px bg-white/10 shrink-0" />

        {/* Reset */}
        <button
          onClick={resetSimulation}
          className="p-1.5 text-white/25 hover:text-white hover:bg-white/5 rounded-lg transition-all shrink-0"
          title="Reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all duration-300 shrink-0 ${
            isPlaying
              ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:bg-emerald-400'
              : 'bg-white text-black hover:scale-105 shadow-[0_0_8px_rgba(255,255,255,0.15)]'
          }`}
        >
          {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-black" />}
          {isPlaying ? 'PAUSE' : 'RUN'}
        </button>

        {/* Speed */}
        <div className="flex items-center gap-0.5 shrink-0">
          {[1, 2, 4].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                speed === s
                  ? isPlaying ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'
                  : 'text-white/20 hover:text-white/50 hover:bg-white/5'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Status dot */}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${
          isPlaying ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.9)] animate-pulse' : 'bg-white/15'
        }`} />
      </div>

      {/* Progress track */}
      <div className="h-px w-full bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min((day / 365) * 100, 100)}%`,
            backgroundColor: isPlaying ? '#10b981' : 'rgba(255,255,255,0.15)',
          }}
        />
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpis.map(({ label, value, sub, accent }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
            <p className="text-[8px] text-white/30 uppercase tracking-[0.18em] font-bold mb-1.5">{label}</p>
            <p className={`text-xl font-bold tracking-tight leading-none mb-1 ${accent}`}>{value}</p>
            <p className="text-[10px] text-white/25">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Node inventory + Operational log side-by-side ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Node Inventory */}
        <div className="bg-[#050505] border border-white/[0.05] rounded-xl p-4 flex flex-col h-52">
          <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Node Inventory
          </p>
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {nodes.map(node => {
              const pct = Math.round((node.inventoryLevel / node.maxCapacity) * 100);
              const low = node.inventoryLevel < (node.reorderPoint || 20);
              const offline = node.status === NodeStatus.OFFLINE;
              return (
                <div key={node.id} className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] truncate flex-1 min-w-0 ${offline ? 'text-white/20' : 'text-white/50'}`}>
                    {node.name}
                  </span>
                  {offline ? (
                    <span className="text-[9px] text-white/20 font-mono shrink-0">OFFLINE</span>
                  ) : (
                    <>
                      <span className={`text-[9px] font-mono shrink-0 w-7 text-right ${low ? 'text-amber-400' : 'text-white/30'}`}>
                        {pct}%
                      </span>
                      <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden shrink-0">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            offline ? 'bg-white/10' : low ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Log */}
        <div className="bg-[#050505] border border-white/[0.05] rounded-xl p-4 flex flex-col h-52">
          <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            Operational Log
          </p>
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center opacity-20">
                <p className="text-xs font-mono">No active events</p>
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`text-[9px] font-mono border-l pl-2 py-0.5 leading-relaxed ${
                    log.includes('STOCKOUT') || log.includes('DISASTER') || log.includes('FAILURE')
                      ? 'text-red-400/70 border-red-500/30'
                      : log.includes('STRIKE') || log.includes('CYBER') || log.includes('RECALL')
                      ? 'text-amber-400/70 border-amber-500/30'
                      : log.includes('RECOVERED') || log.includes('POOL')
                      ? 'text-emerald-400/60 border-emerald-500/20'
                      : 'text-white/40 border-white/10'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Simulation Parameters Panel ──────────────────────────────── */}
      <SimulationPanel params={params} setParams={setParams} industryConfig={industryConfig} />
    </div>
  );
};

export default SimulationEngine;
