import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, ShieldAlert, Globe, TrendingUp, AlertTriangle, 
  ChevronRight, Info, Play
} from 'lucide-react';
import { SupplyNode, SimulationParams } from '../types';

interface ResilienceHubProps {
  nodes: SupplyNode[];
  routes: any[];
  params: SimulationParams;
  setParams: (params: SimulationParams) => void;
  setIsPlaying: (playing: boolean) => void;
  setActiveTab: (tab: string) => void;
}

const ResilienceHub: React.FC<ResilienceHubProps> = ({ nodes, routes, params, setParams, setIsPlaying, setActiveTab }) => {
  const [activeTab, setLocalActiveTab] = useState<'levers' | 'risks'>('levers');

  const calculateResilience = () => {
    let score = 100;
    score -= params.supplierFailureProb * 50;
    score -= params.naturalDisasterProb * 100;
    score -= params.portCongestionProb * 30;
    score -= params.geopoliticalTension ? 20 : 0;
    score -= params.tariffImposition ? 5 : 0;
    score -= (100 - params.forecastAccuracy) / 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const resilienceScore = calculateResilience();

  const handleParamChange = (key: keyof SimulationParams, value: any) => {
    setParams({ ...params, [key]: value });
  };

  return (
    <div className="flex flex-col gap-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-[#050505] rounded-3xl border border-white/5 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-emerald-500" /> Resilience Hub
            </h2>
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">WAR ROOM</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Resilience Score</p>
            <span className={`text-5xl font-bold ${resilienceScore > 70 ? 'text-emerald-500' : resilienceScore > 40 ? 'text-amber-500' : 'text-red-500'}`}>
              {resilienceScore}%
            </span>
          </div>
        </div>
        <div className="mt-8 h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
          <motion.div animate={{ width: `${resilienceScore}%` }} className={`h-full rounded-full ${resilienceScore > 70 ? 'bg-emerald-500' : resilienceScore > 40 ? 'bg-amber-500' : 'bg-red-500'}`} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 flex-1">
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
            <button onClick={() => setLocalActiveTab('levers')} className={`px-6 py-2 rounded-xl text-xs font-bold ${activeTab === 'levers' ? 'bg-white text-black' : 'text-white/40'}`}>STRATEGIC LEVERS</button>
            <button onClick={() => setLocalActiveTab('risks')} className={`px-6 py-2 rounded-xl text-xs font-bold ${activeTab === 'risks' ? 'bg-white text-black' : 'text-white/40'}`}>RISK PROBABILITIES</button>
          </div>

          <div className="space-y-8">
            {activeTab === 'levers' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Polysilicon Price Change', key: 'polysiliconPriceChange' },
                  { label: 'Yield Degradation', key: 'yieldRateDegradation' },
                  { label: 'Demand Surge', key: 'demandSurge' },
                ].map(lever => (
                  <div key={lever.key} className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <div className="flex justify-between mb-4"><label className="text-xs text-white/60">{lever.label}</label><span className="text-xs font-mono text-emerald-400">{(params as any)[lever.key]}%</span></div>
                    <input type="range" min="0" max="100" value={(params as any)[lever.key]} onChange={(e) => handleParamChange(lever.key as any, parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Supplier Failure Prob.', key: 'supplierFailureProb' },
                  { label: 'Port Congestion Prob.', key: 'portCongestionProb' },
                  { label: 'Demand Shock Prob.', key: 'demandShockProb' },
                ].map(risk => (
                  <div key={risk.key} className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <div className="flex justify-between mb-4"><label className="text-xs text-white/60">{risk.label}</label><span className="text-xs font-mono text-red-400">{(params as any)[risk.key]}%</span></div>
                    <input type="range" min="0" max="100" step="0.1" value={(params as any)[risk.key]} onChange={(e) => handleParamChange(risk.key as any, parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-[#050505] rounded-3xl border border-white/5 p-8 h-full">
            <h3 className="text-white font-semibold mb-8 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-white/40" />Impact Prediction</h3>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 mb-8">
              <p className="text-xs text-white/60 leading-relaxed">{resilienceScore < 50 ? "Urgent: High dependency on trans-pacific routes during high congestion." : "Stable: Current network configuration can withstand minor shocks."}</p>
            </div>
            <button 
              onClick={() => { setIsPlaying(true); setActiveTab('simulation'); }}
              className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" /> RUN STRESS TEST
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResilienceHub;
