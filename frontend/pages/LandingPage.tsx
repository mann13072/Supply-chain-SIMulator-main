import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Globe2, Boxes, Radar, ShieldAlert, Route as RouteIcon,
  ArrowRight, Github, Activity, GitBranch, TrendingDown,
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
  { value: 'Tier 0–4', label: 'BOM depth modelled' },
  { value: 'P10 / P90', label: 'Risk distribution output' },
  { value: 'Sea · Air', label: 'Multi-modal routing' },
  { value: 'Real-time', label: '3D globe telemetry' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const LandingPage: React.FC<Props> = ({ onGetStarted, onSignIn }) => {
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
          <button
            onClick={onSignIn}
            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            Sign In
          </button>
        </nav>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] rounded-full px-4 py-1.5 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/60 tracking-wide">Digital twin · Live simulation engine</span>
          </motion.div>

          <motion.h2
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={1}
            className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05] mb-6"
          >
            Model your supply chain<br />
            <span className="text-white/40">before it breaks.</span>
          </motion.h2>

          <motion.p
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={2}
            className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            SolarChain Twin is a high-fidelity logistics digital twin. Model global routing,
            multi-tier bills of materials, and probabilistic disruptions — then watch risk
            propagate across your network in real time.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={3}
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
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/15 text-white/80 font-medium rounded-xl px-6 py-3.5 text-sm hover:border-white/30 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </motion.div>
        </section>

        {/* Stats strip */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 border border-white/10 rounded-2xl bg-white/[0.02] divide-x divide-white/10">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="px-6 py-8 text-center"
              >
                <div className="text-2xl md:text-3xl font-bold tracking-tight mb-1">{s.value}</div>
                <div className="text-xs text-white/40 uppercase tracking-widest">{s.label}</div>
              </motion.div>
            ))}
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
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  variants={fadeUp}
                  custom={i}
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
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    custom={i}
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

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 pb-28 text-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h3 className="text-4xl md:text-5xl font-bold tracking-tighter mb-5">
              Spin up your first twin.
            </h3>
            <p className="text-white/50 max-w-xl mx-auto mb-9 leading-relaxed">
              Create a free account and start modelling a resilient global network in minutes.
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
