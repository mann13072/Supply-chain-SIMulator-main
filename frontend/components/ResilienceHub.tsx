import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, TrendingUp, AlertTriangle,
  Play, Clock, DollarSign, Package, ToggleLeft, ToggleRight
} from 'lucide-react';
import { SupplyNode, Route, SimulationParams, NodeType } from '../types';

interface ResilienceHubProps {
  nodes: SupplyNode[];
  routes: Route[];
  params: SimulationParams;
  setParams: (params: SimulationParams) => void;
  setIsPlaying: (playing: boolean) => void;
  setActiveTab: (tab: string) => void;
  resetSimulation: () => void;
}

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

// Filled slider track
const sliderBg = (value: number, min: number, max: number, color = '#ffffff') => {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`
  };
};

// iOS toggle
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`relative shrink-0 w-11 h-6 rounded-full transition-all duration-300 focus:outline-none ${
      checked ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.25)]' : 'bg-white/10'
    }`}
  >
    <span className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-300 ${
      checked ? 'translate-x-[22px] bg-black' : 'translate-x-1 bg-white/40'
    }`} />
  </button>
);

// Reusable probability slider card
const ProbSliderCard = ({
  label, effect, value, max, step, onChange
}: {
  key?: React.Key; label: string; effect: string; value: number; max: number; step: number;
  onChange: (v: number) => void;
}) => {
  const displayVal = value * 100;
  const severity = displayVal > max * 0.6 ? 'text-red-400' : displayVal > max * 0.25 ? 'text-amber-400' : 'text-white/50';
  const trackColor = displayVal > max * 0.6 ? '#f87171' : displayVal > max * 0.25 ? '#fbbf24' : '#ffffff';
  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5 hover:border-white/10 transition-colors">
      <div className="flex justify-between items-start mb-1">
        <p className="text-sm font-semibold text-white/80">{label}</p>
        <span className={`text-base font-bold font-mono tabular-nums px-3 py-1 rounded-lg bg-white/5 ${severity}`}>
          {displayVal.toFixed(1)}%
        </span>
      </div>
      <p className="text-xs text-white/30 mb-4">{effect}</p>
      <input
        type="range" min={0} max={max} step={step}
        value={displayVal}
        onChange={(e) => onChange(parseFloat(e.target.value) / 100)}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={sliderBg(displayVal, 0, max, trackColor)}
      />
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-white/20 font-mono">0%</span>
        <span className="text-[10px] text-white/20 font-mono">{max}%</span>
      </div>
    </div>
  );
};

// Generic lever slider card
const LeverCard = ({
  label, sublabel, value, min, max, step, unit, onChange
}: {
  key?: React.Key; label: string; sublabel?: string; value: number; min: number; max: number;
  step: number; unit: string; onChange: (v: number) => void;
}) => {
  const pctFromMin = (value - min) / (max - min);
  const severity = pctFromMin > 0.7 ? 'text-amber-400' : pctFromMin > 0.4 ? 'text-white/80' : 'text-emerald-400';
  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5 hover:border-white/10 transition-colors">
      <div className="flex justify-between items-start mb-1">
        <p className="text-sm font-semibold text-white/80">{label}</p>
        <span className={`text-base font-bold font-mono tabular-nums px-3 py-1 rounded-lg bg-white/5 ${severity}`}>
          {typeof value === 'number' && step < 1 ? value.toFixed(1) : Math.round(value)}{unit}
        </span>
      </div>
      {sublabel && <p className="text-xs text-white/30 mb-4">{sublabel}</p>}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={sliderBg(value, min, max, pctFromMin > 0.7 ? '#fbbf24' : '#ffffff')}
      />
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-white/20 font-mono">{min}{unit}</span>
        <span className="text-[10px] text-white/20 font-mono">{max}{unit}</span>
      </div>
    </div>
  );
};

