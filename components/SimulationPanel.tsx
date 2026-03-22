import React, { useState } from 'react';
import { SimulationParams } from '../types';
import { Settings, Zap, Factory, Truck, Globe, TrendingUp } from 'lucide-react';

interface SimulationPanelProps {
  params: SimulationParams;
  setParams: (params: SimulationParams) => void;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ params, setParams }) => {
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'OPS' | 'LOGISTICS' | 'MARKET'>('MATERIALS');

  const handleChange = (field: keyof SimulationParams, value: any) => {
    setParams({ ...params, [field]: value });
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 flex flex-col items-center gap-2 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2
        ${activeTab === id 
          ? 'border-white text-white bg-white/5' 
          : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'
        }`}
    >
      <Icon className={`w-4 h-4 ${activeTab === id ? 'text-white' : 'text-white/20'}`} />
      {label}
    </button>
  );

  return (
    <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/5 shrink-0">
        <h2 className="text-lg font-bold text-white flex items-center gap-3">
          <Settings className="w-5 h-5 text-white/40" />
          Simulation Levers
        </h2>
        <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">Stress-test your digital twin</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 shrink-0">
        <TabButton id="MATERIALS" label="Commodities" icon={Zap} />
        <TabButton id="OPS" label="Operations" icon={Factory} />
        <TabButton id="LOGISTICS" label="Logistics" icon={Truck} />
        <TabButton id="MARKET" label="Market" icon={Globe} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar space-y-8">
        
        {activeTab === 'MATERIALS' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Polysilicon Price</label>
                <span className={`text-xs font-mono font-bold ${params.polysiliconPriceChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {params.polysiliconPriceChange > 0 ? '+' : ''}{params.polysiliconPriceChange}%
                </span>
              </div>
              <input
                type="range" min="-50" max="150" step="5"
                value={params.polysiliconPriceChange}
                onChange={(e) => handleChange('polysiliconPriceChange', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Silver Price</label>
                <span className={`text-xs font-mono font-bold ${params.silverPriceChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {params.silverPriceChange > 0 ? '+' : ''}{params.silverPriceChange}%
                </span>
              </div>
              <input
                type="range" min="-30" max="100" step="5"
                value={params.silverPriceChange}
                onChange={(e) => handleChange('silverPriceChange', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Aluminum Cost</label>
                <span className={`text-xs font-mono font-bold ${params.aluminumPriceChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {params.aluminumPriceChange > 0 ? '+' : ''}{params.aluminumPriceChange}%
                </span>
              </div>
              <input
                type="range" min="-20" max="80" step="5"
                value={params.aluminumPriceChange}
                onChange={(e) => handleChange('aluminumPriceChange', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        )}

        {activeTab === 'OPS' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Production Yield Loss</label>
                <span className="text-xs font-mono font-bold text-red-400">-{params.yieldRateDegradation}%</span>
              </div>
              <input
                type="range" min="0" max="20" step="1"
                value={params.yieldRateDegradation}
                onChange={(e) => handleChange('yieldRateDegradation', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Energy Cost Spike</label>
                <span className="text-xs font-mono font-bold text-amber-400">+{params.energyCostChange}%</span>
              </div>
              <input
                type="range" min="0" max="200" step="10"
                value={params.energyCostChange}
                onChange={(e) => handleChange('energyCostChange', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        )}

        {activeTab === 'LOGISTICS' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Freight Cost Index</label>
                <span className="text-xs font-mono font-bold text-white">{params.freightCostIndex}</span>
              </div>
              <input
                type="range" min="50" max="400" step="10"
                value={params.freightCostIndex}
                onChange={(e) => handleChange('freightCostIndex', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[8px] text-white/20 uppercase tracking-widest font-bold">
                <span>Baseline (100)</span>
                <span>Crisis (400)</span>
              </div>
            </div>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${params.logisticDisruption ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                <div>
                  <span className="text-xs font-bold text-white block">Port Congestion</span>
                  <span className="text-[9px] text-white/30 uppercase tracking-widest">Force Majeure Logic</span>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={params.logisticDisruption}
                onChange={(e) => handleChange('logisticDisruption', e.target.checked)}
                className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-white focus:ring-0"
              />
            </label>
          </div>
        )}

        {activeTab === 'MARKET' && (activeTab === 'MARKET') && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Global Demand Surge</label>
                <span className="text-xs font-mono font-bold text-emerald-400">+{params.demandSurge}%</span>
              </div>
              <input
                type="range" min="0" max="200" step="10"
                value={params.demandSurge}
                onChange={(e) => handleChange('demandSurge', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold text-center">Tariffs</span>
                <input 
                  type="checkbox" 
                  checked={params.tariffImposition}
                  onChange={(e) => handleChange('tariffImposition', e.target.checked)}
                  className="w-6 h-6 rounded-lg border-white/10 bg-white/5 text-white focus:ring-0 self-center"
                />
              </label>
              <label className="flex flex-col gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold text-center">Geopolitics</span>
                <input 
                  type="checkbox" 
                  checked={params.geopoliticalTension}
                  onChange={(e) => handleChange('geopoliticalTension', e.target.checked)}
                  className="w-6 h-6 rounded-lg border-white/10 bg-white/5 text-white focus:ring-0 self-center"
                />
              </label>
            </div>
            
             <label className="flex items-center gap-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 cursor-pointer hover:bg-blue-500/10 transition-all">
                <input 
                  type="checkbox" 
                  checked={params.weatherEvent}
                  onChange={(e) => handleChange('weatherEvent', e.target.checked)}
                  className="w-5 h-5 rounded-lg border-blue-500/20 bg-blue-500/5 text-blue-400 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-blue-400 block">Extreme Weather</span>
                  <span className="text-[9px] text-blue-400/40 uppercase tracking-widest">Stochastic Disruptions</span>
                </div>
             </label>
          </div>
        )}
      </div>

      {/* Summary Action */}
      <div className="p-8 border-t border-white/5 bg-white/5 shrink-0 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Active Shocks</p>
          <p className="text-xl font-bold text-white">
            {Object.values(params).filter(v => v === true || (typeof v === 'number' && v !== 0 && v !== 1 && v !== 100)).length}
          </p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setParams({
                    ...params,
                    polysiliconPriceChange: 0,
                    silverPriceChange: 0,
                    aluminumPriceChange: 0,
                    yieldRateDegradation: 0,
                    energyCostChange: 0,
                    demandSurge: 0,
                    tariffImposition: false,
                    geopoliticalTension: false,
                    weatherEvent: false,
                    logisticDisruption: false,
                    freightCostIndex: 100
                })}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all"
            >
                Reset
            </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationPanel;
