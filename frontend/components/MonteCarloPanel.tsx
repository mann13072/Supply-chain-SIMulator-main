import React, { useRef, useState } from 'react';
import { Dices, Loader2, X } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, AreaChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { IndustryConfig } from '../types';
import { MonteCarloResult, MetricKey, Percentiles } from '../utils/monteCarlo';
import { formatCurrencyCompact } from '../utils/formatting';

export type MonteCarloRunner = (opts: {
  runs: number;
  days: number;
  onProgress: (completedRuns: number) => void;
  isCancelled: () => boolean;
}) => Promise<MonteCarloResult | null>;

interface Props {
  run: MonteCarloRunner;
  industryConfig: IndustryConfig;
}

const CHART_STYLE = { backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' };
const AXIS_PROPS = { stroke: '#ffffff', strokeOpacity: 0.2, fontSize: 10, tickLine: false, axisLine: false };

const RUN_OPTIONS = [50, 100, 250];
const DAY_OPTIONS = [90, 180, 365];

// For each metric: how to format it, and which direction is bad (so we can name the downside tail).
const METRICS: { key: MetricKey; label: string; badWhen: 'low' | 'high'; format: (v: number, c: IndustryConfig) => string }[] = [
  { key: 'fillRate',     label: 'Fill rate',            badWhen: 'low',  format: v => `${v.toFixed(1)}%` },
  { key: 'netProfit',    label: 'Net profit',           badWhen: 'low',  format: (v, c) => formatCurrencyCompact(v, c) },
  { key: 'totalCost',    label: 'Total cost',           badWhen: 'high', format: (v, c) => formatCurrencyCompact(v, c) },
  { key: 'stockoutDays', label: 'Stockout days',        badWhen: 'high', format: v => v.toFixed(0) },
  { key: 'disruptions',  label: 'Disruption events',    badWhen: 'high', format: v => v.toFixed(0) },
  { key: 'carbonKg',     label: 'Carbon (kg CO₂)',      badWhen: 'high', format: v => Math.round(v).toLocaleString() },
  { key: 'factoryUtil',  label: 'Factory utilization',  badWhen: 'low',  format: v => `${v.toFixed(1)}%` },
];

function histogram(values: number[], bins = 20) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return [{ x: min, count: values.length }];
  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  values.forEach(v => { counts[Math.min(bins - 1, Math.floor((v - min) / width))]++; });
  return counts.map((count, i) => ({ x: min + width * (i + 0.5), count }));
}

// Key KPIs shown as distribution curves, with natural bounds so the curve isn't drawn past e.g. 100%.
const CURVE_METRICS: { key: MetricKey; bounds: [number, number] }[] = [
  { key: 'fillRate',     bounds: [0, 100] },
  { key: 'netProfit',    bounds: [-Infinity, Infinity] },
  { key: 'totalCost',    bounds: [0, Infinity] },
  { key: 'stockoutDays', bounds: [0, Infinity] },
];

/** Smoothed distribution of the actual runs (Gaussian kernel density, Silverman bandwidth). Null when every run is identical. */
function densityCurve(values: number[], bounds: [number, number], points = 80) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, n - 1));
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (std === 0 || max === min) return null;
  const h = 1.06 * std * Math.pow(n, -0.2);
  const lo = Math.max(bounds[0], min - 3 * h);
  const hi = Math.min(bounds[1], max + 3 * h);
  const norm = 1 / (n * h * Math.sqrt(2 * Math.PI));
  return Array.from({ length: points }, (_, i) => {
    const x = lo + ((hi - lo) * i) / (points - 1);
    const density = values.reduce((a, v) => a + Math.exp(-0.5 * ((x - v) / h) ** 2), 0) * norm;
    return { x, density };
  });
}

