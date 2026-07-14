import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Globe2, Boxes, Radar, ShieldAlert, Route as RouteIcon,
  ArrowRight, Github, Activity, GitBranch, TrendingDown,
  Sun, Car, Pill, ShoppingCart, Cpu,
  Anchor, ShieldOff, CloudLightning, Users, TrendingUp, Landmark,
  Plus, Minus,
} from 'lucide-react';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const FEATURES = [
  {
    icon: Globe2,
    title: 'Global Routing Engine',
    desc: "Dijkstra's algorithm + the Haversine formula for precise real-world distances. Smart Sea vs. Air modality that auto-resolves inland sites to the nearest port.",
  },
  {
    icon: Boxes,
    title: 'Multi-Tier BOM Propagation',
    desc: 'A full Bill of Materials from finished goods (Tier 0) down to raw materials (Tier 4). Production is BOM-constrained — a single missing input halts the line.',
  },
  {
    icon: ShieldAlert,
    title: 'Risk Propagation',
    desc: 'A two-layer model: emergent stockout cascades plus predictive days-of-supply early warnings, delivered as a P10/P50/P90 output distribution.',
  },
  {
    icon: RouteIcon,
    title: 'Route Intelligence',
    desc: 'Maps real-world disruption events — Suez blockages, port strikes — to affected routes by geographic proximity, then ranks alternatives on cost, time, and risk.',
  },
  {
    icon: Radar,
    title: 'Interactive 3D Globe',
    desc: 'A D3.js globe with zoom-to-node transitions, live telemetry overlays, and real-time simulation state rendered right in the browser.',
  },
  {
    icon: Activity,
    title: 'Monte Carlo Simulation',
    desc: 'Model probabilistic disruptions across your whole network — supplier failure, cyber incidents, demand shocks — and watch cost, carbon, and service level respond.',
  },
];

const STATS = [
  { value: 'End-to-end', label: 'Raw material to store shelf' },
  { value: 'See it coming', label: 'Spot problems before they hit' },
  { value: 'Land · Sea · Air', label: 'Every way your goods move' },
  { value: 'Live', label: 'Everything updates in real time' },
];

const INDUSTRIES = [
  { icon: Sun, name: 'Solar Manufacturing', desc: 'Polysilicon → panel' },
  { icon: Car, name: 'Automotive', desc: 'JIT parts & assembly' },
  { icon: Pill, name: 'Pharmaceuticals', desc: 'Cold-chain logistics' },
  { icon: ShoppingCart, name: 'Retail / FMCG', desc: 'Farm to shelf' },
  { icon: Cpu, name: 'Tech / Electronics', desc: 'Wafer → device' },
];

const DISRUPTIONS = [
  { icon: Anchor, name: 'Port Congestion', desc: 'Docking delays ripple into lead-time variance.' },
  { icon: ShieldOff, name: 'Cyber Incident', desc: 'Throughput halved at DCs with a timed recovery.' },
  { icon: CloudLightning, name: 'Natural Disaster', desc: 'Nodes knocked offline for a recovery window.' },
  { icon: Users, name: 'Labor Strike', desc: 'Factories halt — no production that day.' },
  { icon: TrendingUp, name: 'Demand Shock', desc: 'Sudden multi-day surge drains retail inventory.' },
  { icon: Landmark, name: 'Tariffs & Geopolitics', desc: 'Customs time and per-unit tariff costs stack up.' },
];

const TECH = [
  'React 19', 'TypeScript', 'Python', 'FastAPI', 'D3.js',
  "Dijkstra's", 'Haversine', 'Monte Carlo', 'Tailwind', 'Framer Motion', 'Recharts',
];

