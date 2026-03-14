import React, { useState } from 'react';
import { Zap, TrendingUp, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { SupplyNode, Route, OptimizationResult } from '../types';
import { motion } from 'framer-motion';

interface OptimizationViewProps {
  nodes: SupplyNode[];
  routes: Route[];
}

const OptimizationView: React.FC<OptimizationViewProps> = ({ nodes, routes }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const runOptimization = () => {
    setIsOptimizing(true);
    // Simulate AI optimization call
    setTimeout(() => {
      setResult({
        overallEfficiencyGain: 14.2,
        suggestedChanges: [
          {
            type: 'POLICY',
            targetId: 'global',
            property: 'Safety Stock',
            oldValue: 'Fixed 20%',
            newValue: 'Dynamic (Demand-based)',
            expectedBenefit: 'Reduces holding costs by 8.5% while maintaining service levels.'
          },
          {
            type: 'ROUTE',
            targetId: 'r2',
            property: 'Transport Mode',
            oldValue: 'SEA',
            newValue: 'RAIL (Intermodal)',
            expectedBenefit: 'Reduces lead time by 12 days with only 15% cost increase.'
          },
          {
            type: 'NODE',
            targetId: '3',
            property: 'Automation Level',
            oldValue: 'Level 2',
            newValue: 'Level 4 (Full Robotics)',
            expectedBenefit: 'Increases throughput by 40% and reduces picking errors by 95%.'
          }
        ]
      });
      setIsOptimizing(false);
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Network Optimization</h2>
          <p className="text-white/40 text-sm mt-1">AI-driven suggestions for cost reduction and efficiency</p>
        </div>
        <button 
          onClick={runOptimization}
          disabled={isOptimizing}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-white/90 rounded-2xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        >
          {isOptimizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-black" />}
          <span>{isOptimizing ? 'Analyzing Network...' : 'Run Optimization'}</span>
        </button>
      </div>

      {!result && !isOptimizing && (
        <div className="h-96 flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
            <Zap className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Ready for Optimization</h3>
          <p className="text-white/40 max-w-md">Our AI engine will analyze your current network topology, inventory levels, and transport costs to find hidden efficiencies.</p>
        </div>
      )}

      {isOptimizing && (
        <div className="h-96 flex flex-col items-center justify-center text-center p-12 bg-white/5 rounded-[3rem] border border-white/5">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-white/10 border-t-white animate-spin mb-8" />
            <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Processing Digital Twin Data</h3>
          <p className="text-white/40 max-w-md">Running 10,000+ Monte Carlo simulations to identify optimal configuration...</p>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-24 h-24 text-white" />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Efficiency Gain</p>
              <h3 className="text-5xl font-bold text-white tracking-tighter mb-4">+{result.overallEfficiencyGain}<span className="text-white/20 text-2xl">%</span></h3>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Optimization Successful
              </div>
            </div>

            <div className="bg-emerald-500/10 rounded-3xl border border-emerald-500/20 p-8">
              <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Executive Summary
              </h4>
              <p className="text-emerald-400/80 text-sm leading-relaxed">
                The current network shows significant bottlenecks in the European distribution nodes. By upgrading automation levels and switching to intermodal rail transport, we can achieve a 14.2% overall efficiency gain while reducing carbon footprint by 18%.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#050505] rounded-3xl border border-white/5 p-8">
            <h3 className="text-white font-semibold mb-8">Strategic Recommendations</h3>
            <div className="space-y-4">
              {result.suggestedChanges.map((change, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] text-white/60 font-mono uppercase tracking-widest">
                        {change.type}
                      </div>
                      <h4 className="text-white font-bold">{change.property}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Target ID</p>
                      <p className="text-xs text-white font-mono">{change.targetId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex-1 p-3 bg-black/40 rounded-xl border border-white/5">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Current</p>
                      <p className="text-sm text-white/60">{change.oldValue}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20" />
                    <div className="flex-1 p-3 bg-white/10 rounded-xl border border-white/10">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Optimized</p>
                      <p className="text-sm text-white font-bold">{change.newValue}</p>
                    </div>
                  </div>

                  <p className="text-sm text-white/40 italic">
                    <span className="text-emerald-400 not-italic font-medium mr-2">Benefit:</span>
                    {change.expectedBenefit}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationView;
