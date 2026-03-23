import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, ShieldAlert, TrendingUp, AlertTriangle,
  Play, ToggleLeft, ToggleRight, Clock, DollarSign, Package
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

// Preset stress scenarios that pre-fill multiple params at once
const STRESS_SCENARIOS = [
  {
    label: 'Port Crisis',
    color: 'amber',
    params: {
      portCongestionProb: 0.4,
      logisticDisruption: true,
      transportDelayProb: 0.25,
      freightCostIndex: 180,
    }
  },
  {
    label: 'Trade War',
    color: 'orange',
    params: {
      geopoliticalTension: true,
      tariffImposition: true,
      supplierFailureProb: 0.15,
      demandShockProb: 0.08,
    }
  },
  {
    label: 'Pandemic',
    color: 'red',
    params: {
      laborStrikeProb: 0.2,
      demandShockProb: 0.3,
      portCongestionProb: 0.3,
      naturalDisasterProb: 0.005,
      logisticDisruption: true,
    }
  },
] as const;

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

  // Fix 4: Network-aware resilience score — uses nodes and routes props
  const calculateResilience = () => {
    let score = 100;

    // Probability-based deductions (stored as 0–1 decimals)
    score -= (params.supplierFailureProb * 100) * 0.5;
    score -= (params.naturalDisasterProb * 100) * 1.0;
    score -= (params.portCongestionProb * 100) * 0.3;
    score -= (params.laborStrikeProb * 100) * 0.2;
    score -= (params.cyberRisk * 100) * 0.4;
    score -= (params.transportDelayProb * 100) * 0.1;

    // Boolean flag deductions
    score -= params.geopoliticalTension ? 20 : 0;
    score -= params.tariffImposition ? 5 : 0;
    score -= params.logisticDisruption ? 10 : 0;
    score -= params.weatherEvent ? 8 : 0;

    // Forecast & policy
    score -= (100 - params.forecastAccuracy) / 5;

    // Network topology penalties
    const singleSourceNodes = nodes.filter(node =>
      routes.filter(r => r.toId === node.id).length === 1 &&
      node.type !== NodeType.SUPPLIER
    ).length;
    score -= singleSourceNodes * 8; // -8 per single-point-of-failure node

    const hasRedundantRoutes = routes.length > nodes.length;
    if (!hasRedundantRoutes && nodes.length > 0) score -= 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const resilienceScore = calculateResilience();

  // Fix 5: Computed impact predictions (not hardcoded)
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

  // Fix 2: Boolean scenario flags
  const scenarioFlags = [
    { label: 'Geopolitical Tension', key: 'geopoliticalTension' as keyof SimulationParams, description: '+5d delay on all shipments' },
    { label: 'Tariff Imposition',    key: 'tariffImposition'    as keyof SimulationParams, description: '+2d customs, +8% cost' },
    { label: 'Logistic Disruption',  key: 'logisticDisruption'  as keyof SimulationParams, description: '+2d delay, +5% cost' },
    { label: 'Weather Event',        key: 'weatherEvent'        as keyof SimulationParams, description: '+3d delay on routes' },
  ];

  // Fix 3: All probability sliders — stored as 0–1 decimals, displayed as 0–100%
  const probabilitySliders = [
    { label: 'Supplier Failure',    key: 'supplierFailureProb'  as keyof SimulationParams, max: 50,  step: 0.1, effect: 'Supplier → CRITICAL' },
    { label: 'Port Congestion',     key: 'portCongestionProb'   as keyof SimulationParams, max: 80,  step: 0.1, effect: '+3d delay per shipment' },
    { label: 'Demand Shock',        key: 'demandShockProb'      as keyof SimulationParams, max: 50,  step: 0.1, effect: '2× demand spike' },
    { label: 'Natural Disaster',    key: 'naturalDisasterProb'  as keyof SimulationParams, max: 5,   step: 0.01, effect: 'Node → OFFLINE' },
    { label: 'Labor Strike',        key: 'laborStrikeProb'      as keyof SimulationParams, max: 20,  step: 0.1, effect: 'Factory → zero output' },
    { label: 'Cyber Risk',          key: 'cyberRisk'            as keyof SimulationParams, max: 10,  step: 0.05, effect: 'DC throughput halved' },
    { label: 'Transport Delay',     key: 'transportDelayProb'   as keyof SimulationParams, max: 30,  step: 0.1, effect: '+1d per shipment' },
  ];

  // Strategic levers — stored as whole numbers 0–100
  const strategicLevers = [
    { label: 'Demand Surge',      key: 'demandSurge'          as keyof SimulationParams, min: 0,  max: 100, step: 1,   unit: '%' },
    { label: 'Yield Degradation', key: 'yieldRateDegradation' as keyof SimulationParams, min: 0,  max: 30,  step: 0.5, unit: '%' },
    { label: 'Energy Cost Spike', key: 'energyCostChange'     as keyof SimulationParams, min: 0,  max: 200, step: 5,   unit: '%' },
    { label: 'Bullwhip Factor',   key: 'bullwhipFactor'       as keyof SimulationParams, min: 1,  max: 3,   step: 0.1, unit: '×' },
    { label: 'Forecast Accuracy', key: 'forecastAccuracy'     as keyof SimulationParams, min: 50, max: 100, step: 1,   unit: '%' },
  ];

  // R2: Per-node risk heatmap
  const nodeRiskList = nodes.map(node => {
    const inboundRoutes = routes.filter(r => r.toId === node.id).length;
    const isSingleSource = inboundRoutes === 1 && node.type !== NodeType.SUPPLIER;
    const lowInventory = node.inventoryLevel < (node.reorderPoint || 20);
    const riskLevel = isSingleSource && lowInventory ? 'HIGH' : isSingleSource || lowInventory ? 'MED' : 'LOW';
    return { node, inboundRoutes, riskLevel };
  }).sort((a, b) => {
    const order = { HIGH: 0, MED: 1, LOW: 2 };
    return order[a.riskLevel] - order[b.riskLevel];
  });

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header: Score + Presets */}
      <div className="bg-[#050505] rounded-3xl border border-white/5 p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-emerald-500" /> Resilience Hub
            </h2>
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">WAR ROOM</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Resilience Score</p>
              <span className={`text-5xl font-bold ${resilienceScore > 70 ? 'text-emerald-500' : resilienceScore > 40 ? 'text-amber-500' : 'text-red-500'}`}>
                {resilienceScore}%
              </span>
            </div>
            {/* R1: Preset Scenarios */}
            <div className="flex gap-2">
              {STRESS_SCENARIOS.map(scenario => (
                <button
                  key={scenario.label}
                  onClick={() => applyScenario(scenario)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase border transition-all
                    ${scenario.color === 'amber' ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10' :
                      scenario.color === 'orange' ? 'border-orange-500/40 text-orange-400 hover:bg-orange-500/10' :
                      'border-red-500/40 text-red-400 hover:bg-red-500/10'}`}
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${resilienceScore}%` }}
            transition={{ type: 'spring', stiffness: 80 }}
            className={`h-full rounded-full ${resilienceScore > 70 ? 'bg-emerald-500' : resilienceScore > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1">

        {/* Left: Controls */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
            {(['levers', 'risks', 'flags'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLocalActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
              >
                {tab === 'levers' ? 'Strategic Levers' : tab === 'risks' ? 'Risk Probabilities' : 'Scenario Flags'}
              </button>
            ))}
          </div>

          {/* Strategic Levers */}
          {activeTab === 'levers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {strategicLevers.map(lever => (
                <div key={lever.key} className="bg-white/5 border border-white/5 rounded-2xl p-5">
                  <div className="flex justify-between mb-3">
                    <label className="text-xs text-white/60">{lever.label}</label>
                    <span className="text-xs font-mono text-emerald-400">
                      {(params[lever.key] as number).toFixed(lever.step < 1 ? 1 : 0)}{lever.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={lever.min}
                    max={lever.max}
                    step={lever.step}
                    value={params[lever.key] as number}
                    onChange={e => handleParamChange(lever.key, parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-white/20">{lever.min}{lever.unit}</span>
                    <span className="text-[10px] text-white/20">{lever.max}{lever.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Risk Probabilities — Fix 1: display × 100, store ÷ 100 */}
          {activeTab === 'risks' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {probabilitySliders.map(risk => {
                const displayVal = ((params[risk.key] as number) * 100);
                return (
                  <div key={risk.key} className="bg-white/5 border border-white/5 rounded-2xl p-5">
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-white/60">{risk.label}</label>
                      <span className="text-xs font-mono text-red-400">{displayVal.toFixed(1)}%</span>
                    </div>
                    <p className="text-[10px] text-white/30 mb-3">{risk.effect}</p>
                    <input
                      type="range"
                      min={0}
                      max={risk.max}
                      step={risk.step}
                      value={displayVal}
                      onChange={e => handleParamChange(risk.key, parseFloat(e.target.value) / 100)}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-white/20">0%</span>
                      <span className="text-[10px] text-white/20">{risk.max}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Scenario Flags — Fix 2: boolean toggles */}
          {activeTab === 'flags' && (
            <div className="grid grid-cols-1 gap-3">
              {scenarioFlags.map(flag => {
                const isOn = params[flag.key] as boolean;
                return (
                  <button
                    key={flag.key}
                    onClick={() => handleParamChange(flag.key, !isOn)}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all text-left
                      ${isOn ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                  >
                    <div>
                      <p className={`text-sm font-bold ${isOn ? 'text-red-400' : 'text-white/60'}`}>{flag.label}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{flag.description}</p>
                    </div>
                    <div className={`flex items-center gap-2 ${isOn ? 'text-red-400' : 'text-white/20'}`}>
                      <span className="text-[10px] font-mono font-bold">{isOn ? 'ON' : 'OFF'}</span>
                      {isOn
                        ? <ToggleRight className="w-6 h-6" />
                        : <ToggleLeft className="w-6 h-6" />
                      }
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Impact Prediction + Node Heatmap + Run Button */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">

          {/* Fix 5: Real computed impact metrics */}
          <div className="bg-[#050505] rounded-3xl border border-white/5 p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-white/40" /> Impact Prediction
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-white/60">Expected Delay</span>
                </div>
                <span className={`text-sm font-bold font-mono ${parseFloat(expectedDelayDays) > 5 ? 'text-red-400' : parseFloat(expectedDelayDays) > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  +{expectedDelayDays}d
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-white/60">Stockout Risk</span>
                </div>
                <span className={`text-sm font-bold font-mono ${parseInt(stockoutRisk) > 30 ? 'text-red-400' : parseInt(stockoutRisk) > 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {stockoutRisk}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-white/60">Cost Impact</span>
                </div>
                <span className={`text-sm font-bold font-mono ${parseFloat(costImpact) > 10 ? 'text-red-400' : parseFloat(costImpact) > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  +{costImpact}%
                </span>
              </div>
            </div>
          </div>

          {/* R2: Per-node risk heatmap */}
          {nodeRiskList.length > 0 && (
            <div className="bg-[#050505] rounded-3xl border border-white/5 p-6 flex-1">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-white/40" /> Node Exposure
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-48 custom-scrollbar">
                {nodeRiskList.map(({ node, inboundRoutes, riskLevel }) => (
                  <div key={node.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-white truncate max-w-[140px]">{node.name}</p>
                      <p className="text-[10px] text-white/30">{inboundRoutes} inbound route{inboundRoutes !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                      riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                      riskLevel === 'MED'  ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {riskLevel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fix 6: Stress test resets simulation first */}
          <button
            onClick={() => {
              resetSimulation();
              setIsPlaying(true);
              setActiveTab('simulation');
            }}
            className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Play className="w-4 h-4 fill-black" /> RUN STRESS TEST
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResilienceHub;