const DistributionCurve: React.FC<{
  label: string;
  values: number[];
  stats: Percentiles;
  bounds: [number, number];
  format: (v: number) => string;
}> = ({ label, values, stats, bounds, format }) => {
  const curve = densityCurve(values, bounds);
  return (
    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-white font-semibold text-sm">{label}</p>
        <p className="text-xs text-white/50 tabular-nums">median {format(stats.p50)}</p>
      </div>
      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 tabular-nums">
        P10 {format(stats.p10)} · P90 {format(stats.p90)}
      </p>
      <div className="h-40 w-full">
        {curve ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} {...AXIS_PROPS}
                tickCount={4} tickFormatter={v => format(v)} />
              <YAxis hide domain={[0, 'dataMax']} />
              <ReferenceLine x={stats.p10} stroke="#ec4899" strokeOpacity={0.7} />
              <ReferenceLine x={stats.p90} stroke="#ec4899" strokeOpacity={0.7} />
              <ReferenceLine x={stats.p50} stroke="#ffffff" strokeOpacity={0.6} strokeDasharray="4 3" />
              <Tooltip contentStyle={CHART_STYLE} labelFormatter={v => format(Number(v))}
                formatter={(v: any) => [`${(Number(v) * 100 / curve.reduce((m, p) => Math.max(m, p.density), 0)).toFixed(0)}% of peak`, 'Likelihood']} />
              <Area type="monotone" dataKey="density" stroke="#ec4899" strokeWidth={2} fill="#ec4899" fillOpacity={0.25} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-white/30">
            All runs gave {format(stats.p50)}
          </div>
        )}
      </div>
    </div>
  );
};

