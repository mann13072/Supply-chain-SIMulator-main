import React, { useState } from 'react';
import { SimulationParams, IndustryConfig } from '../types';
import { Settings, Zap, Factory, Truck, Globe } from 'lucide-react';

interface SimulationPanelProps {
  params: SimulationParams;
  setParams: (params: SimulationParams) => void;
  industryConfig: IndustryConfig;
}

// Filled slider track — gradient from accent color to dim white
const sliderBg = (value: number, min: number, max: number, color = '#ffffff') => {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`
  };
};

// iOS-style toggle switch
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`relative shrink-0 w-12 h-7 rounded-full transition-all duration-300 focus:outline-none ${
      checked ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-white/10 border border-white/15'
    }`}
  >
    <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
      checked ? 'translate-x-5' : 'translate-x-0'
    }`} />
  </button>
);

// Reusable slider card
const SliderCard = ({
  label, sublabel, value, min, max, step, onChange,
  displayValue, color = '#ffffff', accent
}: {
  key?: React.Key; label: string; sublabel?: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; displayValue: string;
  color?: string; accent?: string;
}) => (
  <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5 hover:border-white/10 transition-colors">
    <div className="flex justify-between items-center mb-3">
      <div>
        <p className="text-xs font-semibold text-white/80 leading-tight">{label}</p>
        {sublabel && <p className="text-[10px] text-white/25 mt-0.5">{sublabel}</p>}
      </div>
      <span className={`text-sm font-bold font-mono tabular-nums px-2 py-0.5 rounded-md bg-white/5 ${accent || 'text-white'}`}>
        {displayValue}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
      style={sliderBg(value, min, max, color)}
    />
    <div className="flex justify-between mt-1.5">
      <span className="text-[9px] text-white/15 font-mono">{min}</span>
      <span className="text-[9px] text-white/15 font-mono">{max}</span>
    </div>
  </div>
);

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

  const activeShocks =
    Object.values(params.commodityPriceChanges).filter(v => v !== 0).length +
    [params.tariffImposition, params.geopoliticalTension, params.weatherEvent, params.logisticDisruption].filter(Boolean).length +
    [params.yieldRateDegradation, params.energyCostChange, params.demandSurge].filter(v => v !== 0).length +
    (params.freightCostIndex !== 100 ? 1 : 0) +
    (params.pandemicFactor > 0 ? 1 : 0) +
    (params.qualityRecallProb > 0.002 ? 1 : 0);

  const tabs = [
    { id: 'MATERIALS' as const, label: 'Commodities', icon: Zap },
    { id: 'OPS'       as const, label: 'Operations',  icon: Factory },
    { id: 'LOGISTICS' as const, label: 'Logistics',   icon: Truck },
    { id: 'MARKET'    as const, label: 'Market',      icon: Globe },
  ];

  return (
    <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
            <Settings className="w-3.5 h-3.5 text-white/50" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Simulation Levers</h2>
            <p className="text-[10px] text-white/30">Stress-test your digital twin</p>
          </div>
        </div>
        {activeShocks > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-400">{activeShocks} active</span>
          </div>
        )}
      </div>

      {/* Tab bar — icon-only on mobile, icon+label on sm+ */}
      <div className="flex border-b border-white/5 bg-white/[0.02]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            title={label}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold transition-all border-b-2 ${
              activeTab === id
                ? 'border-white text-white'
                : 'border-transparent text-white/30 hover:text-white/60 hover:bg-white/[0.02]'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${activeTab === id ? 'text-white' : 'text-white/20'}`} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 space-y-2.5">

        {/* COMMODITIES */}
        {activeTab === 'MATERIALS' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {industryConfig.commodities.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-white/30 text-sm">No commodities configured.</p>
                <p className="text-white/20 text-xs mt-1">Add commodities in Settings.</p>
              </div>
            ) : (
              industryConfig.commodities.map(commodity => {
                const val = params.commodityPriceChanges[commodity.id] ?? 0;
                const accent = val > 0 ? '#f87171' : val < 0 ? '#34d399' : '#ffffff';
                return (
                  <SliderCard
                    key={commodity.id}
                    label={commodity.name}
                    sublabel={`Base: ${industryConfig.currencySymbol}${commodity.basePrice} / ${commodity.unit}`}
                    value={val}
                    min={-50} max={150} step={5}
                    onChange={(v) => handleCommodityChange(commodity.id, v)}
                    displayValue={`${val > 0 ? '+' : ''}${val}%`}
                    color={commodity.color}
                    accent={val > 0 ? 'text-red-400' : val < 0 ? 'text-emerald-400' : 'text-white/50'}
                  />
                );
              })
            )}
          </div>
        )}

        {/* OPERATIONS */}
        {activeTab === 'OPS' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SliderCard
              label="Production Yield Loss"
              sublabel="Factory output degradation per day"
              value={params.yieldRateDegradation}
              min={0} max={20} step={1}
              onChange={(v) => handleChange('yieldRateDegradation', v)}
              displayValue={`-${params.yieldRateDegradation}%`}
              color="#f87171"
              accent={params.yieldRateDegradation > 0 ? 'text-red-400' : 'text-white/50'}
            />
            <SliderCard
              label="Energy Cost Spike"
              sublabel="Reduces factory throughput via cost squeeze"
              value={params.energyCostChange}
              min={0} max={200} step={10}
              onChange={(v) => handleChange('energyCostChange', v)}
              displayValue={`+${params.energyCostChange}%`}
              color="#fbbf24"
              accent={params.energyCostChange > 0 ? 'text-amber-400' : 'text-white/50'}
            />
            <SliderCard
              label="Pandemic Factor"
              sublabel="Probability of factory shutdowns + demand surge"
              value={params.pandemicFactor}
              min={0} max={1} step={0.05}
              onChange={(v) => handleChange('pandemicFactor', v)}
              displayValue={params.pandemicFactor > 0 ? `${Math.round(params.pandemicFactor * 100)}%` : 'Off'}
              color="#c084fc"
              accent={params.pandemicFactor > 0 ? 'text-purple-400' : 'text-white/50'}
            />
            <SliderCard
              label="Quality Recall Probability"
              sublabel="Chance of 25% inventory quarantine per node/day"
              value={params.qualityRecallProb}
              min={0} max={0.05} step={0.001}
              onChange={(v) => handleChange('qualityRecallProb', v)}
              displayValue={params.qualityRecallProb > 0 ? `${(params.qualityRecallProb * 100).toFixed(1)}%` : 'Off'}
              color="#f97316"
              accent={params.qualityRecallProb > 0 ? 'text-orange-400' : 'text-white/50'}
            />
            <SliderCard
              label="Recovery Time"
              sublabel="Days to recover from disasters / supplier failures"
              value={params.recoveryTime}
              min={1} max={60} step={1}
              onChange={(v) => handleChange('recoveryTime', v)}
              displayValue={`${params.recoveryTime}d`}
              color="#60a5fa"
              accent="text-blue-400"
            />
          </div>
        )}

        {/* LOGISTICS */}
        {activeTab === 'LOGISTICS' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SliderCard
              label="Freight Cost Index"
              sublabel="100 = baseline, 400 = crisis level"
              value={params.freightCostIndex}
              min={50} max={400} step={10}
              onChange={(v) => handleChange('freightCostIndex', v)}
              displayValue={params.freightCostIndex.toString()}
              color={params.freightCostIndex > 150 ? '#f87171' : '#ffffff'}
              accent={params.freightCostIndex > 150 ? 'text-red-400' : params.freightCostIndex > 100 ? 'text-amber-400' : 'text-white/50'}
            />
            <SliderCard
              label="Forecast Accuracy"
              sublabel="Above 70%: proactive reorders before stockout"
              value={params.forecastAccuracy}
              min={0} max={100} step={5}
              onChange={(v) => handleChange('forecastAccuracy', v)}
              displayValue={`${params.forecastAccuracy}%`}
              color={params.forecastAccuracy >= 70 ? '#34d399' : '#fbbf24'}
              accent={params.forecastAccuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'}
            />
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] px-3.5 py-3 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/80">Port Congestion</p>
                  <p className="text-[10px] text-white/25 mt-0.5">Force majeure — adds +2 days to all shipments</p>
                </div>
                <Toggle
                  checked={params.logisticDisruption}
                  onChange={() => handleChange('logisticDisruption', !params.logisticDisruption)}
                />
              </div>
              {params.logisticDisruption && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400/70">
                  <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                  Disruption active
                </div>
              )}
            </div>
          </div>
        )}

        {/* MARKET */}
        {activeTab === 'MARKET' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SliderCard
              label="Global Demand Surge"
              sublabel="Amplifies consumption at all retail nodes"
              value={params.demandSurge}
              min={0} max={200} step={10}
              onChange={(v) => handleChange('demandSurge', v)}
              displayValue={`+${params.demandSurge}%`}
              color="#34d399"
              accent={params.demandSurge > 0 ? 'text-emerald-400' : 'text-white/50'}
            />
            <div className="grid grid-cols-1 gap-2">
              {[
                { key: 'tariffImposition',    label: 'Tariff Imposition',     desc: 'Per-route customs delay + cost uplift', red: true },
                { key: 'geopoliticalTension', label: 'Geopolitical Tension',  desc: '+5 days delay on all shipments', red: true },
                { key: 'weatherEvent',        label: 'Extreme Weather Event', desc: '+3 days stochastic disruption', red: true },
                { key: 'multiSourcing',       label: 'Multi-Sourcing',        desc: 'Score all suppliers by stock + speed', red: false },
                { key: 'inventoryPooling',    label: 'Inventory Pooling',     desc: 'Redistribute surplus between nodes', red: false },
                { key: 'dynamicPricing',      label: 'Dynamic Pricing',       desc: 'Price elasticity at retail nodes', red: false },
              ].map(({ key, label, desc, red }) => {
                const isOn = params[key as keyof SimulationParams] as boolean;
                return (
                  <div
                    key={key}
                    className={`bg-white/[0.03] rounded-xl border px-3.5 py-2.5 transition-all ${
                      isOn
                        ? red
                          ? 'border-red-500/30 bg-red-500/[0.04]'
                          : 'border-emerald-500/30 bg-emerald-500/[0.04]'
                        : 'border-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-semibold ${isOn ? (red ? 'text-red-300' : 'text-emerald-300') : 'text-white/80'}`}>{label}</p>
                        <p className="text-[10px] text-white/25 mt-0.5">{desc}</p>
                      </div>
                      <Toggle
                        checked={isOn}
                        onChange={() => handleChange(key as keyof SimulationParams, !isOn)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${activeShocks > 0 ? 'bg-amber-400 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-xs text-white/40">
            {activeShocks > 0 ? <><span className="text-white font-bold">{activeShocks}</span> shock{activeShocks !== 1 ? 's' : ''} applied</> : 'No active shocks'}
          </span>
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
            freightCostIndex: 100,
            pandemicFactor: 0,
            qualityRecallProb: 0.002,
            recoveryTime: 14,
            forecastAccuracy: 85,
            multiSourcing: true,
            inventoryPooling: false,
            dynamicPricing: false,
          })}
          className="text-xs font-semibold text-white/30 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
        >
          Reset all
        </button>
      </div>
    </div>
  );
};

export default SimulationPanel;
