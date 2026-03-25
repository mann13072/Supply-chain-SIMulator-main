import React, { useState } from 'react';
import { Settings, Plus, Trash2, Check, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import { IndustryConfig, Commodity, SupplyNode, Route, SimulationParams } from '../types';
import { PRESET_INDUSTRIES, CURRENCIES } from '../utils/industries';
import { DEMO_SCENARIOS, SOLAR_NODES, SOLAR_ROUTES, DemoScenario } from '../utils/solarScenarios';

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
  const [editingCommodity, setEditingCommodity] = useState<Partial<Commodity>>({});
  const [showAddCommodity, setShowAddCommodity] = useState(false);
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

  const selectPreset = (preset: IndustryConfig) => {
    setIndustryConfig({ ...preset });
  };

  const updateCurrency = (code: string) => {
    const curr = CURRENCIES[code];
    if (!curr) return;
    setIndustryConfig({ ...industryConfig, baseCurrency: code, currencySymbol: curr.symbol });
  };

  const updateExchangeRate = (code: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    setIndustryConfig({
      ...industryConfig,
      exchangeRates: { ...industryConfig.exchangeRates, [code]: num }
    });
  };

  const addCommodity = () => {
    if (!editingCommodity.name || !editingCommodity.unit) return;
    const newCommodity: Commodity = {
      id: editingCommodity.name.toLowerCase().replace(/\s+/g, '_'),
      name: editingCommodity.name,
      unit: editingCommodity.unit,
      basePrice: editingCommodity.basePrice || 0,
      color: editingCommodity.color || '#3b82f6',
    };
    setIndustryConfig({ ...industryConfig, commodities: [...industryConfig.commodities, newCommodity] });
    setEditingCommodity({});
    setShowAddCommodity(false);
  };

  const removeCommodity = (id: string) => {
    setIndustryConfig({
      ...industryConfig,
      commodities: industryConfig.commodities.filter(c => c.id !== id)
    });
  };

  const otherCurrencies = Object.keys(CURRENCIES).filter(c => c !== industryConfig.baseCurrency);

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div>
        <h2 className="text-4xl font-bold text-white tracking-tight">System Configuration</h2>
        <p className="text-white/40 text-sm mt-2">Configure your industry, commodities, currency, and alert thresholds.</p>
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

      {/* Industry Selector */}
      <div>
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-white/40" />
          Industry Preset
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {PRESET_INDUSTRIES.map(preset => (
            <button
              key={preset.id}
              onClick={() => selectPreset(preset)}
              className={`p-5 rounded-2xl border text-left transition-all ${
                industryConfig.id === preset.id
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 border-white/10 text-white hover:border-white/30'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-sm">{preset.name}</span>
                {industryConfig.id === preset.id && <Check className="w-4 h-4" />}
              </div>
              <p className={`text-[10px] uppercase tracking-widest ${industryConfig.id === preset.id ? 'text-black/50' : 'text-white/30'}`}>
                {preset.baseCurrency} · {preset.commodities.length} commodities
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white/5 rounded-3xl border border-white/5 p-8">
        <h3 className="text-white font-semibold mb-6">Base Currency</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CURRENCIES).map(([code, { symbol, name }]) => (
            <button
              key={code}
              onClick={() => updateCurrency(code)}
              className={`px-4 py-2 rounded-xl text-sm transition-all border ${
                industryConfig.baseCurrency === code
                  ? 'bg-white text-black border-white font-bold'
                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
              }`}
            >
              {symbol} {code}
            </button>
          ))}
        </div>

        {otherCurrencies.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">
              1 {industryConfig.baseCurrency} = (exchange rates)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {otherCurrencies.map(code => (
                <div key={code} className="space-y-1">
                  <label className="text-[9px] text-white/40 uppercase tracking-widest">{code}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={industryConfig.exchangeRates[code] ?? ''}
                    placeholder="—"
                    onChange={(e) => updateExchangeRate(code, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Commodity Editor */}
      <div className="bg-white/5 rounded-3xl border border-white/5 p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-semibold">Commodities</h3>
          <button
            onClick={() => setShowAddCommodity(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-sm font-bold hover:bg-white/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Commodity
          </button>
        </div>

        {industryConfig.commodities.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No commodities. Add one or select a preset industry above.</p>
        ) : (
          <div className="space-y-3">
            {industryConfig.commodities.map(commodity => (
              <div key={commodity.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: commodity.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{commodity.name}</p>
                  <p className="text-[10px] text-white/40">{industryConfig.currencySymbol}{commodity.basePrice} / {commodity.unit}</p>
                </div>
                <button onClick={() => removeCommodity(commodity.id)} className="p-2 text-white/20 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddCommodity && (
          <div className="mt-6 p-6 bg-black/30 rounded-2xl border border-white/10 space-y-4">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">New Commodity</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block">Name</label>
                <input type="text" placeholder="e.g. Lithium"
                  value={editingCommodity.name || ''}
                  onChange={(e) => setEditingCommodity({ ...editingCommodity, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block">Unit</label>
                <input type="text" placeholder="e.g. kg, ton, unit"
                  value={editingCommodity.unit || ''}
                  onChange={(e) => setEditingCommodity({ ...editingCommodity, unit: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block">Base Price ({industryConfig.currencySymbol})</label>
                <input type="number" placeholder="0.00"
                  value={editingCommodity.basePrice || ''}
                  onChange={(e) => setEditingCommodity({ ...editingCommodity, basePrice: parseFloat(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block">Color</label>
                <input type="color"
                  value={editingCommodity.color || '#3b82f6'}
                  onChange={(e) => setEditingCommodity({ ...editingCommodity, color: e.target.value })}
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-2 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowAddCommodity(false); setEditingCommodity({}); }}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-sm">
                Cancel
              </button>
              <button onClick={addCommodity}
                className="flex-1 py-2 bg-white text-black rounded-xl font-bold text-sm hover:bg-white/90 transition-all">
                Add
              </button>
            </div>
          </div>
        )}
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