const MonteCarloPanel: React.FC<Props> = ({ run, industryConfig }) => {
  const [runs, setRuns] = useState(100);
  const [days, setDays] = useState(180);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [histMetric, setHistMetric] = useState<MetricKey>('fillRate');
  const cancelRef = useRef(false);

  const start = async () => {
    cancelRef.current = false;
    setProgress(0);
    const res = await run({ runs, days, onProgress: setProgress, isCancelled: () => cancelRef.current });
    setProgress(null);
    if (res) setResult(res);
  };

  const noSpread = result && METRICS.every(m => result.summary[m.key].min === result.summary[m.key].max);
  const histMeta = METRICS.find(m => m.key === histMetric)!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-8 rounded-full bg-pink-500" />
        <div>
          <h3 className="text-white font-bold text-lg tracking-tight">Monte Carlo Risk Analysis</h3>
          <p className="text-white/30 text-xs">
            Runs your network many times from its starting state with your current settings. Disruptions, demand noise and
            delays are random in every run, so the spread shows the range of outcomes you could face.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white/5 rounded-2xl border border-white/5 p-5 flex flex-wrap items-end gap-4">
        <label className="text-xs text-white/50">
          <span className="block mb-1 uppercase tracking-widest text-[10px] font-bold">Runs</span>
          <select value={runs} onChange={e => setRuns(Number(e.target.value))} disabled={progress !== null}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            {RUN_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="text-xs text-white/50">
          <span className="block mb-1 uppercase tracking-widest text-[10px] font-bold">Days per run</span>
          <select value={days} onChange={e => setDays(Number(e.target.value))} disabled={progress !== null}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        {progress === null ? (
          <button onClick={start}
            className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors">
            <Dices className="w-4 h-4" /> Run Monte Carlo
          </button>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
            <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-pink-500 transition-all" style={{ width: `${(progress / runs) * 100}%` }} />
            </div>
            <span className="text-xs text-white/50 tabular-nums">{progress}/{runs}</span>
            <button onClick={() => { cancelRef.current = true; }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/60 hover:text-white border border-white/10 rounded-lg">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        )}
      </div>

      {!result && progress === null && (
        <div className="bg-white/5 rounded-2xl border border-white/5 p-10 text-center text-white/30 text-sm">
          Choose how many runs and days, then press Run Monte Carlo.
        </div>
      )}

      {result && (
        <>
          {noSpread && (
            <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              Every run gave the same result, so there is no randomness in the current settings. Set risk probabilities or
              demand variability above zero to see a spread.
            </div>
          )}

          {/* Percentile table */}
          <div className="bg-white/5 rounded-3xl border border-white/5 p-6 overflow-x-auto">
            <p className="text-white font-semibold text-sm mb-1">Outcome distribution</p>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4">
              {result.runs} runs × {result.days} days · P10 = 10th percentile · P50 = median · P90 = 90th percentile
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-white/40 uppercase tracking-widest">
                  <th className="text-left font-bold pb-3">Metric</th>
                  <th className="text-right font-bold pb-3">P10</th>
                  <th className="text-right font-bold pb-3">P50</th>
                  <th className="text-right font-bold pb-3">P90</th>
                  <th className="text-right font-bold pb-3 pl-4">Downside case</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map(m => {
                  const s = result.summary[m.key];
                  const bad = m.badWhen === 'low' ? 'p10' : 'p90';
                  return (
                    <tr key={m.key} className="border-t border-white/5">
                      <td className="py-2.5 text-white/70">{m.label}</td>
                      {(['p10', 'p50', 'p90'] as const).map(p => (
                        <td key={p} className={`py-2.5 text-right tabular-nums ${p === bad ? 'text-red-400 font-semibold' : 'text-white'}`}>
                          {m.format(s[p], industryConfig)}
                        </td>
                      ))}
                      <td className="py-2.5 text-right text-[11px] text-white/40 pl-4 whitespace-nowrap">
                        {bad.toUpperCase()} ({m.badWhen === 'low' ? 'lower is worse' : 'higher is worse'})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-white/50 mt-4">
              Stockout risk: <span className={result.stockoutProbability > 0 ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {(result.stockoutProbability * 100).toFixed(0)}% of runs
              </span> had at least one stockout day.
            </p>
          </div>

          {/* KPI distribution (bell) curves */}
          <div>
            <p className="text-white font-semibold text-sm mb-1">Key KPI distribution curves</p>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4">
              Smoothed from the {result.runs} runs · pink lines = P10 and P90 · dashed line = median · taller = more likely
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CURVE_METRICS.map(({ key, bounds }) => {
                const meta = METRICS.find(m => m.key === key)!;
                return (
                  <DistributionCurve
                    key={key}
                    label={meta.label}
                    values={result.metrics.map(m => m[key])}
                    stats={result.summary[key]}
                    bounds={bounds}
                    format={v => meta.format(v, industryConfig)}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory fan chart */}
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
              <p className="text-white font-semibold text-sm mb-1">Network inventory range</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-5">Units on hand per day · P10–P90 band and median</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={result.inventoryBand} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                    <XAxis dataKey="day" {...AXIS_PROPS} tickFormatter={d => `D${d}`} />
                    <YAxis {...AXIS_PROPS} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                    <Tooltip contentStyle={CHART_STYLE}
                      formatter={(v: any, name: any) => [Array.isArray(v) ? `${Math.round(v[0]).toLocaleString()} – ${Math.round(v[1]).toLocaleString()}` : Math.round(v).toLocaleString(), name]} />
                    <Area type="monotone" dataKey={(d: any) => [d.p10, d.p90]} name="P10–P90" stroke="none" fill="#ec4899" fillOpacity={0.2} isAnimationActive={false} />
                    <Line type="monotone" dataKey="p50" name="Median" stroke="#ec4899" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Histogram */}
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <p className="text-white font-semibold text-sm mb-1">Distribution across runs</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">Number of runs per outcome range</p>
                </div>
                <select value={histMetric} onChange={e => setHistMetric(e.target.value as MetricKey)}
                  className="bg-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white">
                  {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogram(result.metrics.map(m => m[histMetric]))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                    <XAxis dataKey="x" {...AXIS_PROPS} tickFormatter={v => histMeta.format(v, industryConfig)} />
                    <YAxis {...AXIS_PROPS} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_STYLE} labelFormatter={v => `≈ ${histMeta.format(Number(v), industryConfig)}`} formatter={(v: any) => [v, 'Runs']} />
                    <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MonteCarloPanel;
