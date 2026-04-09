import React, { useState } from 'react';
import { SimulationParams, IndustryConfig, SupplyNode, Route, NodeType } from '../types';
import { Settings, Zap, Factory, Truck, Globe, DollarSign, ShieldAlert, TrendingUp, AlertTriangle, Clock, Package } from 'lucide-react';
import { motion } from 'framer-motion';

interface SimulationPanelProps {
  params: SimulationParams;
  setParams: (params: SimulationParams) => void;
  industryConfig: IndustryConfig;
  nodes: SupplyNode[];
  routes: Route[];
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
  <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-2.5 sm:p-3 hover:border-white/10 transition-colors">
    <div className="flex justify-between items-center mb-2">
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

const STRESS_SCENARIOS = [
  {
    label: 'Port Crisis',
    description: 'Severe port congestion + logistics breakdown',
    color: 'amber',
    params: { portCongestionProb: 0.4, logisticDisruption: true, transportDelayProb: 0.25, freightCostIndex: 180 }
  },
  {
    label: 'Trade War',
    description: 'Tariffs + geopolitical tension + demand shock',
    color: 'orange',
    params: { geopoliticalTension: true, tariffImposition: true, supplierFailureProb: 0.15, demandShockProb: 0.08 }
  },
  {
    label: 'Pandemic',
    description: 'Labor shortage + disrupted global logistics',
    color: 'red',
    params: { laborStrikeProb: 0.2, demandShockProb: 0.3, portCongestionProb: 0.3, naturalDisasterProb: 0.005, logisticDisruption: true }
  },
] as const;

const SimulationPanel: React.FC<SimulationPanelProps> = ({ params, setParams, industryConfig, nodes, routes }) => {
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'OPS' | 'LOGISTICS' | 'MARKET' | 'FINANCE' | 'RESILIENCE'>('MATERIALS');

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
    { id: 'MATERIALS'   as const, label: 'Commodities', icon: Zap },
    { id: 'OPS'         as const, label: 'Operations',  icon: Factory },
    { id: 'LOGISTICS'   as const, label: 'Logistics',   icon: Truck },
    { id: 'MARKET'      as const, label: 'Market',      icon: Globe },
    { id: 'FINANCE'     as const, label: 'Macro',       icon: DollarSign },
    { id: 'RESILIENCE'  as const, label: 'Resilience',  icon: ShieldAlert },
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
      <div className="p-2.5 sm:p-3.5 space-y-2">

        {/* COMMODITIES */}
        {activeTab === 'MATERIALS' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {industryConfig.commodities.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-white/30 text-sm">No commodities configured.</p>
                <p className="text-white/20 text-xs mt-1">Add commodities in Settings.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {industryConfig.commodities.map(commodity => {
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
                })}
              </div>
            )}
          </div>
        )}

        {/* OPERATIONS */}
        {activeTab === 'OPS' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
          </div>
        )}

        {/* LOGISTICS */}
        {activeTab === 'LOGISTICS' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
            </div>
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
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-2">
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

            {/* F4: Demand Seasonality */}
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5 hover:border-white/10 transition-colors">
              <p className="text-xs font-semibold text-white/80 mb-1">Demand Seasonality</p>
              <p className="text-[10px] text-white/25 mb-2.5">Cyclical demand pattern at retail nodes</p>
              <div className="flex gap-1.5 mb-2">
                {(['none', 'weekly', 'monthly', 'holiday'] as const).map(pattern => (
                  <button
                    key={pattern}
                    onClick={() => handleChange('seasonalityPattern', pattern)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                      (params.seasonalityPattern || 'none') === pattern
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/[0.04] text-white/30 border border-white/[0.06] hover:text-white/50'
                    }`}
                  >
                    {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                  </button>
                ))}
              </div>
              {(params.seasonalityPattern || 'none') !== 'none' && (
                <SliderCard
                  label="Amplitude"
                  sublabel="% swing from baseline demand"
                  value={params.seasonalityAmplitude ?? 0}
                  min={0} max={100} step={5}
                  onChange={(v) => handleChange('seasonalityAmplitude', v)}
                  displayValue={`±${params.seasonalityAmplitude ?? 0}%`}
                  color="#22d3ee"
                  accent={params.seasonalityAmplitude > 0 ? 'text-cyan-400' : 'text-white/50'}
                />
              )}
            </div>

            {/* F10: Tariff Rate */}
            <SliderCard
              label="Tariff Rate"
              sublabel="% surcharge on procurement cost per shipment"
              value={params.tariffRate ?? 10}
              min={0} max={100} step={1}
              onChange={(v) => handleChange('tariffRate', v)}
              displayValue={`${params.tariffRate ?? 10}%`}
              color="#f87171"
              accent={params.tariffRate > 0 ? 'text-red-400' : 'text-white/50'}
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

        {/* MACRO & POLICY — external forces nobody in the company controls */}
        {activeTab === 'FINANCE' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-2">
            <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] px-3 py-2">
              <p className="text-[10px] text-white/30">External macro forces. Per-node costs (production, warehousing, markup) are set in the <span className="text-white/50 font-semibold">Network → node editor</span>.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <SliderCard
                label="Inflation Rate"
                sublabel="Annual cost growth — production, transport, warehousing"
                value={params.inflationRate}
                min={0} max={15} step={0.5}
                onChange={(v) => handleChange('inflationRate', v)}
                displayValue={`${params.inflationRate}%`}
                color="#fb923c"
                accent={params.inflationRate > 3 ? 'text-orange-400' : 'text-white/50'}
              />
              <SliderCard
                label="Interest Rate Change"
                sublabel="Central bank shift — added to working capital cost"
                value={params.interestRateChange}
                min={-5} max={10} step={0.5}
                onChange={(v) => handleChange('interestRateChange', v)}
                displayValue={`${params.interestRateChange > 0 ? '+' : ''}${params.interestRateChange}%`}
                color={params.interestRateChange > 0 ? '#f87171' : params.interestRateChange < 0 ? '#34d399' : '#ffffff'}
                accent={params.interestRateChange > 0 ? 'text-red-400' : params.interestRateChange < 0 ? 'text-emerald-400' : 'text-white/50'}
              />
              <SliderCard
                label="Working Capital Cost (WACC)"
                sublabel="Company's annual cost of tied-up capital"
                value={params.workingCapitalCost}
                min={1} max={20} step={0.5}
                onChange={(v) => handleChange('workingCapitalCost', v)}
                displayValue={`${params.workingCapitalCost}%`}
                color="#f472b6"
                accent="text-pink-400"
              />
              <SliderCard
                label="Currency Exchange Rate"
                sublabel="FX multiplier on supplier procurement costs"
                value={params.currencyExchangeRate}
                min={0.5} max={2.0} step={0.05}
                onChange={(v) => handleChange('currencyExchangeRate', v)}
                displayValue={`${params.currencyExchangeRate.toFixed(2)}×`}
                color={params.currencyExchangeRate > 1.1 ? '#f87171' : params.currencyExchangeRate < 0.9 ? '#34d399' : '#ffffff'}
                accent={params.currencyExchangeRate > 1.1 ? 'text-red-400' : params.currencyExchangeRate < 0.9 ? 'text-emerald-400' : 'text-white/50'}
              />
              <SliderCard
                label="Subsidy Level"
                sublabel="Government subsidy reducing factory production cost"
                value={params.subsidyLevel}
                min={0} max={50} step={1}
                onChange={(v) => handleChange('subsidyLevel', v)}
                displayValue={params.subsidyLevel > 0 ? `−${params.subsidyLevel}%` : 'Off'}
                color="#34d399"
                accent={params.subsidyLevel > 0 ? 'text-emerald-400' : 'text-white/50'}
              />
            </div>

            {/* Company-wide defaults (fallback for nodes without override) */}
            <div className="pt-1 border-t border-white/5">
              <p className="text-[10px] text-white/20 uppercase tracking-widest mb-1.5 font-bold">Company Defaults</p>
              <p className="text-[10px] text-white/25 mb-2">Fallback values when a node has no override set</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <SliderCard
                label="Default Production Cost"
                sublabel="Per-unit conversion cost (labor + overhead)"
                value={params.unitProductionCost}
                min={5} max={200} step={5}
                onChange={(v) => handleChange('unitProductionCost', v)}
                displayValue={`$${params.unitProductionCost}`}
                color="#60a5fa"
                accent="text-blue-400"
              />
              <SliderCard
                label="Default Carrying Cost"
                sublabel="Annual % fallback for inventory holding"
                value={params.inventoryCarryingCost}
                min={1} max={30} step={1}
                onChange={(v) => handleChange('inventoryCarryingCost', v)}
                displayValue={`${params.inventoryCarryingCost}%`}
                color="#818cf8"
                accent="text-indigo-400"
              />
              <SliderCard
                label="Default Warehousing Cost"
                sublabel="Per-unit fallback for WH/DC nodes"
                value={params.warehousingCost}
                min={1} max={50} step={1}
                onChange={(v) => handleChange('warehousingCost', v)}
                displayValue={`$${params.warehousingCost}`}
                color="#a78bfa"
                accent="text-violet-400"
              />
              <SliderCard
                label="Default Retail Markup"
                sublabel="% markup fallback for retail nodes"
                value={params.defaultMarkupPct ?? 50}
                min={10} max={200} step={5}
                onChange={(v) => handleChange('defaultMarkupPct', v)}
                displayValue={`${params.defaultMarkupPct ?? 50}%`}
                color="#22d3ee"
                accent="text-cyan-400"
              />
              <SliderCard
                label="Expediting Premium"
                sublabel="Per-unit cost for emergency (CRITICAL) orders"
                value={params.expeditingCost}
                min={50} max={500} step={10}
                onChange={(v) => handleChange('expeditingCost', v)}
                displayValue={`$${params.expeditingCost}`}
                color="#f43f5e"
                accent="text-rose-400"
              />
            </div>
          </div>
        )}

        {/* RESILIENCE */}
        {activeTab === 'RESILIENCE' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
            {(() => {
              // Resilience score calculation
              let score = 100;
              score -= (params.supplierFailureProb * 100) * 0.5;
              score -= (params.naturalDisasterProb * 100) * 1.0;
              score -= (params.portCongestionProb * 100) * 0.3;
              score -= (params.laborStrikeProb * 100) * 0.2;
              score -= (params.cyberRisk * 100) * 0.4;
              score -= (params.transportDelayProb * 100) * 0.1;
              score -= params.geopoliticalTension ? 20 : 0;
              score -= params.tariffImposition ? 5 : 0;
              score -= params.logisticDisruption ? 10 : 0;
              score -= params.weatherEvent ? 8 : 0;
              score -= (100 - params.forecastAccuracy) / 5;
              const singleSourceNodes = nodes.filter(node =>
                routes.filter(r => r.toId === node.id).length === 1 && node.type !== NodeType.SUPPLIER
              ).length;
              score -= singleSourceNodes * 8;
              const hasRedundantRoutes = routes.length > nodes.length;
              if (!hasRedundantRoutes && nodes.length > 0) score -= 5;
              const resilienceScore = Math.max(0, Math.min(100, Math.round(score)));
              const scoreColor = resilienceScore > 70 ? '#10b981' : resilienceScore > 40 ? '#f59e0b' : '#ef4444';
              const scoreLabel = resilienceScore > 70 ? 'RESILIENT' : resilienceScore > 40 ? 'MODERATE RISK' : 'HIGH RISK';

              // Impact predictions
              const expectedDelayDays = (
                (params.geopoliticalTension ? 5 : 0) +
                (params.logisticDisruption ? 2 : 0) +
                (params.weatherEvent ? 3 : 0) +
                (params.tariffImposition ? 2 : 0) +
                (params.portCongestionProb * 100 * 0.03)
              ).toFixed(1);
              const stockoutRisk = Math.min(100,
                (params.supplierFailureProb * 100) +
                (params.demandShockProb * 100) +
                (params.naturalDisasterProb * 500)
              ).toFixed(0);
              const commodityImpact = Object.values(params.commodityPriceChanges as Record<string, number>)
                .reduce((sum: number, v: number) => sum + Math.max(0, v) * 0.3, 0);
              const costImpact = Math.max(0,
                (params.tariffImposition ? 8 : 0) +
                ((params.freightCostIndex - 100) * 0.1) +
                commodityImpact +
                (params.logisticDisruption ? 5 : 0)
              ).toFixed(1);

              // Node risk heatmap
              const nodeRiskList = nodes.map(node => {
                const inboundRoutes = routes.filter(r => r.toId === node.id).length;
                const isSingleSource = inboundRoutes === 1 && node.type !== NodeType.SUPPLIER;
                const lowInventory = node.inventoryLevel < (node.reorderPoint || 20);
                const riskLevel = isSingleSource && lowInventory ? 'HIGH' : isSingleSource || lowInventory ? 'MED' : 'LOW';
                return { node, inboundRoutes, riskLevel };
              }).sort((a, b) => ({ HIGH: 0, MED: 1, LOW: 2 }[a.riskLevel] - { HIGH: 0, MED: 1, LOW: 2 }[b.riskLevel]));

              return (
                <>
                  {/* Resilience Score */}
                  <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" style={{ color: scoreColor }} />
                        <p className="text-xs font-semibold text-white/80">Resilience Score</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black tabular-nums leading-none" style={{ color: scoreColor }}>
                          {resilienceScore}
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: scoreColor }}>{scoreLabel}</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${resilienceScore}%` }}
                        transition={{ type: 'spring', stiffness: 80 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: scoreColor }}
                      />
                    </div>
                  </div>

                  {/* Stress Scenario Presets */}
                  <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Stress Scenarios</p>
                    <div className="flex flex-wrap gap-1.5">
                      {STRESS_SCENARIOS.map(scenario => (
                        <button
                          key={scenario.label}
                          onClick={() => setParams({ ...params, ...scenario.params })}
                          title={scenario.description}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                            scenario.color === 'amber' ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' :
                            scenario.color === 'orange' ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' :
                            'border-red-500/30 text-red-400 hover:bg-red-500/10'
                          }`}
                        >
                          {scenario.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Impact Prediction */}
                  <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> Impact Prediction
                    </p>
                    <div className="space-y-1.5">
                      {[
                        {
                          icon: Clock, label: 'Expected Delay',
                          value: `+${expectedDelayDays}d`,
                          severity: parseFloat(expectedDelayDays) > 5 ? 'red' : parseFloat(expectedDelayDays) > 2 ? 'amber' : 'green'
                        },
                        {
                          icon: Package, label: 'Stockout Risk',
                          value: `${stockoutRisk}%`,
                          severity: parseInt(stockoutRisk) > 30 ? 'red' : parseInt(stockoutRisk) > 10 ? 'amber' : 'green'
                        },
                        {
                          icon: DollarSign, label: 'Cost Impact',
                          value: `+${costImpact}%`,
                          severity: parseFloat(costImpact) > 10 ? 'red' : parseFloat(costImpact) > 5 ? 'amber' : 'green'
                        },
                      ].map(({ icon: Icon, label, value, severity }) => (
                        <div key={label} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${severity === 'red' ? 'text-red-400' : severity === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`} />
                            <span className="text-[11px] text-white/60">{label}</span>
                          </div>
                          <span className={`text-sm font-bold font-mono tabular-nums ${
                            severity === 'red' ? 'text-red-400' : severity === 'amber' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Node Risk Heatmap */}
                  {nodeRiskList.length > 0 && (
                    <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" /> Node Exposure
                      </p>
                      <div className="space-y-1 overflow-y-auto max-h-40 custom-scrollbar">
                        {nodeRiskList.map(({ node, inboundRoutes, riskLevel }) => (
                          <div key={node.id} className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                            <div>
                              <p className="text-[11px] font-medium text-white/80 truncate max-w-[120px]">{node.name}</p>
                              <p className="text-[9px] text-white/30">{inboundRoutes} inbound</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              riskLevel === 'HIGH' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                              riskLevel === 'MED'  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                                                    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {riskLevel}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
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
            seasonalityPattern: 'none',
            seasonalityAmplitude: 0,
            tariffRate: 10,
            unitProductionCost: 20,
            inventoryCarryingCost: 5,
            warehousingCost: 10,
            workingCapitalCost: 8,
            interestRateChange: 0,
            inflationRate: 2,
            subsidyLevel: 0,
            currencyExchangeRate: 1,
            expeditingCost: 150,
            defaultMarkupPct: 50,
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
