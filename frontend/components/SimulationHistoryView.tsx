import React, { useState, useEffect } from 'react';
import { Clock, Trash2, Share2, Download, Play, Eye, Link2, Check, X, Search, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimulationRunSummary, SimulationRunDetail, HistorySnapshot, IndustryConfig } from '../types';
import { routingService } from '../services/routingService';
import { formatCurrencyCompact } from '../utils/formatting';

interface SimulationHistoryViewProps {
  industryConfig: IndustryConfig;
  onLoadRun: (run: SimulationRunDetail) => void;
}

const SimulationHistoryView: React.FC<SimulationHistoryViewProps> = ({ industryConfig, onLoadRun }) => {
  const [runs, setRuns] = useState<SimulationRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareData, setCompareData] = useState<any[] | null>(null);
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    const data = await routingService.listSimulationRuns();
    setRuns(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await routingService.deleteSimulationRun(id);
    if (ok) setRuns(runs.filter(r => r.id !== id));
  };

  const handleLoad = async (id: string) => {
    setLoadingRunId(id);
    const detail = await routingService.loadSimulationRun(id);
    setLoadingRunId(null);
    if (detail) onLoadRun(detail as SimulationRunDetail);
  };

  const handleShare = async (id: string) => {
    const run = runs.find(r => r.id === id);
    if (!run) return;
    const result = await routingService.shareSimulationRun(id, !run.is_shared);
    if (result) {
      setRuns(runs.map(r => r.id === id ? { ...r, is_shared: result.is_shared } : r));
      if (result.share_token) {
        const url = `${window.location.origin}/shared/${result.share_token}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else if (next.size < 5) next.add(id);
    setSelectedIds(next);
  };

  const handleCompare = async () => {
    if (selectedIds.size < 2) return;
    const data = await routingService.compareSimulationRuns([...selectedIds]);
    setCompareData(data);
  };

  const filtered = runs.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Clock className="w-7 h-7 text-white/30" />
            Simulation History
          </h2>
          <p className="text-white/40 text-sm mt-1">Browse, replay, and compare past simulation runs</p>
        </div>
        {selectedIds.size >= 2 && (
          <button
            onClick={handleCompare}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-black hover:bg-white/90 rounded-xl font-medium transition-all"
          >
            Compare ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search runs..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
        />
      </div>

      {/* Compare panel */}
      <AnimatePresence>
        {compareData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/5 rounded-2xl border border-white/10 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Comparison</h3>
              <button onClick={() => { setCompareData(null); setSelectedIds(new Set()); }} className="p-1.5 text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] text-white/30 uppercase tracking-widest">
                    <th className="pb-3 pr-4">Run</th>
                    <th className="pb-3 pr-4">Days</th>
                    <th className="pb-3 pr-4">Revenue</th>
                    <th className="pb-3 pr-4">Cost</th>
                    <th className="pb-3 pr-4">Fill Rate</th>
                    <th className="pb-3 pr-4">Disruptions</th>
                    <th className="pb-3">CO2 (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {compareData.map((r: any) => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="py-3 pr-4 text-white font-medium">{r.name}</td>
                      <td className="py-3 pr-4 text-white/60">{r.total_days}</td>
                      <td className="py-3 pr-4 text-emerald-400 font-mono">{formatCurrencyCompact(r.total_revenue || 0, industryConfig)}</td>
                      <td className="py-3 pr-4 text-red-400 font-mono">{formatCurrencyCompact(r.total_cost || 0, industryConfig)}</td>
                      <td className="py-3 pr-4 text-white/60">{(r.avg_fill_rate || 0).toFixed(1)}%</td>
                      <td className="py-3 pr-4 text-white/60">{r.total_disruptions || 0}</td>
                      <td className="py-3 text-white/60">{(r.total_carbon_kg || 0).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Run cards */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Clock className="w-12 h-12 text-white/10 mb-4" />
          <p className="text-white/40">
            {runs.length === 0
              ? 'No simulation runs saved yet. Run a simulation and click "Save Run" to start building your history.'
              : 'No runs match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(run => {
            const isSelected = selectedIds.has(run.id);
            // Same formula as AnalyticsView: Revenue - COGS - operating overhead
            // For old runs missing COGS data, fall back to Revenue - total_cost
            const hasCogs = run.total_cogs != null && run.total_cogs > 0;
            const profit = hasCogs
              ? (run.total_revenue || 0) - run.total_cogs - (run.total_operating_cost || 0)
              : (run.total_revenue || 0) - (run.total_cost || 0);
            return (
              <motion.div
                layout
                key={run.id}
                className={`bg-white/5 rounded-2xl border p-5 transition-all group ${
                  isSelected ? 'border-white/30 bg-white/[0.08]' : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Top row */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{run.name}</h3>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {new Date(run.created_at).toLocaleDateString()} &middot; {run.total_days} days &middot; {run.node_count} nodes
                    </p>
                  </div>
                  <button
                    onClick={() => toggleSelect(run.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-2 transition-all ${
                      isSelected ? 'bg-white border-white' : 'border-white/15 hover:border-white/30'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-black" />}
                  </button>
                </div>

                {/* Description */}
                {run.description && (
                  <p className="text-xs text-white/40 mb-3 line-clamp-2">{run.description}</p>
                )}

                {/* KPI grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                    <p className="text-[8px] text-white/30 uppercase tracking-widest">Revenue</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono">{formatCurrencyCompact(run.total_revenue || 0, industryConfig)}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                    <p className="text-[8px] text-white/30 uppercase tracking-widest">Cost</p>
                    <p className="text-sm font-bold text-red-400 font-mono">{formatCurrencyCompact(run.total_cost || 0, industryConfig)}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                    <p className="text-[8px] text-white/30 uppercase tracking-widest">Profit</p>
                    <p className={`text-sm font-bold font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrencyCompact(profit, industryConfig)}
                    </p>
                  </div>
                </div>

                {/* Bottom stats */}
                <div className="flex items-center gap-3 text-[10px] text-white/30 mb-4">
                  <span>Fill: {(run.avg_fill_rate || 0).toFixed(0)}%</span>
                  <span>&middot;</span>
                  <span>{run.total_disruptions || 0} disruptions</span>
                  <span>&middot;</span>
                  <span>{(run.total_carbon_kg || 0).toFixed(0)} kg CO2</span>
                </div>

                {/* Tags */}
                {run.tags && run.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {run.tags.map(tag => (
                      <span key={tag} className="text-[9px] bg-white/5 text-white/40 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLoad(run.id)}
                    disabled={loadingRunId === run.id}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    {loadingRunId === run.id ? (
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    View
                  </button>
                  <button
                    onClick={() => handleShare(run.id)}
                    className={`px-3 py-2 rounded-lg border transition-all text-xs ${
                      run.is_shared
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/50'
                    }`}
                    title={run.is_shared ? 'Shared — click to copy link' : 'Share'}
                  >
                    {copiedId === run.id ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => handleDelete(run.id)}
                    className="px-3 py-2 bg-white/5 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded-lg border border-white/10 transition-all text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimulationHistoryView;
