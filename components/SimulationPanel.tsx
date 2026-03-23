import React, { useState } from 'react';
import { SimulationParams, IndustryConfig } from '../types';
import { Settings, Zap, Factory, Truck, Globe } from 'lucide-react';

interface SimulationPanelProps {
  params: SimulationParams;
  setParams: (params: SimulationParams) => void;
  industryConfig: IndustryConfig;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ params, setParams, industryConfig }) => {
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'OPS' | 'LOGISTICS' | 'MARKET'>('MATERIALS');

  const handleChange = (field: keyof SimulationParams, value: any) => {
    setParams({ ...params, [field]: value });
  };

  const handleCommodityChange = (commodityId: string, value: number) => {
    setParams({
      ...params,
      commodityPriceChanges: { ...params.commodityPriceChanges, [commodityId]: value }
    });
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

  const activeShocks =
    Object.values(params.commodityPriceChanges).filter(v => v !== 0).length +
    [params.tariffImposition, params.geopoliticalTension, params.weatherEvent, params.logisticDisruption].filter(Boolean).length +
    [params.yieldRateDegradation, params.energyCostChange, params.demandSurge].filter(v => v !== 0).length +
    (params.freightCostIndex !== 100 ? 1 : 0);

  return (
    <div className="bg-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/5 bg-white/5">
        <h2 className="text-lg font-bold text-white flex items-center gap-3">
          <Settings className="w-5 h-5 text-white/40" />
          Simulation Levers
        </h2>
        <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">Stress-test your digital twin</p>
      </div>

      <div className="flex border-b border-white/5">
        <TabButton id="MATERIALS" label="Commodities" icon={Zap} />
        <TabButton id="OPS" label="Operations" icon={Factory} />
        <TabButton id="LOGISTICS" label="Logistics" icon={Truck} />
        <TabButton id="MARKET" label="Market" icon={Globe} />
      </div>

      <div className="p-8 space-y-8">
        {activeTab === 'MATERIALS' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {industryConfig.commodities.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">No commodities configured. Add commodities in Settings.</p>
            ) : (
              industryConfig.commodities.map(commodity => {
                const val = params.commodityPriceChanges[commodity.id] ?? 0;
                return (
                  <div key={commodity.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: commodity.color }} />
                        <label className="text-[10px] text-white/40 uppercase tracking-widest">
                          {commodity.name} Price Δ
                        </label>
                        <span className="text-[9px] text-white/20">({commodity.unit})</span>
                      </div>
                      <span className={`text-xs font-mono font-bold ${val > 0 ? 'text-red-400' : val < 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                        {val > 0 ? '+' : ''}{val}%
                      </span>
                    </div>
                    <input
                      type="range" min="-50" max="150" step="5"
                      value={val}
                      onChange={(e) => handleCommodityChange(commodity.id, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                      style={{ accentColor: commodity.color }}
                    />
                    <div className="flex justify-between text-[8px] text-white/20 uppercase tracking-widest font-bold">
                      <span>-50%</span>
                      <span>Base ({industryConfig.currencySymbol}{commodity.basePrice}/{commodity.unit})</span>
                      <span>+150%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'OPS' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Production Yield Loss</label>
                <span className="text-xs font-mono font-bold text-red-400">-{params.yieldRateDegradation}%</span>
              </div>
              <input type="range" min="0" max="20" step="1"
                value={params.yieldRateDegradation}
                onChange={(e) => handleChange('yieldRateDegradation', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Energy Cost Spike</label>
                <span className="text-xs font-mono font-bold text-amber-400">+{params.energyCostChange}%</span>
              </div>
              <input type="range" min="0" max="200" step="10"
                value={params.energyCostChange}
                onChange={(e) => handleChange('energyCostChange', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        )}

        {activeTab === 'LOGISTICS' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Freight Cost Index</label>
                <span className="text-xs font-mono font-bold text-white">{params.freightCostIndex}</span>
              </div>
              <input type="range" min="50" max="400" step="10"
                value={params.freightCostIndex}
                onChange={(e) => handleChange('freightCostIndex', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[8px] text-white/20 uppercase tracking-widest font-bold">
                <span>Baseline (100)</span>
                <span>Crisis (400)</span>
              </div>
            </div>
            <label className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${params.logisticDisruption ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                <div>
                  <span className="text-xs font-bold text-white block">Port Congestion</span>
                  <span className="text-[9px] text-white/30 uppercase tracking-widest">Force Majeure Logic</span>
                </div>
              </div>
              <input type="checkbox" checked={params.logisticDisruption}
                onChange={(e) => handleChange('logisticDisruption', e.target.checked)}
                className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-white focus:ring-0"
              />
            </label>
          </div>
        )}

        {activeTab === 'MARKET' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">Global Demand Surge</label>
                <span className="text-xs font-mono font-bold text-emerald-400">+{params.demandSurge}%</span>
              </div>
              <input type="range" min="0" max="200" step="10"
                value={params.demandSurge}
                onChange={(e) => handleChange('demandSurge', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'tariffImposition', label: 'Tariffs' },
                { key: 'geopoliticalTension', label: 'Geopolitics' },
                { key: 'weatherEvent', label: 'Weather' },
              ].map(({ key, label }) => (
                <label key={key} className="flex flex-col gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                  <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold text-center">{label}</span>
                  <input type="checkbox"
                    checked={params[key as keyof SimulationParams] as boolean}
                    onChange={(e) => handleChange(key as keyof SimulationParams, e.target.checked)}
                    className="w-6 h-6 rounded-lg border-white/10 bg-white/5 text-white focus:ring-0 self-center"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-white/5 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Active Shocks</p>
          <p className="text-xl font-bold text-white">{activeShocks}</p>
        </div>
        <button
          onClick={() => setParams({
            ...params,
            commodityPriceChanges: {},
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
  );
};

export default SimulationPanel;
