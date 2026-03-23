import React, { useState } from 'react';
import { Settings, Plus, Trash2, Check } from 'lucide-react';
import { IndustryConfig, Commodity } from '../types';
import { PRESET_INDUSTRIES, CURRENCIES } from '../utils/industries';

interface SettingsViewProps {
  industryConfig: IndustryConfig;
  setIndustryConfig: (config: IndustryConfig) => void;
  lowStockThreshold: number;
  setLowStockThreshold: (v: number) => void;
  costVarianceThreshold: number;
  setCostVarianceThreshold: (v: number) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  industryConfig, setIndustryConfig,
  lowStockThreshold, setLowStockThreshold,
  costVarianceThreshold, setCostVarianceThreshold
}) => {
  const [editingCommodity, setEditingCommodity] = useState<Partial<Commodity>>({});
  const [showAddCommodity, setShowAddCommodity] = useState(false);

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
