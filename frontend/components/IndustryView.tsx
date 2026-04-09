import React, { useState } from 'react';
import { Factory, Plus, Trash2, Check, Pencil, X, Sparkles, DollarSign, ArrowRightLeft, Package } from 'lucide-react';
import { IndustryConfig, Commodity, BillOfMaterials } from '../types';
import { PRESET_INDUSTRIES, CURRENCIES, INDUSTRY_THEMES } from '../utils/industries';
import { getStarterNetwork } from '../utils/starterNetworks';
import { SupplyNode, Route } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { getIndustryBOM, autoMapNodesToBOM } from '../utils/industryBOMs';

interface IndustryViewProps {
  industryConfig: IndustryConfig;
  setIndustryConfig: (config: IndustryConfig) => void;
  nodes: SupplyNode[];
  setNodes: (nodes: SupplyNode[]) => void;
  setRoutes: (routes: Route[]) => void;
  setBom: (bom: BillOfMaterials | null) => void;
  resetSimulation: () => void;
  onOpenWizard: () => void;
}

const IndustryView: React.FC<IndustryViewProps> = ({
  industryConfig, setIndustryConfig,
  nodes, setNodes, setRoutes, setBom, resetSimulation,
  onOpenWizard,
}) => {
  const theme = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Commodity>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCommodity, setNewCommodity] = useState<Partial<Commodity>>({});

  // ── Industry preset selection ──────────────────────────────────────
  const selectPreset = (preset: IndustryConfig) => {
    setIndustryConfig({ ...preset });
    const industryBom = getIndustryBOM(preset.id);
    setBom(industryBom);
    if (industryBom && nodes.length > 0) {
      setNodes(autoMapNodesToBOM(nodes, industryBom));
    }
  };

  const switchIndustryWithNetwork = (preset: IndustryConfig) => {
    setIndustryConfig({ ...preset });
    const starter = getStarterNetwork(preset.id);
    const industryBom = getIndustryBOM(preset.id);
    setBom(industryBom);
    if (starter.nodes.length > 0) {
      const mappedNodes = industryBom
        ? autoMapNodesToBOM(starter.nodes, industryBom)
        : starter.nodes;
      setNodes(mappedNodes);
      setRoutes(starter.routes);
      resetSimulation();
    }
  };

  // ── Currency ───────────────────────────────────────────────────────
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
      exchangeRates: { ...industryConfig.exchangeRates, [code]: num },
    });
  };

  const removeExchangeRate = (code: string) => {
    const { [code]: _, ...rest } = industryConfig.exchangeRates;
    setIndustryConfig({ ...industryConfig, exchangeRates: rest });
  };

  const addExchangeRate = (code: string) => {
    if (industryConfig.exchangeRates[code] != null) return;
    setIndustryConfig({
      ...industryConfig,
      exchangeRates: { ...industryConfig.exchangeRates, [code]: 1 },
    });
  };

  // ── Commodity CRUD ─────────────────────────────────────────────────
  const startEdit = (c: Commodity) => {
    setEditingId(c.id);
    setEditDraft({ ...c });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = () => {
    if (!editingId || !editDraft.name || !editDraft.unit) return;
    setIndustryConfig({
      ...industryConfig,
      commodities: industryConfig.commodities.map(c =>
        c.id === editingId ? { ...c, ...editDraft } as Commodity : c
      ),
    });
    cancelEdit();
  };

  const removeCommodity = (id: string) => {
    setIndustryConfig({
      ...industryConfig,
      commodities: industryConfig.commodities.filter(c => c.id !== id),
    });
    if (editingId === id) cancelEdit();
  };

  const addCommodity = () => {
    if (!newCommodity.name || !newCommodity.unit) return;
    const commodity: Commodity = {
      id: newCommodity.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      name: newCommodity.name,
      unit: newCommodity.unit,
      basePrice: newCommodity.basePrice || 0,
      color: newCommodity.color || '#6366f1',
    };
    setIndustryConfig({ ...industryConfig, commodities: [...industryConfig.commodities, commodity] });
    setNewCommodity({});
    setShowAddForm(false);
  };

  // ── Industry name editing ──────────────────────────────────────────
  const updateIndustryName = (name: string) => {
    setIndustryConfig({ ...industryConfig, name });
  };

  const otherCurrencies = Object.keys(CURRENCIES).filter(c => c !== industryConfig.baseCurrency);
  const unusedCurrencies = Object.keys(CURRENCIES).filter(
    c => c !== industryConfig.baseCurrency && industryConfig.exchangeRates[c] == null
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-2 md:gap-3">
            <Factory className="w-6 h-6 md:w-9 md:h-9 shrink-0" style={{ color: theme.accent }} />
            Industry Setup
          </h2>
          <p className="text-white/40 text-sm mt-2">
            Choose your industry, configure commodities, and set currency parameters.
          </p>
        </div>
        <button
          onClick={onOpenWizard}
          className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all shrink-0 mt-1"
          style={{ backgroundColor: theme.accentLight, color: theme.accent, border: `1px solid ${theme.accentMuted}` }}
        >
          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Run Wizard
        </button>
      </div>

      {/* ── Industry Preset Selector ──────────────────────────────────── */}
      <section>
        <h3 className="text-white font-semibold mb-1 text-sm uppercase tracking-widest flex items-center gap-2">
          <Package className="w-4 h-4 text-white/40" />
          Industry Preset
        </h3>
        <p className="text-white/30 text-xs mb-5">
          Switch presets to load default commodities and currency. Use "Switch & Load Network" to also replace your current nodes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {PRESET_INDUSTRIES.map(preset => {
            const t = INDUSTRY_THEMES[preset.id];
            const isActive = industryConfig.id === preset.id;
            return (
              <div
                key={preset.id}
                className="relative rounded-2xl border p-4 transition-all"
                style={{
                  background: isActive ? `${t.accent}10` : 'rgba(255,255,255,0.02)',
                  borderColor: isActive ? t.accent : 'rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold text-sm">{preset.name}</span>
                  {isActive && <Check className="w-3.5 h-3.5" style={{ color: t.accent }} />}
                </div>
                <p className="text-white/30 text-[10px] mb-3 leading-relaxed">{t.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {preset.commodities.slice(0, 3).map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1 text-[9px] text-white/40 bg-white/5 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                  ))}
                  {preset.commodities.length > 3 && (
                    <span className="text-[9px] text-white/20">+{preset.commodities.length - 3}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isActive ? (
                    <>
                      <button
                        onClick={() => selectPreset(preset)}
                        className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 transition-all border border-white/5"
                      >
                        Select
                      </button>
                      <button
                        onClick={() => switchIndustryWithNetwork(preset)}
                        className="flex-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap"
                        style={{ background: t.accent, color: '#000' }}
                      >
                        Switch & Load
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.accent }}>
                      Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Industry Name ─────────────────────────────────────────────── */}
      <section className="bg-white/[0.03] rounded-3xl border border-white/5 p-6">
        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest">Industry Name</h3>
        <input
          type="text"
          value={industryConfig.name}
          onChange={(e) => updateIndustryName(e.target.value)}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
          placeholder="e.g. Solar Manufacturing"
        />
        <p className="text-white/25 text-xs mt-2">This name is shown in the header and analytics reports.</p>
      </section>

      {/* ── Commodities ───────────────────────────────────────────────── */}
      <section className="bg-white/[0.03] rounded-3xl border border-white/5 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold text-sm uppercase tracking-widest flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-white/40" />
            Commodities
            <span className="text-white/20 text-xs font-normal ml-1">({industryConfig.commodities.length})</span>
          </h3>
          <button
            onClick={() => { setShowAddForm(true); setNewCommodity({}); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: theme.accent, color: '#000' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {industryConfig.commodities.length === 0 ? (
          <p className="text-white/25 text-sm text-center py-10">
            No commodities defined. Add one or select an industry preset above.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_80px_100px_60px_60px] gap-3 px-4 py-2 text-[9px] text-white/30 uppercase tracking-widest">
              <span />
              <span>Name</span>
              <span>Unit</span>
              <span>Base Price</span>
              <span>Color</span>
              <span />
            </div>

            {industryConfig.commodities.map(c => {
              const isEditing = editingId === c.id;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[auto_1fr_80px_100px_60px_60px] gap-3 items-center px-4 py-3 rounded-xl border transition-all"
                  style={{
                    background: isEditing ? `${theme.accent}08` : 'rgba(255,255,255,0.02)',
                    borderColor: isEditing ? theme.accentMuted : 'rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Color dot */}
                  {isEditing ? (
                    <input
                      type="color"
                      value={editDraft.color || c.color}
                      onChange={(e) => setEditDraft({ ...editDraft, color: e.target.value })}
                      className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent p-0"
                    />
                  ) : (
                    <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                  )}

                  {/* Name */}
                  {isEditing ? (
                    <input
                      value={editDraft.name || ''}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-white/30"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">{c.name}</span>
                  )}

                  {/* Unit */}
                  {isEditing ? (
                    <input
                      value={editDraft.unit || ''}
                      onChange={(e) => setEditDraft({ ...editDraft, unit: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/60 text-xs focus:outline-none focus:border-white/30"
                    />
                  ) : (
                    <span className="text-white/40 text-xs">{c.unit}</span>
                  )}

                  {/* Price */}
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-white/30 text-xs">{industryConfig.currencySymbol}</span>
                      <input
                        type="number"
                        step="any"
                        value={editDraft.basePrice ?? ''}
                        onChange={(e) => setEditDraft({ ...editDraft, basePrice: parseFloat(e.target.value) || 0 })}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/60 text-xs w-full focus:outline-none focus:border-white/30"
                      />
                    </div>
                  ) : (
                    <span className="text-white/50 text-xs">{industryConfig.currencySymbol}{c.basePrice}</span>
                  )}

                  {/* Color preview (non-edit) */}
                  {!isEditing && (
                    <span className="w-4 h-4 rounded border border-white/10" style={{ background: c.color }} />
                  )}
                  {isEditing && <span />}

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={saveEdit} className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 text-white/30 hover:text-white/60 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(c)} className="p-1 text-white/20 hover:text-white/60 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeCommodity(c.id)} className="p-1 text-white/20 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add commodity form */}
        {showAddForm && (
          <div className="mt-4 p-5 bg-black/30 rounded-2xl border border-white/10 space-y-4">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">New Commodity</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block">Name</label>
                <input type="text" placeholder="e.g. Lithium"
                  value={newCommodity.name || ''}
                  onChange={(e) => setNewCommodity({ ...newCommodity, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block">Unit</label>
                <input type="text" placeholder="e.g. kg, ton, unit"
                  value={newCommodity.unit || ''}
                  onChange={(e) => setNewCommodity({ ...newCommodity, unit: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block">Base Price ({industryConfig.currencySymbol})</label>
                <input type="number" placeholder="0.00" step="any"
                  value={newCommodity.basePrice || ''}
                  onChange={(e) => setNewCommodity({ ...newCommodity, basePrice: parseFloat(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block">Color</label>
                <input type="color"
                  value={newCommodity.color || '#6366f1'}
                  onChange={(e) => setNewCommodity({ ...newCommodity, color: e.target.value })}
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-2 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowAddForm(false); setNewCommodity({}); }}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl border border-white/10 transition-all text-sm">
                Cancel
              </button>
              <button onClick={addCommodity}
                disabled={!newCommodity.name || !newCommodity.unit}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30"
                style={{ background: theme.accent, color: '#000' }}
              >
                Add Commodity
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Currency & Exchange Rates ─────────────────────────────────── */}
      <section className="bg-white/[0.03] rounded-3xl border border-white/5 p-6">
        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-white/40" />
          Currency & Exchange Rates
        </h3>

        {/* Base currency selector */}
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Base Currency</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(CURRENCIES).map(([code, { symbol }]) => (
            <button
              key={code}
              onClick={() => updateCurrency(code)}
              className="px-4 py-2 rounded-xl text-sm transition-all border"
              style={industryConfig.baseCurrency === code ? {
                background: theme.accent,
                color: '#000',
                borderColor: theme.accent,
                fontWeight: 700,
              } : {
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {symbol} {code}
            </button>
          ))}
        </div>

        {/* Exchange rates */}
        {Object.keys(industryConfig.exchangeRates).length > 0 && (
          <div>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">
              1 {industryConfig.baseCurrency} ({CURRENCIES[industryConfig.baseCurrency]?.symbol}) =
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(industryConfig.exchangeRates).map(([code, rate]) => (
                <div key={code} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
                  <span className="text-white/40 text-xs font-semibold w-10">{code}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={(e) => updateExchangeRate(code, e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm focus:outline-none min-w-0"
                  />
                  <button
                    onClick={() => removeExchangeRate(code)}
                    className="p-1 text-white/15 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add exchange rate */}
        {unusedCurrencies.length > 0 && (
          <div className="mt-4">
            <p className="text-white/25 text-[10px] uppercase tracking-widest mb-2">Add rate</p>
            <div className="flex flex-wrap gap-2">
              {unusedCurrencies.map(code => (
                <button
                  key={code}
                  onClick={() => addExchangeRate(code)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] text-white/30 bg-white/[0.03] border border-dashed border-white/10 hover:border-white/20 hover:text-white/50 transition-all"
                >
                  <Plus className="w-3 h-3" /> {code}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default IndustryView;
