import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Info, BarChart3, Globe, Zap, Loader2 } from 'lucide-react';
import { SupplyNode, Route, SimulationResult, SimulationParams } from '../types';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import SimulationPanel from './SimulationPanel';
import { runSimulationAnalysis } from '../services/geminiService';

interface RiskAnalysisViewProps {
  nodes: SupplyNode[];
  routes: Route[];
  params: SimulationParams;
  setParams: (params: SimulationParams) => void;
}

const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({ nodes, routes, params, setParams }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SimulationResult | null>(null);

  const runRiskAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await runSimulationAnalysis(nodes, routes, params);
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const riskData = [
    { subject: 'Geopolitical', A: 85, fullMark: 100 },
    { subject: 'Logistics', A: 65, fullMark: 100 },
    { subject: 'Financial', A: 45, fullMark: 100 },
    { subject: 'Operational', A: 75, fullMark: 100 },
    { subject: 'Environmental', A: 30, fullMark: 100 },
    { subject: 'Cyber', A: 55, fullMark: 100 },
  ];

  const nodeRiskData = nodes.map(n => ({
    name: n.name,
    risk: Math.floor(Math.random() * 60) + 20
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Risk Analysis</h2>
          <p className="text-white/40 text-sm mt-1">Comprehensive qualitative and quantitative risk assessment</p>
        </div>
        <button 
          onClick={runRiskAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-white/90 rounded-2xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5 fill-black" />}
          <span>{isAnalyzing ? 'Evaluating Risks...' : 'Run Risk Audit'}</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Simulation Parameters */}
        <div className="col-span-12 lg:col-span-4 h-fit">
          <SimulationPanel params={params} setParams={setParams} />
        </div>

        {/* Right Column: Analysis Results */}
        <div className="col-span-12 lg:col-span-8">
          {!analysis && !isAnalyzing && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                <ShieldAlert className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Network Risk Assessment</h3>
              <p className="text-white/40 max-w-md">Adjust the simulation levers on the left and run a full audit to identify vulnerabilities across your global supply chain.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-[3rem] border border-white/5">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-white/10 border-t-white animate-spin mb-8" />
                <ShieldAlert className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Aggregating Global Risk Data</h3>
              <p className="text-white/40 max-w-md">Correlating weather patterns, port congestion data, and geopolitical indicators...</p>
            </div>
          )}

          {analysis && !isAnalyzing && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="bg-[#050505] rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-8">
                   <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Aggregate Risk Score</p>
                    <div className="flex items-end gap-3">
                        <h3 className={`text-6xl font-bold tracking-tighter ${analysis.quantitativeRiskScore > 70 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {analysis.quantitativeRiskScore}
                        </h3>
                        <div className="mb-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/60 font-mono">
                        {analysis.quantitativeRiskScore > 70 ? 'HIGH EXPOSURE' : 'STABLE'}
                        </div>
                    </div>
                   </div>
                   <div className="hidden md:block w-48 h-32">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={riskData}>
                                <PolarGrid stroke="#ffffff10" />
                                <PolarAngleAxis dataKey="subject" tick={false} />
                                <Radar dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                            </RadarChart>
                        </ResponsiveContainer>
                   </div>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${analysis.quantitativeRiskScore > 70 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${analysis.quantitativeRiskScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#050505] rounded-3xl border border-white/5 p-8">
                <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                  <Info className="w-5 h-5 text-white/40" />
                  Qualitative Risk Assessment
                </h3>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 mb-8">
                  <p className="text-white/80 leading-relaxed italic">
                    "{analysis.qualitativeRisk}"
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] text-white/40 uppercase tracking-widest">Impact Analysis</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs text-white/60">Financial Risk</span>
                        <span className="text-xs font-bold text-red-400">{analysis.kpiImpact.financialRisk}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs text-white/60">Operational Risk</span>
                        <span className="text-xs font-bold text-red-400">{analysis.kpiImpact.operationalRisk}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs text-white/60">Inventory Risk</span>
                        <span className="text-xs font-bold text-orange-400">{analysis.kpiImpact.inventoryRisk}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] text-white/40 uppercase tracking-widest">Mitigation Strategies</h4>
                    <div className="space-y-3">
                      {analysis.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-white/60">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysisView;
