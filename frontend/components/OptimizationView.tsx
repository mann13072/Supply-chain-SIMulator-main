import React, { useState } from 'react';
import { Zap, TrendingUp, ArrowRight, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import { SupplyNode, Route, HistorySnapshot, SimulationParams, IndustryConfig } from '../types';
import { motion } from 'framer-motion';

interface OptimizationViewProps {
  nodes: SupplyNode[];
  routes: Route[];
  history: HistorySnapshot[];
  params: SimulationParams;
  industryConfig: IndustryConfig;
  analysisReady: boolean;
}

interface AIResult {
  narrative: string;
  kpiImpact: {
    landedCostChange: number;
    otifChange: number;
    carbonFootprintChange: number;
    inventoryRisk: 'Low' | 'Medium' | 'High';
    financialRisk: number;
    operationalRisk: number;
  };
  recommendations: string[];
  qualitativeRisk: string;
  quantitativeRiskScore: number;
}

const OptimizationView: React.FC<OptimizationViewProps> = ({
  nodes, routes, history, params, industryConfig, analysisReady
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    // Build a compact history summary to avoid sending 100 full snapshots
    const criticalNodes = history.flatMap(h => h.nodes).filter(n => n.status === 'CRITICAL');
    const totalInventory = history.flatMap(h => h.nodes).reduce((sum, n) => sum + n.inv, 0);
    const totalSnapshots = history.flatMap(h => h.nodes).length;

    const historySummary = {
      totalDays: history.length,
      stockoutCount: criticalNodes.length,
      avgInventoryUtilization: totalSnapshots > 0
        ? Math.round((totalInventory / totalSnapshots / Math.max(1, nodes.reduce((s, n) => s + n.maxCapacity, 0) / Math.max(1, nodes.length))) * 100)
        : 0,
      worstNodeId: criticalNodes.length > 0
        ? criticalNodes.reduce((acc: Record<string, number>, n) => { acc[n.id] = (acc[n.id] || 0) + 1; return acc; }, {})
        : {},
    };

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, routes, params, industryConfig, historySummary })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Server error' }));
        throw new Error(err.detail || `Server error ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Ensure the Python server is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">AI Network Optimization</h2>
          <p className="text-white/40 text-sm mt-1">{industryConfig.name} · On-demand analysis using real simulation data</p>
        </div>
        {analysisReady && !result && (
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 text-sm md:text-base bg-white text-black hover:bg-white/90 rounded-2xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.2)] self-start sm:self-auto min-h-[40px]"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-black" />}
            <span>{isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}</span>
          </button>
        )}
        {result && (
          <button
            onClick={() => { setResult(null); setError(null); }}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-sm"
          >
            Reset Analysis
          </button>
        )}
      </div>

      {/* Locked state */}
      {!analysisReady && (
        <div className="h-96 flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Simulation Required</h3>
          <p className="text-white/40 max-w-md">
            Run the simulation for at least <span className="text-white font-bold">30 days</span> to unlock AI analysis.
            The AI needs enough historical data to identify patterns and make meaningful recommendations.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <div className="h-1.5 w-48 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/40 rounded-full transition-all"
                style={{ width: `${Math.min(100, (history.length / 30) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-white/30 font-mono">{history.length}/30 days</span>
          </div>
        </div>
      )}

      {/* Ready, no result yet */}
      {analysisReady && !result && !isAnalyzing && !error && (
        <div className="h-96 flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
            <Zap className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Ready for Analysis</h3>
          <p className="text-white/40 max-w-md">
            {history.length} days of simulation data collected. Click "Run AI Analysis" to get
            tailored recommendations for your {industryConfig.name} supply chain.
          </p>
        </div>
      )}

      {/* Loading */}
      {isAnalyzing && (
        <div className="h-96 flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-[3rem] border border-white/5">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-white/10 border-t-white animate-spin mb-8" />
            <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Analyzing {history.length} Days of Data</h3>
          <p className="text-white/40 max-w-md">AI is processing your {industryConfig.name} network topology, commodity prices, and disruption history...</p>
        </div>
      )}

      {/* Error */}
      {error && !isAnalyzing && (
        <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400">
          <p className="font-bold mb-1">Analysis Error</p>
          <p className="text-sm opacity-80">{error}</p>
          <button onClick={() => setError(null)} className="mt-3 text-xs underline opacity-60 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 rounded-3xl border border-white/5 p-8">
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Risk Score</p>
              <h3 className="text-5xl font-bold tracking-tighter mb-4">
                <span className={result.quantitativeRiskScore > 60 ? 'text-red-400' : result.quantitativeRiskScore > 30 ? 'text-amber-400' : 'text-emerald-400'}>
                  {result.quantitativeRiskScore}
                </span>
                <span className="text-white/20 text-2xl">/100</span>
              </h3>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Analysis Complete
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl border border-white/5 p-4">
                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Landed Cost Δ</p>
                <p className={`text-lg font-bold ${result.kpiImpact.landedCostChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {result.kpiImpact.landedCostChange > 0 ? '+' : ''}{result.kpiImpact.landedCostChange}%
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl border border-white/5 p-4">
                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">OTIF Δ</p>
                <p className={`text-lg font-bold ${result.kpiImpact.otifChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.kpiImpact.otifChange > 0 ? '+' : ''}{result.kpiImpact.otifChange}%
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl border border-white/5 p-4">
                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Inv. Risk</p>
                <p className={`text-lg font-bold ${result.kpiImpact.inventoryRisk === 'High' ? 'text-red-400' : result.kpiImpact.inventoryRisk === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {result.kpiImpact.inventoryRisk}
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl border border-white/5 p-4">
                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Carbon Δ</p>
                <p className={`text-lg font-bold ${result.kpiImpact.carbonFootprintChange < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {result.kpiImpact.carbonFootprintChange > 0 ? '+' : ''}{result.kpiImpact.carbonFootprintChange}%
                </p>
              </div>
            </div>

            <div className="bg-emerald-500/10 rounded-3xl border border-emerald-500/20 p-6">
              <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                Executive Summary
              </h4>
              <p className="text-emerald-400/80 text-sm leading-relaxed">{result.narrative}</p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#050505] rounded-3xl border border-white/5 p-8">
            <h3 className="text-white font-semibold mb-8">Strategic Recommendations</h3>
            <div className="space-y-4">
              {result.recommendations.map((rec, i) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  key={i}
                  className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/60 font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{rec}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Qualitative Risk Assessment</p>
              <p className="text-sm text-white/70">{result.qualitativeRisk}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationView;