const ResilienceHub: React.FC<ResilienceHubProps> = ({
  nodes, routes, params, setParams, setIsPlaying, setActiveTab, resetSimulation
}) => {
  const [activeTab, setLocalActiveTab] = useState<'levers' | 'risks' | 'flags'>('levers');

  const handleParamChange = (key: keyof SimulationParams, value: any) => {
    setParams({ ...params, [key]: value });
  };

  const applyScenario = (scenario: typeof STRESS_SCENARIOS[number]) => {
    setParams({ ...params, ...scenario.params });
  };

  const calculateResilience = () => {
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
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const resilienceScore = calculateResilience();
  const scoreColor = resilienceScore > 70 ? '#10b981' : resilienceScore > 40 ? '#f59e0b' : '#ef4444';
  const scoreLabel = resilienceScore > 70 ? 'RESILIENT' : resilienceScore > 40 ? 'MODERATE RISK' : 'HIGH RISK';

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

  const scenarioFlags = [
    { label: 'Geopolitical Tension', key: 'geopoliticalTension' as keyof SimulationParams, description: '+5d delay on all shipments', icon: '🌍' },
    { label: 'Tariff Imposition',    key: 'tariffImposition'    as keyof SimulationParams, description: '+2d customs clearance, +8% landed cost', icon: '🏛️' },
    { label: 'Logistic Disruption',  key: 'logisticDisruption'  as keyof SimulationParams, description: 'Port congestion, +2d delay, +5% cost', icon: '⚓' },
    { label: 'Weather Event',        key: 'weatherEvent'        as keyof SimulationParams, description: '+3d stochastic route disruption', icon: '🌪️' },
  ];

  const probabilitySliders = [
    { label: 'Supplier Failure',  key: 'supplierFailureProb'  as keyof SimulationParams, max: 50,  step: 0.1,  effect: 'Triggers CRITICAL status at supplier nodes' },
    { label: 'Port Congestion',   key: 'portCongestionProb'   as keyof SimulationParams, max: 80,  step: 0.1,  effect: 'Adds +3 days to each shipment in transit' },
    { label: 'Demand Shock',      key: 'demandShockProb'      as keyof SimulationParams, max: 50,  step: 0.1,  effect: 'Doubles demand volume at retail nodes' },
    { label: 'Natural Disaster',  key: 'naturalDisasterProb'  as keyof SimulationParams, max: 5,   step: 0.01, effect: 'Sets any node to OFFLINE for the tick' },
    { label: 'Labor Strike',      key: 'laborStrikeProb'      as keyof SimulationParams, max: 20,  step: 0.1,  effect: 'Halts factory output for the day' },
    { label: 'Cyber Risk',        key: 'cyberRisk'            as keyof SimulationParams, max: 10,  step: 0.05, effect: 'Halves DC/warehouse throughput capacity' },
    { label: 'Transport Delay',   key: 'transportDelayProb'   as keyof SimulationParams, max: 30,  step: 0.1,  effect: 'Adds +1 day per shipment randomly' },
  ];

  const strategicLevers = [
    { label: 'Demand Surge',      key: 'demandSurge'          as keyof SimulationParams, min: 0,  max: 100, step: 1,   unit: '%', sublabel: 'Amplifies consumption across all retail nodes' },
    { label: 'Yield Degradation', key: 'yieldRateDegradation' as keyof SimulationParams, min: 0,  max: 30,  step: 0.5, unit: '%', sublabel: 'Reduces factory output by this % per cycle' },
    { label: 'Energy Cost Spike', key: 'energyCostChange'     as keyof SimulationParams, min: 0,  max: 200, step: 5,   unit: '%', sublabel: 'Increases effective production cost' },
    { label: 'Bullwhip Factor',   key: 'bullwhipFactor'       as keyof SimulationParams, min: 1,  max: 3,   step: 0.1, unit: '×', sublabel: 'Upstream order amplification multiplier' },
    { label: 'Forecast Accuracy', key: 'forecastAccuracy'     as keyof SimulationParams, min: 50, max: 100, step: 1,   unit: '%', sublabel: 'Higher = more precise replenishment triggers' },
  ];

  const nodeRiskList = nodes.map(node => {
    const inboundRoutes = routes.filter(r => r.toId === node.id).length;
    const isSingleSource = inboundRoutes === 1 && node.type !== NodeType.SUPPLIER;
    const lowInventory = node.inventoryLevel < (node.reorderPoint || 20);
    const riskLevel = isSingleSource && lowInventory ? 'HIGH' : isSingleSource || lowInventory ? 'MED' : 'LOW';
    return { node, inboundRoutes, riskLevel };
  }).sort((a, b) => ({ HIGH: 0, MED: 1, LOW: 2 }[a.riskLevel] - { HIGH: 0, MED: 1, LOW: 2 }[b.riskLevel]));

  return (
    <div className="flex flex-col gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header — Score + Presets */}
      <div className="bg-[#050505] rounded-3xl border border-white/5 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-emerald-500" /> Resilience Hub
            </h2>
            <p className="text-white/30 text-sm mt-1">Configure risk parameters and run stress tests</p>
          </div>

          {/* Score */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Resilience Score</p>
              <span className="text-3xl md:text-5xl font-black tabular-nums" style={{ color: scoreColor }}>
                {resilienceScore}
              </span>
              <p className="text-xs font-bold mt-1" style={{ color: scoreColor }}>{scoreLabel}</p>
            </div>
            {/* Scenario presets */}
            <div className="flex flex-col gap-2">
              {STRESS_SCENARIOS.map(scenario => (
                <button
                  key={scenario.label}
                  onClick={() => applyScenario(scenario)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all text-left ${
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
        </div>

        {/* Score bar */}
        <div className="mt-6 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${resilienceScore}%` }}
            transition={{ type: 'spring', stiffness: 80 }}
            className="h-full rounded-full"
            style={{ backgroundColor: scoreColor }}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">

        {/* Left: Controls */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">

          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
            {(['levers', 'risks', 'flags'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLocalActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                  activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab === 'levers' ? 'Strategic Levers' : tab === 'risks' ? 'Risk Probabilities' : 'Scenario Flags'}
              </button>
            ))}
          </div>

          {/* Strategic Levers */}
          {activeTab === 'levers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {strategicLevers.map(lever => (
                <LeverCard
                  key={lever.key}
                  label={lever.label}
                  sublabel={lever.sublabel}
                  value={params[lever.key] as number}
                  min={lever.min} max={lever.max} step={lever.step} unit={lever.unit}
                  onChange={v => handleParamChange(lever.key, v)}
                />
              ))}
            </div>
          )}

          {/* Risk Probabilities */}
          {activeTab === 'risks' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {probabilitySliders.map(risk => (
                <ProbSliderCard
                  key={risk.key}
                  label={risk.label}
                  effect={risk.effect}
                  value={params[risk.key] as number}
                  max={risk.max} step={risk.step}
                  onChange={v => handleParamChange(risk.key, v)}
                />
              ))}
            </div>
          )}

          {/* Scenario Flags */}
          {activeTab === 'flags' && (
            <div className="space-y-3">
              {scenarioFlags.map(flag => {
                const isOn = params[flag.key] as boolean;
                return (
                  <div
                    key={flag.key}
                    className={`rounded-2xl border p-5 transition-all ${
                      isOn ? 'bg-red-500/[0.05] border-red-500/30' : 'bg-white/[0.03] border-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{flag.icon}</span>
                        <div>
                          <p className={`text-sm font-semibold ${isOn ? 'text-red-300' : 'text-white/80'}`}>{flag.label}</p>
                          <p className="text-xs text-white/30 mt-0.5">{flag.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-bold font-mono ${isOn ? 'text-red-400' : 'text-white/20'}`}>
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                        <Toggle checked={isOn} onChange={() => handleParamChange(flag.key, !isOn)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Impact + Node Heatmap + Run Button */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">

          {/* Impact Prediction */}
          <div className="bg-[#050505] rounded-3xl border border-white/5 p-6">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Impact Prediction
            </h3>
            <div className="space-y-2">
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
                <div key={label} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${severity === 'red' ? 'text-red-400' : severity === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <span className="text-sm text-white/60">{label}</span>
                  </div>
                  <span className={`text-base font-bold font-mono tabular-nums ${
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
            <div className="bg-[#050505] rounded-3xl border border-white/5 p-6 flex-1">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Node Exposure
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-48 custom-scrollbar">
                {nodeRiskList.map(({ node, inboundRoutes, riskLevel }) => (
                  <div key={node.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div>
                      <p className="text-sm font-medium text-white/80 truncate max-w-[140px]">{node.name}</p>
                      <p className="text-xs text-white/30">{inboundRoutes} inbound route{inboundRoutes !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
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

          {/* Run Stress Test */}
          <button
            onClick={() => {
              resetSimulation();
              setIsPlaying(true);
              setActiveTab('simulation');
            }}
            className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(255,255,255,0.15)] transition-all flex items-center justify-center gap-2 text-sm tracking-wide"
          >
            <Play className="w-4 h-4 fill-black" />
            RUN STRESS TEST
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResilienceHub;
