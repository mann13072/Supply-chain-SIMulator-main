import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, ChevronRight, ChevronDown, AlertTriangle, CheckCircle2,
  Shield, Info, Package, Zap,
} from 'lucide-react';
import {
  BillOfMaterials, BOMProduct, BOMEntry, SupplyNode, HistorySnapshot,
} from '../types';
import { getIndustryBOM, autoMapNodesToBOM } from '../utils/industryBOMs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BOMViewProps {
  bom: BillOfMaterials | null;
  setBom: (bom: BillOfMaterials | null) => void;
  nodes: SupplyNode[];
  setNodes: (nodes: SupplyNode[]) => void;
  history: HistorySnapshot[];
  industryId: string;
  accentColor: string;
}

interface TreeNode {
  product: BOMProduct;
  entry: BOMEntry | null;          // null for the root (finished good)
  children: TreeNode[];
  mappedNode: SupplyNode | null;
  riskPct: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TIER_COLORS: Record<number, string> = {
  0: '#3b82f6',
  1: '#8b5cf6',
  2: '#f59e0b',
  3: '#f97316',
  4: '#ef4444',
};

const riskBarColor = (pct: number) =>
  pct > 60 ? '#ef4444' : pct > 30 ? '#f59e0b' : '#22c55e';

/* ------------------------------------------------------------------ */
/*  Tree builder                                                       */
/* ------------------------------------------------------------------ */

function buildTree(
  bom: BillOfMaterials,
  nodeMap: Map<string, SupplyNode>,
  riskMap: Map<string, number>,
): TreeNode | null {
  const productById = new Map(bom.products.map(p => [p.id, p]));
  const childrenByParent = new Map<string, BOMEntry[]>();
  for (const e of bom.entries) {
    const list = childrenByParent.get(e.parentProductId) ?? [];
    list.push(e);
    childrenByParent.set(e.parentProductId, list);
  }

  const build = (productId: string, entry: BOMEntry | null): TreeNode | null => {
    const product = productById.get(productId);
    if (!product) return null;
    const childEntries = childrenByParent.get(productId) ?? [];
    const children: TreeNode[] = [];
    for (const ce of childEntries) {
      const child = build(ce.childProductId, ce);
      if (child) children.push(child);
    }
    return {
      product,
      entry,
      children,
      mappedNode: nodeMap.get(productId) ?? null,
      riskPct: riskMap.get(productId) ?? 0,
    };
  };

  return build(bom.finishedProductId, null);
}

/* ------------------------------------------------------------------ */
/*  Tier badge                                                         */
/* ------------------------------------------------------------------ */

const TierBadge: React.FC<{ tier: number }> = ({ tier }) => (
  <span
    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
    style={{
      backgroundColor: `${TIER_COLORS[tier] ?? '#64748b'}22`,
      color: TIER_COLORS[tier] ?? '#64748b',
    }}
  >
    T{tier}
  </span>
);

/* ------------------------------------------------------------------ */
/*  Tree row                                                           */
/* ------------------------------------------------------------------ */

const TreeRow: React.FC<{
  node: TreeNode;
  expanded: Set<string>;
  toggle: (id: string) => void;
  select: (id: string) => void;
  selectedId: string | null;
}> = React.memo(({ node, expanded, toggle, select, selectedId }) => {
  const { product, entry, children, mappedNode, riskPct } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(product.id);
  const isSelected = selectedId === product.id;
  const isTemplate = entry?.source === 'template-default';
  const confidence = entry?.confidence ?? 100;

  return (
    <>
      {/* Row */}
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.15 }}
        className={`flex items-center gap-2 py-2 px-3 rounded-xl cursor-pointer transition-colors group
          ${isSelected ? 'bg-white/10 border border-white/10' : 'hover:bg-white/[0.04]'}
          ${isTemplate ? 'border border-dashed border-white/10' : 'border border-transparent'}
        `}
        style={{ paddingLeft: `${product.tier * 24 + 12}px` }}
        onClick={() => select(product.id)}
        title={isTemplate && entry?.rationale ? entry.rationale : undefined}
      >
        {/* Expand/collapse */}
        <button
          className="w-5 h-5 flex items-center justify-center shrink-0 text-white/30 hover:text-white/70 transition-colors"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(product.id); }}
        >
          {hasChildren
            ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
            : <span className="w-4" />}
        </button>

        <TierBadge tier={product.tier} />

        {/* Name */}
        <span className="text-sm font-medium text-white truncate">{product.name}</span>

        {/* Quantity */}
        {entry && (
          <span className="text-xs text-white/30 shrink-0">
            x{entry.quantityPer} {entry.unit}
          </span>
        )}

        {/* Risk bar */}
        {riskPct > 0 && (
          <div className="w-16 h-1.5 rounded-full bg-white/5 shrink-0 overflow-hidden ml-auto">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(riskPct, 100)}%`, backgroundColor: riskBarColor(riskPct) }}
            />
          </div>
        )}
        {riskPct > 0 && (
          <span className="text-[10px] font-bold shrink-0" style={{ color: riskBarColor(riskPct) }}>
            {riskPct.toFixed(0)}%
          </span>
        )}

        {/* Confidence opacity */}
        <span
          className="text-[10px] text-white/40 shrink-0"
          style={{ opacity: confidence / 100 }}
        >
          {confidence}%
        </span>

        {/* Mapping indicator */}
        {mappedNode ? (
          <span className="flex items-center gap-1 shrink-0" title={mappedNode.name}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[10px] text-emerald-400 truncate max-w-[80px] hidden sm:inline">
              {mappedNode.name}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1 shrink-0 text-white/20">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px] hidden sm:inline">Unmapped</span>
          </span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isExpanded &&
          children.map(child => (
            <TreeRow
              key={child.product.id}
              node={child}
              expanded={expanded}
              toggle={toggle}
              select={select}
              selectedId={selectedId}
            />
          ))}
      </AnimatePresence>
    </>
  );
});
TreeRow.displayName = 'TreeRow';

/* ------------------------------------------------------------------ */
/*  Detail panel                                                       */
/* ------------------------------------------------------------------ */

const DetailPanel: React.FC<{
  node: TreeNode;
  bom: BillOfMaterials;
  riskMap: Map<string, number>;
  accentColor: string;
}> = ({ node, bom, riskMap, accentColor }) => {
  const { product, entry, mappedNode, riskPct } = node;

  // Risk attribution: walk up from this product to root
  const riskChain = useMemo(() => {
    const chain: { name: string; risk: number }[] = [];
    const parentOf = new Map<string, string>();
    for (const e of bom.entries) parentOf.set(e.childProductId, e.parentProductId);
    let current = product.id;
    const productById = new Map<string, BOMProduct>(bom.products.map(p => [p.id, p]));
    while (current) {
      const p = productById.get(current);
      if (p) chain.push({ name: p.name, risk: riskMap.get(current) ?? 0 });
      current = parentOf.get(current)!;
    }
    return chain;
  }, [product.id, bom, riskMap]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="bg-white/5 rounded-2xl border border-white/5 p-5 space-y-5 overflow-y-auto max-h-[60vh]"
    >
      <div className="flex items-center gap-2">
        <TierBadge tier={product.tier} />
        <h4 className="text-white font-bold text-base">{product.name}</h4>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white/[0.03] rounded-xl p-3">
          <p className="text-white/40 mb-1">Category</p>
          <p className="text-white font-medium capitalize">{product.category.replace(/-/g, ' ')}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3">
          <p className="text-white/40 mb-1">Lead Time</p>
          <p className="text-white font-medium">{product.defaultLeadTimeDays ?? '—'} days</p>
        </div>
        {entry && (
          <>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-white/40 mb-1">Source</p>
              <p className="text-white font-medium capitalize">{entry.source.replace(/-/g, ' ')}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-white/40 mb-1">Confidence</p>
              <p className="text-white font-medium">{entry.confidence}%</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-white/40 mb-1">Critical</p>
              <p className={`font-medium ${entry.critical ? 'text-red-400' : 'text-emerald-400'}`}>
                {entry.critical ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-white/40 mb-1">Substitution</p>
              <p className="text-white font-medium capitalize">{entry.substitutionDifficulty}</p>
            </div>
          </>
        )}
      </div>

      {/* Rationale */}
      {entry?.rationale && (
        <div className="bg-white/[0.03] rounded-xl p-3 text-xs">
          <div className="flex items-center gap-1.5 text-white/40 mb-1">
            <Info className="w-3 h-3" />
            <span>Rationale</span>
          </div>
          <p className="text-white/70 leading-relaxed">{entry.rationale}</p>
        </div>
      )}

      {/* Mapped node */}
      {mappedNode ? (
        <div className="bg-emerald-500/10 rounded-xl p-3 text-xs border border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-bold">Mapped to Physical Node</span>
          </div>
          <p className="text-white/70">{mappedNode.name} — {mappedNode.type}</p>
          <p className="text-white/40 mt-1">
            Inventory: {mappedNode.inventoryLevel}/{mappedNode.maxCapacity}
          </p>
        </div>
      ) : (
        <div className="bg-white/[0.03] rounded-xl p-3 text-xs border border-dashed border-white/10">
          <div className="flex items-center gap-1.5 text-white/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-bold">Virtual — No Physical Node Mapped</span>
          </div>
        </div>
      )}

      {/* Risk chain */}
      {riskPct > 0 && riskChain.length > 1 && (
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">
            Risk Attribution Chain
          </p>
          <div className="space-y-1">
            {riskChain.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div
                  className="w-8 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: riskBarColor(item.risk),
                    opacity: item.risk > 0 ? 1 : 0.2,
                  }}
                />
                <span className="text-white/60">{item.name}</span>
                <span className="text-white/30 ml-auto font-mono text-[10px]">
                  {item.risk.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const BOMView: React.FC<BOMViewProps> = ({
  bom, setBom, nodes, setNodes, history, industryId, accentColor,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ---------- derived data ---------- */

  const nodeMap = useMemo(
    () => {
      const m = new Map<string, SupplyNode>();
      for (const n of nodes) {
        if (n.bomProductId) m.set(n.bomProductId, n);
      }
      return m;
    },
    [nodes],
  );

  const latestSnap = history.length > 0 ? history[history.length - 1] : null;

  const riskMap = useMemo(() => {
    const m = new Map<string, number>();
    if (latestSnap?.bomRiskScores) {
      for (const r of latestSnap.bomRiskScores) m.set(r.productId, r.riskPct);
    }
    return m;
  }, [latestSnap]);

  const tree = useMemo(
    () => (bom ? buildTree(bom, nodeMap, riskMap) : null),
    [bom, nodeMap, riskMap],
  );

  /* ---------- confidence summary ---------- */

  const confidenceSummary = useMemo(() => {
    if (!bom) return null;
    const entries = bom.entries;
    if (entries.length === 0) return { overall: 0, tiers: {} as Record<number, { total: number; mapped: number }> };
    const overall = entries.reduce((s, e) => s + e.confidence, 0) / entries.length;
    const tiers: Record<number, { total: number; mapped: number }> = {};
    const productById = new Map<string, BOMProduct>(bom.products.map(p => [p.id, p]));
    for (const e of entries) {
      const child = productById.get(e.childProductId);
      if (!child) continue;
      const t = child.tier;
      if (!tiers[t]) tiers[t] = { total: 0, mapped: 0 };
      tiers[t].total += 1;
      if (nodeMap.has(e.childProductId)) tiers[t].mapped += 1;
    }
    return { overall, tiers };
  }, [bom, nodeMap]);

  /* ---------- bottleneck & demand data ---------- */

  const bottlenecks = latestSnap?.materialBottlenecks ?? [];
  const demandExplosion = latestSnap?.demandExplosion ?? [];
  const demandBottlenecks = demandExplosion.filter(d => d.requiredQty > d.availableQty);

  const demandChartData = useMemo(() => {
    if (!bom) return [];
    const productById = new Map<string, BOMProduct>(bom.products.map(p => [p.id, p]));
    return demandExplosion
      .filter(d => d.requiredQty > d.availableQty)
      .slice(0, 10)
      .map(d => ({
        name: productById.get(d.productId)?.name ?? d.productId,
        required: d.requiredQty,
        available: d.availableQty,
      }));
  }, [demandExplosion, bom]);

  /* ---------- callbacks ---------- */

  const toggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const loadTemplate = useCallback(() => {
    const result = getIndustryBOM(industryId);
    if (result) {
      setBom(result);
      // Auto-map existing nodes to BOM products and initialize materialInventory
      setNodes(autoMapNodesToBOM(nodes, result));
      // Auto-expand tier 0 and tier 1
      const t01 = new Set(result.products.filter(p => p.tier <= 1).map(p => p.id));
      setExpanded(t01);
    }
  }, [industryId, nodes, setBom, setNodes]);

  const clearBom = useCallback(() => {
    setBom(null);
    // Strip BOM fields from nodes
    setNodes(nodes.map(n => {
      const { bomProductId, tier, materialInventory, ...rest } = n;
      return rest as SupplyNode;
    }));
    setSelectedId(null);
    setExpanded(new Set());
  }, [nodes, setBom, setNodes]);

  /* ---------- find selected tree node ---------- */

  const selectedTreeNode = useMemo(() => {
    if (!tree || !selectedId) return null;
    const search = (n: TreeNode): TreeNode | null => {
      if (n.product.id === selectedId) return n;
      for (const c of n.children) {
        const found = search(c);
        if (found) return found;
      }
      return null;
    };
    return search(tree);
  }, [tree, selectedId]);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">

      {/* ============================================================ */}
      {/*  Section 1: Top Bar                                          */}
      {/* ============================================================ */}
      <div className="bg-white/5 rounded-2xl border border-white/5 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accentColor}22` }}
            >
              <Layers className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Bill of Materials</h2>
              <p className="text-white/40 text-xs">
                {bom ? bom.name : 'No BOM configured'}
              </p>
            </div>
          </div>

          {!bom ? (
            <button
              onClick={loadTemplate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all self-start sm:self-auto min-h-[40px]"
              style={{
                backgroundColor: accentColor,
                color: '#000',
                boxShadow: `0 0 24px ${accentColor}33`,
              }}
            >
              <Package className="w-4 h-4" />
              Load Industry Template
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {/* Confidence pill */}
              {confidenceSummary && (
                <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-1.5">
                  <Shield className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-xs font-bold text-white">
                    {confidenceSummary.overall.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-white/30">confidence</span>
                </div>
              )}

              {/* Tier coverage badges */}
              {confidenceSummary &&
                (Object.entries(confidenceSummary.tiers) as [string, { total: number; mapped: number }][])
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([tier, { total, mapped }]) => (
                    <span
                      key={tier}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg"
                      style={{
                        backgroundColor: `${TIER_COLORS[Number(tier)] ?? '#64748b'}18`,
                        color: TIER_COLORS[Number(tier)] ?? '#64748b',
                      }}
                    >
                      Tier {tier}: {mapped}/{total} mapped
                    </span>
                  ))}

              <button
                onClick={clearBom}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider font-bold px-2 py-1"
              >
                Clear BOM
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 2: BOM Tree                                         */}
      {/* ============================================================ */}
      {bom && tree && (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Tree panel */}
          <div className={`${selectedTreeNode ? 'col-span-12 lg:col-span-7' : 'col-span-12'}`}>
            <div className="bg-white/5 rounded-2xl border border-white/5 p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
                  Product Structure
                </p>
                <span className="text-[10px] text-white/20">
                  {bom.products.length} products &middot; {bom.entries.length} links
                </span>
              </div>

              <div className="space-y-0.5 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                <AnimatePresence initial={false}>
                  <TreeRow
                    node={tree}
                    expanded={expanded}
                    toggle={toggle}
                    select={select}
                    selectedId={selectedId}
                  />
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selectedTreeNode && bom && (
              <div className="col-span-12 lg:col-span-5">
                <DetailPanel
                  node={selectedTreeNode}
                  bom={bom}
                  riskMap={riskMap}
                  accentColor={accentColor}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Section 3: Bottleneck Alerts                                */}
      {/* ============================================================ */}
      {bom && (bottlenecks.length > 0 || demandBottlenecks.length > 0) && (
        <div className="space-y-4">
          {/* Material bottlenecks */}
          {bottlenecks.length > 0 && (
            <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
                  Material Bottlenecks
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bottlenecks.map((b, i) => {
                  const severity = b.daysUntilStockout <= 3
                    ? 'border-red-500/30 bg-red-500/5'
                    : b.daysUntilStockout <= 7
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-white/5 bg-white/[0.03]';
                  const textColor = b.daysUntilStockout <= 3
                    ? 'text-red-400'
                    : b.daysUntilStockout <= 7
                      ? 'text-amber-400'
                      : 'text-white/60';
                  return (
                    <motion.div
                      key={`${b.factoryId}-${b.materialId}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`rounded-xl border p-3 ${severity}`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${textColor}`} />
                        <div className="text-xs leading-relaxed">
                          <span className="text-white/70 font-medium">{b.materialName}</span>
                          <span className="text-white/30"> runs out in </span>
                          <span className={`font-bold ${textColor}`}>
                            {b.daysUntilStockout} days
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Demand explosion */}
          {demandExplosion.length > 0 && (
            <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
                    Demand Explosion
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-white/30">
                    {demandExplosion.length} products tracked
                  </span>
                  {demandBottlenecks.length > 0 && (
                    <span className="text-red-400 font-bold">
                      {demandBottlenecks.length} bottleneck{demandBottlenecks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {demandChartData.length > 0 && (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={demandChartData}
                      margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                        tickLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                      />
                      <Bar dataKey="required" name="Required" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="available" name="Available" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Shortfall list for remaining items */}
              {demandBottlenecks.length > 0 && demandChartData.length === 0 && (
                <div className="space-y-2">
                  {demandBottlenecks.slice(0, 6).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white/[0.03] rounded-xl px-3 py-2">
                      <span className="text-white/60">{d.productId}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-red-400 font-mono">need {d.requiredQty}</span>
                        <span className="text-white/20">/</span>
                        <span className="text-emerald-400 font-mono">have {d.availableQty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state when BOM is loaded but no bottlenecks */}
      {bom && bottlenecks.length === 0 && demandBottlenecks.length === 0 && history.length > 0 && (
        <div className="bg-white/5 rounded-2xl border border-white/5 p-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-white/40">
            No material bottlenecks or demand shortfalls detected in the latest simulation step.
          </p>
        </div>
      )}
    </div>
  );
};

export default BOMView;