const FAQS = [
  {
    q: 'Do I need to install anything to try it?',
    a: 'No. The simulation engine — routing, BOM explosion, risk propagation and the 3D globe — all run in your browser. Pick a preset industry and press play.',
  },
  {
    q: 'What can I actually model?',
    a: 'Multi-tier supply networks across suppliers, factories, distribution centres, warehouses and retail. You set inventory policy, transport modality, costs and risk probabilities, then watch stockouts, cost, carbon and service level evolve day by day.',
  },
  {
    q: 'How is risk calculated?',
    a: 'A two-layer model combines emergent risk (actual stockout cascades as they happen) with predictive risk (days-of-supply early warnings), summarised as a P10/P50/P90 output distribution across Monte Carlo runs.',
  },
  {
    q: 'Can I start from my own network?',
    a: 'Yes. Begin from a preset industry or build from scratch — drop nodes on the globe, import a Bill of Materials, and the engine classifies supply-chain tiers automatically.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// ── Stylized wireframe-globe used inside the product preview ──────────────────
function MiniGlobe() {
  const nodes = [
    { cx: 78, cy: 96 }, { cx: 150, cy: 70 }, { cx: 168, cy: 132 },
    { cx: 96, cy: 158 }, { cx: 120, cy: 118 },
  ];
  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto max-w-[240px] mx-auto">
      <defs>
        <radialGradient id="lp-globe" cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#1c1c22" />
          <stop offset="100%" stopColor="#08080a" />
        </radialGradient>
        <radialGradient id="lp-node" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="92" fill="url(#lp-globe)" stroke="rgba(255,255,255,0.14)" />
      {/* Latitudes */}
      {[0, 42, -42, 74, -74].map((k, i) => {
        const rx = Math.sqrt(Math.max(0, 92 * 92 - k * k));
        return <ellipse key={`lat${i}`} cx="120" cy={120 + k} rx={rx} ry="9" fill="none" stroke="rgba(255,255,255,0.08)" />;
      })}
      {/* Meridians */}
      {[92, 62, 30].map((rx, i) => (
        <ellipse key={`mer${i}`} cx="120" cy="120" rx={rx} ry="92" fill="none" stroke="rgba(255,255,255,0.08)" />
      ))}
      {/* Connection arcs */}
      <path d="M78 96 Q120 60 150 70" fill="none" stroke="rgba(52,211,153,0.5)" strokeWidth="1.2" strokeDasharray="3 3" />
      <path d="M150 70 Q170 100 168 132" fill="none" stroke="rgba(52,211,153,0.4)" strokeWidth="1.2" strokeDasharray="3 3" />
      <path d="M120 118 Q100 140 96 158" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeDasharray="3 3" />
      {/* Nodes */}
      {nodes.map((n, i) => (
        <g key={`n${i}`}>
          <circle cx={n.cx} cy={n.cy} r="10" fill="url(#lp-node)" className="animate-pulse" />
          <circle cx={n.cx} cy={n.cy} r="2.5" fill="#6ee7b7" />
        </g>
      ))}
    </svg>
  );
}

// ── Faux dashboard preview shown under the hero ───────────────────────────────
function ProductPreview() {
  const kpis = [
    { label: 'Network Health', value: '100%', tone: 'text-emerald-400' },
    { label: 'Active Shipments', value: '24', tone: 'text-white' },
    { label: 'Risk Level', value: 'LOW', tone: 'text-white' },
    { label: 'Nodes at Risk', value: '0', tone: 'text-white' },
  ];
  const telemetry = [
    { name: 'Baotou Silicon', status: 'Optimal', dot: 'bg-emerald-400' },
    { name: 'Shanghai Cell Mfg', status: 'Optimal', dot: 'bg-emerald-400' },
    { name: 'Singapore Nexus', status: 'Warning', dot: 'bg-amber-400' },
    { name: 'Rotterdam Gateway', status: 'Optimal', dot: 'bg-emerald-400' },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
      {/* Window chrome */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Zap className="w-3.5 h-3.5 text-white/60" />
          <span className="font-semibold text-white/70">CHAINSIM</span>
          <span className="text-white/20">/</span>
          <span>Solar Manufacturing</span>
        </div>
      </div>
      {/* Body */}
      <div className="p-5 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {kpis.map(k => (
            <div key={k.label} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="text-[10px] uppercase tracking-widest text-white/35 mb-1.5">{k.label}</div>
              <div className={`text-xl font-bold tracking-tight ${k.tone}`}>{k.value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-4">
            <div className="text-xs font-medium text-white/60 mb-1">Global Network</div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Live telemetry feed</div>
            <MiniGlobe />
          </div>
          <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs font-medium text-white/60 mb-3">Telemetry</div>
            <div className="space-y-2.5">
              {telemetry.map(t => (
                <div key={t.name} className="flex items-center gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.dot} shrink-0`} />
                  <span className="text-xs text-white/60 truncate">{t.name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-white/30">{t.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Days of supply</div>
              <div className="flex items-end gap-1.5 h-12">
                {[40, 62, 48, 75, 55, 82, 68, 90].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-white/15" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LandingPage: React.FC<Props> = ({ onGetStarted, onSignIn }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-white/[0.04] blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-white/[0.03] blur-[120px]" />
      </div>

      <div className="relative">
        {/* Nav */}
        <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <div className="leading-tight">
              <h1 className="font-bold tracking-tighter text-lg">
                SOLAR<span className="text-white/40 font-light">TWIN</span>
              </h1>
              <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-medium">Supply Chain OS</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={onSignIn} className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="hidden sm:inline-flex items-center gap-1.5 bg-white text-black font-semibold rounded-lg px-4 py-2 text-sm hover:bg-white/90 transition-colors"
            >
              Launch <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-16 text-center">
          <motion.div
            initial="hidden" animate="show" variants={fadeUp} custom={0}
            className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] rounded-full px-4 py-1.5 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/60 tracking-wide">Digital twin · Live simulation engine</span>
          </motion.div>

          <motion.h2
            initial="hidden" animate="show" variants={fadeUp} custom={1}
            className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05] mb-6"
          >
            Model your supply chain<br />
            <span className="text-white/40">before it breaks.</span>
          </motion.h2>

          <motion.p
            initial="hidden" animate="show" variants={fadeUp} custom={2}
            className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            SolarChain Twin is a high-fidelity logistics digital twin. Model global routing,
            multi-tier bills of materials, and probabilistic disruptions — then watch risk
            propagate across your network in real time.
          </motion.p>

          <motion.div
            initial="hidden" animate="show" variants={fadeUp} custom={3}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 bg-white text-black font-semibold rounded-xl px-6 py-3.5 text-sm hover:bg-white/90 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.12)]"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a
              href="https://github.com/mann13072"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/15 text-white/80 font-medium rounded-xl px-6 py-3.5 text-sm hover:border-white/30 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </motion.div>
        </section>

        {/* Product preview */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProductPreview />
          </motion.div>
        </section>

        {/* Stats strip */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 border border-white/10 rounded-2xl bg-white/[0.02] divide-x divide-white/10">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="px-6 py-8 text-center"
              >
                <div className="text-2xl md:text-3xl font-bold tracking-tight mb-1">{s.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-widest">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Industries */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">Presets</span>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tighter mt-3">Built for any network.</h3>
            <p className="text-white/45 mt-3 max-w-xl mx-auto">Start from a modelled industry preset — or build your own from scratch.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {INDUSTRIES.map((ind, i) => {
              const Icon = ind.icon;
              return (
                <motion.div
                  key={ind.name}
                  initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}
                  className="group border border-white/10 bg-white/[0.02] rounded-2xl p-5 text-center hover:border-white/25 hover:bg-white/[0.04] transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-white/10 transition-colors">
                    <Icon className="w-5 h-5 text-white/80" />
                  </div>
                  <div className="text-sm font-semibold mb-0.5">{ind.name}</div>
                  <div className="text-xs text-white/40">{ind.desc}</div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="text-center mb-14">
            <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">Capabilities</span>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tighter mt-3">
              Everything you need to stress-test a network.
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={fadeUp} custom={i}
                  className="group border border-white/10 bg-white/[0.02] rounded-2xl p-7 hover:border-white/25 hover:bg-white/[0.04] transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-5 group-hover:bg-white/10 transition-colors">
                    <Icon className="w-5 h-5 text-white/80" />
                  </div>
                  <h4 className="font-semibold text-base mb-2">{f.title}</h4>
                  <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="border border-white/10 rounded-3xl bg-white/[0.02] p-10 md:p-14">
            <div className="text-center mb-12">
              <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">Workflow</span>
              <h3 className="text-3xl font-bold tracking-tighter mt-3">Three steps to a live twin.</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: GitBranch, step: '01', title: 'Build the network', desc: 'Drop nodes on the globe or import a BOM. Suppliers, factories, DCs, and retail snap to real ports and airports.' },
                { icon: Activity, step: '02', title: 'Run the simulation', desc: 'Press play. Demand explodes down the BOM, orders flow, and probabilistic disruptions fire across the tiers.' },
                { icon: TrendingDown, step: '03', title: 'Read the risk', desc: 'Watch stockout cascades, days-of-supply warnings, cost, and carbon update live — then reroute around them.' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.step}
                    initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white/80" />
                      </div>
                      <span className="text-2xl font-bold text-white/20 tracking-tighter">{s.step}</span>
                    </div>
                    <h4 className="font-semibold mb-2">{s.title}</h4>
                    <p className="text-sm text-white/45 leading-relaxed">{s.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Disruptions */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="text-center mb-14">
            <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">Resilience</span>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tighter mt-3">
              Model the disruptions that actually happen.
            </h3>
            <p className="text-white/45 mt-3 max-w-xl mx-auto">
              Fire any of these probabilistically and watch the shockwave move through your tiers.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DISRUPTIONS.map((d, i) => {
              const Icon = d.icon;
              return (
                <motion.div
                  key={d.name}
                  initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={fadeUp} custom={i}
                  className="flex gap-4 border border-white/10 bg-white/[0.02] rounded-2xl p-6 hover:border-white/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-white/80" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{d.name}</h4>
                    <p className="text-xs text-white/45 leading-relaxed">{d.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Tech stack */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="border border-white/10 rounded-2xl bg-white/[0.02] px-8 py-8 text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">Under the hood</span>
            <div className="flex flex-wrap justify-center gap-2.5 mt-5">
              {TECH.map(t => (
                <span key={t} className="text-xs border border-white/10 bg-white/[0.03] text-white/55 px-3 py-1.5 rounded-lg">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-6 pb-24">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium">FAQ</span>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tighter mt-3">Questions, answered.</h3>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className="border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-medium text-sm md:text-base">{f.q}</span>
                    <span className="shrink-0 text-white/50">
                      {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="px-6 pb-5 text-sm text-white/45 leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 pb-28 text-center">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <h3 className="text-4xl md:text-5xl font-bold tracking-tighter mb-5">
              Spin up your first twin.
            </h3>
            <p className="text-white/50 max-w-xl mx-auto mb-9 leading-relaxed">
              Jump straight in and start modelling a resilient global network in minutes.
            </p>
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 bg-white text-black font-semibold rounded-xl px-7 py-4 text-sm hover:bg-white/90 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.12)]"
            >
              Get Started — it's free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-white/50" />
              <span>SolarChain Twin · Supply Chain OS</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://github.com/mann13072" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">GitHub</a>
              <button onClick={onSignIn} className="hover:text-white/70 transition-colors">Sign In</button>
              <button onClick={onGetStarted} className="hover:text-white/70 transition-colors">Get Started</button>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
