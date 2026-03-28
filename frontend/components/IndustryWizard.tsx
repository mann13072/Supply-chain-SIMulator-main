import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Car, Pill, ShoppingCart, Cpu, Wrench,
  ChevronRight, ChevronLeft, Rocket, X, Plus, Trash2,
} from 'lucide-react';
import { IndustryConfig, Commodity } from '../types';
import { PRESET_INDUSTRIES, CURRENCIES, INDUSTRY_THEMES } from '../utils/industries';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface IndustryWizardProps {
  onComplete: (config: IndustryConfig) => void;
}

/* ------------------------------------------------------------------ */
/*  Icon resolver                                                      */
/* ------------------------------------------------------------------ */
const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Sun, Car, Pill, ShoppingCart, Cpu, Wrench,
};

function IndustryIcon({ id, size = 28, className = '' }: { id: string; size?: number; className?: string }) {
  const theme = INDUSTRY_THEMES[id];
  const Icon = theme ? ICON_MAP[theme.icon] ?? Wrench : Wrench;
  return <Icon size={size} className={className} />;
}

/* ------------------------------------------------------------------ */
/*  Slide animation variants                                           */
/* ------------------------------------------------------------------ */
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 320 : -320,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -320 : 320,
    opacity: 0,
  }),
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function IndustryWizard({ onComplete }: IndustryWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [config, setConfig] = useState<IndustryConfig | null>(null);

  /* ---- helpers ---- */
  const theme = selectedId ? INDUSTRY_THEMES[selectedId] : null;
  const accent = theme?.accent ?? '#6366f1';

  function selectIndustry(id: string) {
    const preset = PRESET_INDUSTRIES.find((p) => p.id === id);
    if (!preset) return;
    setSelectedId(id);
    setConfig(JSON.parse(JSON.stringify(preset)));
  }

  function goNext() {
    setDirection(1);
    setStep((s) => s + 1);
  }
  function goBack() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  /* ---- commodity CRUD ---- */
  function updateCommodity(index: number, field: keyof Commodity, value: string | number) {
    if (!config) return;
    const updated = [...config.commodities];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, commodities: updated });
  }

  function removeCommodity(index: number) {
    if (!config) return;
    setConfig({ ...config, commodities: config.commodities.filter((_, i) => i !== index) });
  }

  function addCommodity() {
    if (!config) return;
    const newC: Commodity = {
      id: `commodity_${Date.now()}`,
      name: 'New Commodity',
      unit: 'unit',
      basePrice: 10,
      color: '#6366f1',
    };
    setConfig({ ...config, commodities: [...config.commodities, newC] });
  }

  /* ================================================================ */
  /*  Step 0 — Industry selection                                      */
  /* ================================================================ */
  function renderStep0() {
    return (
      <motion.div
        key="step0"
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
        className="flex flex-col items-center w-full max-w-5xl mx-auto px-4"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2 text-center">
          What does your supply chain move?
        </h1>
        <p className="text-white/40 text-base mb-10 text-center">
          Pick a preset or start from scratch
        </p>

        {/* Industry grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full mb-10">
          {PRESET_INDUSTRIES.map((preset) => {
            const t = INDUSTRY_THEMES[preset.id];
            const isSelected = selectedId === preset.id;
            return (
              <motion.button
                key={preset.id}
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectIndustry(preset.id)}
                className="relative text-left rounded-2xl p-5 transition-all duration-200 outline-none focus:outline-none"
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${t.accent}18, ${t.accent}08)`
                    : 'rgba(255,255,255,0.03)',
                  border: isSelected
                    ? `1.5px solid ${t.accent}`
                    : '1.5px solid rgba(255,255,255,0.06)',
                  boxShadow: isSelected
                    ? `0 0 24px ${t.accent}20, 0 0 64px ${t.accent}08`
                    : 'none',
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${t.accent}18` }}
                >
                  <IndustryIcon id={preset.id} size={22} />
                </div>

                {/* Name */}
                <div className="text-white font-semibold text-[15px] mb-1">{preset.name}</div>

                {/* Description */}
                <div className="text-white/35 text-xs leading-relaxed mb-3">{t.description}</div>

                {/* Commodity chips */}
                <div className="flex flex-wrap gap-1.5">
                  {preset.commodities.slice(0, 3).map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 text-[10px] text-white/50 bg-white/5 rounded-full px-2 py-0.5"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </span>
                  ))}
                  {preset.commodities.length > 3 && (
                    <span className="text-[10px] text-white/30 px-1">
                      +{preset.commodities.length - 3}
                    </span>
                  )}
                  {preset.commodities.length === 0 && (
                    <span className="text-[10px] text-white/25 italic">You define the commodities</span>
                  )}
                </div>

                {/* Selected check */}
                {isSelected && (
                  <motion.div
                    layoutId="check"
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: t.accent }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 6l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          disabled={!selectedId}
          onClick={goNext}
          className="flex items-center gap-2 px-7 py-3 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: selectedId ? accent : 'rgba(255,255,255,0.06)',
            color: selectedId ? '#000' : 'rgba(255,255,255,0.3)',
          }}
        >
          Next <ChevronRight size={16} />
        </button>
      </motion.div>
    );
  }

  /* ================================================================ */
  /*  Step 1 — Customize commodities                                   */
  /* ================================================================ */
  function renderStep1() {
    if (!config || !selectedId) return null;
    return (
      <motion.div
        key="step1"
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
        className="flex flex-col items-center w-full max-w-2xl mx-auto px-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${accent}18` }}
          >
            <IndustryIcon id={selectedId} size={18} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Customize your commodities
          </h2>
        </div>
        <p className="text-white/40 text-sm mb-8 text-center">
          Tweak names, units, and base prices — or add your own
        </p>

        {/* Commodity list */}
        <div className="w-full space-y-2 mb-6">
          {config.commodities.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
            >
              {/* Color dot */}
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: c.color }}
              />

              {/* Name */}
              <input
                value={c.name}
                onChange={(e) => updateCommodity(i, 'name', e.target.value)}
                className="bg-transparent text-white text-sm font-medium outline-none flex-1 min-w-0 placeholder:text-white/20"
                placeholder="Name"
              />

              {/* Unit */}
              <input
                value={c.unit}
                onChange={(e) => updateCommodity(i, 'unit', e.target.value)}
                className="bg-transparent text-white/50 text-xs outline-none w-16 text-center placeholder:text-white/20"
                placeholder="unit"
              />

              {/* Price */}
              <div className="flex items-center gap-1 text-xs text-white/50">
                <span>{config.currencySymbol}</span>
                <input
                  type="number"
                  value={c.basePrice}
                  onChange={(e) => updateCommodity(i, 'basePrice', parseFloat(e.target.value) || 0)}
                  className="bg-transparent text-white/60 text-xs outline-none w-16 text-right placeholder:text-white/20"
                  step="any"
                />
              </div>

              {/* Delete */}
              <button
                onClick={() => removeCommodity(i)}
                className="text-white/20 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/5"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Add button */}
        <button
          onClick={addCommodity}
          className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/70 transition-colors mb-10 px-4 py-2 rounded-xl border border-dashed border-white/10 hover:border-white/20"
        >
          <Plus size={14} /> Add Commodity
        </button>

        {/* Nav buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.07] transition-all"
          >
            <ChevronLeft size={15} /> Back
          </button>
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl font-medium text-sm transition-all"
            style={{ background: accent, color: '#000' }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>
    );
  }

  /* ================================================================ */
  /*  Step 2 — Launch                                                  */
  /* ================================================================ */
  function renderStep2() {
    if (!config || !selectedId) return null;
    const currencyName = CURRENCIES[config.baseCurrency]?.name ?? config.baseCurrency;

    return (
      <motion.div
        key="step2"
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
        className="flex flex-col items-center w-full max-w-lg mx-auto px-4"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2 text-center">
          Launch your supply chain
        </h2>
        <p className="text-white/40 text-sm mb-8 text-center">
          Review your setup before we build the starter network
        </p>

        {/* Summary card */}
        <div
          className="w-full rounded-3xl p-6 mb-10 border"
          style={{
            background: `linear-gradient(145deg, ${accent}0a, transparent)`,
            borderColor: `${accent}25`,
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${accent}20` }}
            >
              <IndustryIcon id={selectedId} size={20} />
            </div>
            <div>
              <div className="text-white font-semibold text-base">{config.name}</div>
              <div className="text-white/35 text-xs">{INDUSTRY_THEMES[selectedId]?.description}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.03] rounded-xl px-4 py-3">
              <div className="text-white/35 text-[10px] uppercase tracking-wider mb-1">Commodities</div>
              <div className="text-white font-semibold text-lg">{config.commodities.length}</div>
            </div>
            <div className="bg-white/[0.03] rounded-xl px-4 py-3">
              <div className="text-white/35 text-[10px] uppercase tracking-wider mb-1">Currency</div>
              <div className="text-white font-semibold text-lg">
                {config.currencySymbol} <span className="text-sm font-normal text-white/50">{currencyName}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white/[0.03] rounded-xl px-4 py-3">
            <div className="text-white/35 text-[10px] uppercase tracking-wider mb-1">Starter Network</div>
            <div className="text-white/60 text-xs leading-relaxed">
              A pre-built network of suppliers, factories, warehouses, and retail nodes will be loaded for you to customize.
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.07] transition-all"
          >
            <ChevronLeft size={15} /> Back
          </button>

          {/* Launch button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onComplete(config)}
            className="relative flex items-center gap-2.5 px-8 py-3 rounded-2xl font-semibold text-sm overflow-hidden"
            style={{ background: accent, color: '#000' }}
          >
            {/* Pulse glow behind */}
            <motion.span
              className="absolute inset-0 rounded-2xl"
              style={{ background: accent }}
              animate={{
                boxShadow: [
                  `0 0 0px ${accent}00`,
                  `0 0 32px ${accent}50`,
                  `0 0 0px ${accent}00`,
                ],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Rocket size={16} className="relative z-10" />
            <span className="relative z-10">Launch</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)',
      }}
    >
      {/* Step indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: s === step ? 32 : 10,
              background: s === step ? accent : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait" custom={direction}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </AnimatePresence>
    </motion.div>
  );
}
