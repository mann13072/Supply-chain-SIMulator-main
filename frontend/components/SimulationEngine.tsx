import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Activity, AlertTriangle, X, Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupplyNode, Route, NodeStatus, NodeType, InTransitShipment, SimulationParams, IndustryConfig, HistorySnapshot } from '../types';
import SimulationPanel from './SimulationPanel';
import { formatCurrencyCompact } from '../utils/formatting';
import { routingService } from '../services/routingService';

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
  history: HistorySnapshot[];
}

const SimulationEngine: React.FC<SimulationEngineProps> = ({
  nodes, routes, day, isPlaying, setIsPlaying, speed, setSpeed, logs, shipments, resetSimulation,
  params, setParams, industryConfig, history
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSaveRun = async () => {
    if (!saveName.trim() || history.length === 0) return;
    setIsSaving(true);
    setSaveError('');
    const result = await routingService.saveSimulationRun({
      name: saveName.trim(),
      description: saveDesc.trim() || undefined,
      nodes_snapshot: nodes,
      routes_snapshot: routes,
      params_snapshot: params,
      industry_config: industryConfig,
      history,
      tags: saveTags ? saveTags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    });
    setIsSaving(false);
    if (result && result.error) {
      setSaveError(result.error);
    } else if (result && result.id) {
      setSaveSuccess(true);
      setTimeout(() => {
        setShowSaveModal(false);
        setSaveName('');
        setSaveDesc('');
        setSaveTags('');
        setSaveSuccess(false);
      }, 1200);
    } else {
      setSaveError('Failed to save — please try again.');
    }
  };

  const handleResetClick = () => {
    // If simulation hasn't run yet, just reset silently
    if (day === 0) {
      resetSimulation();
      return;
    }
    setIsPlaying(false);
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setShowResetConfirm(false);
    resetSimulation();
  };

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

      {/* ── Top bar — 2 rows on mobile, 1 row on sm+ ─────────────────── */}
      <div className={`rounded-xl border transition-all duration-500 overflow-hidden ${
        isPlaying
          ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.06)]'
          : 'bg-white/[0.03] border-white/[0.08]'
      }`}>
        {/* Row 1 (always visible): accent | title | day | status dot */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className={`w-0.5 h-5 rounded-full shrink-0 transition-all duration-500 ${isPlaying ? 'bg-emerald-500' : 'bg-white/10'}`} />

          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-white tracking-tight">Simulation Monitor</span>
            <span className="hidden sm:inline text-white/25 text-xs ml-2">{industryConfig.name}</span>
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

          {/* Status dot — always visible */}
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${
            isPlaying ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.9)] animate-pulse' : 'bg-white/15'
          }`} />

          {/* Controls inline on sm+ only */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <div className="h-4 w-px bg-white/10 mr-1" />
            <button onClick={handleResetClick} className="p-1.5 text-white/25 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Reset">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {day > 0 && !isPlaying && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="p-1.5 text-white/25 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                title="Save Run"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all duration-300 ${
                isPlaying
                  ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:bg-emerald-400'
                  : 'bg-white text-black hover:scale-105 shadow-[0_0_8px_rgba(255,255,255,0.15)]'
              }`}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-black" />}
              {isPlaying ? 'PAUSE' : 'RUN'}
            </button>
            <div className="flex items-center gap-0.5 ml-1">
              {[1, 2, 4].map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                    speed === s
                      ? isPlaying ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'
                      : 'text-white/20 hover:text-white/50 hover:bg-white/5'
                  }`}
                >{s}×</button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2 — mobile only: reset | play | speed */}
        <div className={`sm:hidden flex items-center gap-2 px-3 pb-2 border-t border-white/[0.05]`}>
          <button onClick={handleResetClick} className="p-1.5 text-white/25 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {day > 0 && !isPlaying && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="p-1.5 text-white/25 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
              title="Save Run"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 ${
              isPlaying
                ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-white text-black'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-black" />}
            {isPlaying ? 'PAUSE' : 'RUN'}
          </button>
          <div className="flex items-center gap-0.5">
            {[1, 2, 4].map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  speed === s
                    ? isPlaying ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'
                    : 'text-white/20 hover:text-white/50 hover:bg-white/5'
                }`}
              >{s}×</button>
            ))}
          </div>
        </div>
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

      {/* ── Save Run Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-white font-semibold text-base flex items-center gap-2">
                  <Save className="w-4 h-4 text-emerald-400" />
                  Save Simulation Run
                </h3>
                <p className="text-white/35 text-xs mt-1">Day {day} &middot; {history.length} snapshots &middot; {nodes.length} nodes</p>
              </div>

              <div className="px-5 pb-4 space-y-3">
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-widest mb-1 block">Name *</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-all"
                    placeholder="e.g. Peak Season Stress Test"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-widest mb-1 block">Description</label>
                  <textarea
                    value={saveDesc}
                    onChange={e => setSaveDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-all h-16 resize-none"
                    placeholder="Optional notes about this run..."
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-widest mb-1 block">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={saveTags}
                    onChange={e => setSaveTags(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-all"
                    placeholder="e.g. baseline, q4, stress-test"
                  />
                </div>
              </div>

              {saveError && (
                <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {saveError}
                </div>
              )}
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={() => { setShowSaveModal(false); setSaveError(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/50 bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRun}
                  disabled={!saveName.trim() || isSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : saveSuccess ? (
                    <><Check className="w-3.5 h-3.5" /> Saved!</>
                  ) : (
                    <><Save className="w-3.5 h-3.5" /> Save Run</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reset Confirmation Modal ───────────────────────────────── */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-sm mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm">Reset Simulation?</h3>
                  <p className="text-white/35 text-xs mt-0.5">This action cannot be undone</p>
                </div>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="p-1.5 text-white/20 hover:text-white/50 transition-colors rounded-lg hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 pb-4">
                <p className="text-white/50 text-xs leading-relaxed">
                  This will reset <span className="text-white font-medium">Day {day}</span> of simulation data including:
                </p>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-center gap-2 text-xs text-white/40">
                    <span className="w-1 h-1 rounded-full bg-red-400/60" />
                    All node inventories and statuses restored to pre-simulation values
                  </li>
                  <li className="flex items-center gap-2 text-xs text-white/40">
                    <span className="w-1 h-1 rounded-full bg-red-400/60" />
                    Simulation history and analytics data cleared
                  </li>
                  <li className="flex items-center gap-2 text-xs text-white/40">
                    <span className="w-1 h-1 rounded-full bg-red-400/60" />
                    All in-transit shipments and event logs removed
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/50 bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SimulationEngine;
