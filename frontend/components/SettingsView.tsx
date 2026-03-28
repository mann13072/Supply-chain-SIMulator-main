import React, { useState } from 'react';
import { Settings, Check, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import { IndustryConfig, SupplyNode, Route, SimulationParams } from '../types';
import { PRESET_INDUSTRIES } from '../utils/industries';
import { DEMO_SCENARIOS, SOLAR_NODES, SOLAR_ROUTES, DemoScenario } from '../utils/solarScenarios';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsViewProps {
  industryConfig: IndustryConfig;
  setIndustryConfig: (config: IndustryConfig) => void;
  lowStockThreshold: number;
  setLowStockThreshold: (v: number) => void;
  costVarianceThreshold: number;
  setCostVarianceThreshold: (v: number) => void;
  setNodes: (nodes: SupplyNode[]) => void;
  setRoutes: (routes: Route[]) => void;
  setParams: (params: SimulationParams) => void;
  resetSimulation: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  industryConfig, setIndustryConfig,
  lowStockThreshold, setLowStockThreshold,
  costVarianceThreshold, setCostVarianceThreshold,
  setNodes, setRoutes, setParams, resetSimulation,
}) => {
  const theme = useTheme();
  const [loadedScenario, setLoadedScenario] = useState<string | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const loadScenario = (scenario: DemoScenario) => {
    resetSimulation();
    setNodes(SOLAR_NODES);
    setRoutes(SOLAR_ROUTES);
    setParams(scenario.params);
    // Auto-select Solar Manufacturing industry to match the scenario
    const solarPreset = PRESET_INDUSTRIES.find(p => p.id === 'solar');
    if (solarPreset) setIndustryConfig(solarPreset);
    setLoadedScenario(scenario.id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div>
        <h2 className="text-4xl font-bold text-white tracking-tight">System Configuration</h2>
        <p className="text-white/40 text-sm mt-2">Demo scenarios and alert thresholds.</p>
      </div>

      {/* ── Demo Scenarios ────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-white/40" />
          Demo Scenarios
        </h3>
        <p className="text-white/30 text-xs mb-6">
          Based on the JinkoSolar &amp; First Solar case studies. Loads 11 nodes, 12 routes, and pre-configured risk parameters — ready to simulate immediately.
        </p>

        <div className="space-y-4">
          {DEMO_SCENARIOS.map(scenario => {
            const isLoaded = loadedScenario === scenario.id;
            const isExpanded = expandedScenario === scenario.id;

            return (
              <div
                key={scenario.id}
                className={`rounded-3xl border transition-all ${isLoaded ? scenario.borderColor + ' bg-white/5' : 'border-white/10 bg-white/[0.03]'}`}
              >
                {/* Card Header */}
                <div className="p-6 flex items-start gap-5">
                  {/* Color dot */}
                  <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: scenario.color }} />

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-white font-bold text-sm">{scenario.name}</p>
                      {isLoaded && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: scenario.color + '22', color: scenario.color }}>
                          <Check className="w-3 h-3" /> Loaded
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">{scenario.tagline}</p>
                    <p className="text-white/50 text-xs leading-relaxed">{scenario.description}</p>

                    {/* What to watch — expandable */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mb-3">What to watch in Analytics</p>
                        <ul className="space-y-1.5">
                          {scenario.whatToWatch.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-white/50">
                              <span style={{ color: scenario.color }} className="mt-0.5 shrink-0">›</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => loadScenario(scenario)}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                      style={{
                        backgroundColor: isLoaded ? scenario.color + '22' : scenario.color,
                        color: isLoaded ? scenario.color : '#000',
                      }}
                    >
                      {isLoaded ? 'Reload' : 'Load Network'}
                    </button>
                    <button
                      onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)}
                      className="flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-[10px] text-white/40 hover:text-white/60 bg-white/5 transition-all"
                    >
                      {isExpanded ? <><ChevronUp className="w-3 h-3" /> Hide</> : <><ChevronDown className="w-3 h-3" /> Details</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-5 bg-white/[0.03] rounded-2xl border border-white/5">
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-3">How to run a comparison</p>
          <ol className="space-y-2">
            {[
              'Load Scenario A → go to Simulation → run for 60 days',
              'Go to Analytics and note Fill Rate, OTIF, and Total Cost',
              'Return here, load Scenario B → re-run 60 days',
              'Compare the analytics — especially the Cost and Risk tabs',
              'Load Scenario C to see the digital transformation recovery effect',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-xs text-white/40">
                <span className="text-white/20 font-mono shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Alert Thresholds */}
      <div className="bg-white/5 rounded-3xl border border-white/5 p-8">
        <h3 className="text-white font-semibold mb-6">Alert Thresholds</h3>
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-white/40 uppercase tracking-widest">Low Stock Warning</label>
              <span className="text-xs font-mono font-bold text-amber-400">{lowStockThreshold}%</span>
            </div>
            <input type="range" min="5" max="50" step="5"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-white/40 uppercase tracking-widest">Cost Variance Alert</label>
              <span className="text-xs font-mono font-bold text-amber-400">±{costVarianceThreshold}%</span>
            </div>
            <input type="range" min="5" max="50" step="5"
              value={costVarianceThreshold}
              onChange={(e) => setCostVarianceThreshold(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
