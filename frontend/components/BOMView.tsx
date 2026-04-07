import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, ChevronRight, ChevronDown, AlertTriangle, CheckCircle2,
  Shield, Info, Package, Zap, Plus, X, Link2,
} from 'lucide-react';
import {
  BillOfMaterials, BOMProduct, BOMEntry, SupplyNode, HistorySnapshot, IndustryConfig,
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
  industryConfig?: IndustryConfig;
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
  nodes: SupplyNode[];
  onMapNode: (productId: string, nodeId: string | null) => void;
}> = ({ node, bom, riskMap, accentColor, nodes, onMapNode }) => {
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
        <div className="bg-emerald-500/10 rounded-xl p-3 text-xs border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-bold">Mapped to Physical Node</span>
          </div>
          <p className="text-white/70">{mappedNode.name} — {mappedNode.type}</p>
          <p className="text-white/40">
            Inventory: {mappedNode.inventoryLevel}/{mappedNode.maxCapacity}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <select
              value={mappedNode.id}
              onChange={(e) => onMapNode(product.id, e.target.value || null)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs appearance-none cursor-pointer"
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id} className="bg-[#111]">{n.name} ({n.type})</option>
              ))}
            </select>
            <button
              onClick={() => onMapNode(product.id, null)}
              className="text-white/30 hover:text-red-400 transition-colors text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg hover:bg-red-500/10"
            >
              Unmap
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.03] rounded-xl p-3 text-xs border border-dashed border-white/10 space-y-3">
          <div className="flex items-center gap-1.5 text-white/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-bold">Virtual — No Physical Node Mapped</span>
          </div>
          {nodes.length > 0 && (
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1 block">
                Assign a node
              </label>
              <select
                value=""
                onChange={(e) => { if (e.target.value) onMapNode(product.id, e.target.value); }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#111]">— Select a node —</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id} className="bg-[#111]">{n.name} ({n.type})</option>
                ))}
              </select>
            </div>
          )}
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

const TIER_CATEGORIES: Record<number, BOMProduct['category']> = {
  0: 'finished-good',
  1: 'assembly',
  2: 'component',
  3: 'sub-component',
  4: 'raw-material',
};

const BOMView: React.FC<BOMViewProps> = ({
  bom, setBom, nodes, setNodes, history, industryId, accentColor, industryConfig,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal visibility
  const [showCreateBOM, setShowCreateBOM] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);

  // Create BOM form
  const [newBOMName, setNewBOMName] = useState('');
  const [newFinishedName, setNewFinishedName] = useState('');

  // Add Product form
  const [newProd, setNewProd] = useState<{
    name: string; tier: number; category: BOMProduct['category'];
    basePrice: string; commodityId: string; leadTime: string;
  }>({ name: '', tier: 1, category: 'assembly', basePrice: '', commodityId: '', leadTime: '' });

  // Add Entry form
  const [newEntry, setNewEntry] = useState<{
    parentProductId: string; childProductId: string;
    quantityPer: string; unit: string; critical: boolean;
    substitutionDifficulty: BOMEntry['substitutionDifficulty'];
  }>({ parentProductId: '', childProductId: '', quantityPer: '1', unit: 'pcs', critical: false, substitutionDifficulty: 'moderate' });

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

  const mapNode = useCallback((productId: string, nodeId: string | null) => {
    setNodes(nodes.map(n => {
      // Clear any node that currently owns this productId
      if (n.bomProductId === productId && n.id !== nodeId) {
        const { bomProductId, ...rest } = n;
        return rest as SupplyNode;
      }
      // Assign the new node
      if (n.id === nodeId) return { ...n, bomProductId: productId };
      return n;
    }));
  }, [nodes, setNodes]);

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

  const createCustomBOM = useCallback(() => {
    if (!newFinishedName.trim()) return;
    const tsId = `custom-${Date.now()}`;
    const finishedProduct: BOMProduct = {
      id: `${tsId}-root`,
      name: newFinishedName.trim(),
      tier: 0,
      category: 'finished-good',
    };
    const newBOM: BillOfMaterials = {
      id: tsId,
      finishedProductId: finishedProduct.id,
      name: newBOMName.trim() || `${newFinishedName.trim()} BOM`,
      industry: 'custom',
      products: [finishedProduct],
      entries: [],
    };
    setBom(newBOM);
    setShowCreateBOM(false);
    setNewBOMName('');
    setNewFinishedName('');
    setExpanded(new Set([finishedProduct.id]));
  }, [newBOMName, newFinishedName, setBom]);

  const addProduct = useCallback(() => {
    if (!bom || !newProd.name.trim()) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const product: BOMProduct = {
      id,
      name: newProd.name.trim(),
      tier: newProd.tier,
      category: newProd.category,
      ...(newProd.commodityId ? { commodityId: newProd.commodityId } : {}),
      ...(newProd.basePrice !== '' ? { basePrice: parseFloat(newProd.basePrice) } : {}),
      ...(newProd.leadTime !== '' ? { defaultLeadTimeDays: parseInt(newProd.leadTime) } : {}),
    };
    setBom({ ...bom, products: [...bom.products, product] });
    setShowAddProduct(false);
    setNewProd({ name: '', tier: 1, category: 'assembly', basePrice: '', commodityId: '', leadTime: '' });
  }, [bom, newProd, setBom]);

  const addEntry = useCallback(() => {
    if (!bom || !newEntry.parentProductId || !newEntry.childProductId) return;
    if (newEntry.parentProductId === newEntry.childProductId) return;
    const entry: BOMEntry = {
      parentProductId: newEntry.parentProductId,
      childProductId: newEntry.childProductId,
      quantityPer: parseFloat(newEntry.quantityPer) || 1,
      unit: newEntry.unit || 'pcs',
      critical: newEntry.critical,
      substitutionDifficulty: newEntry.substitutionDifficulty,
      source: 'user-defined',
      confidence: 90,
    };
    setBom({ ...bom, entries: [...bom.entries, entry] });
    setShowAddEntry(false);
    setNewEntry({ parentProductId: '', childProductId: '', quantityPer: '1', unit: 'pcs', critical: false, substitutionDifficulty: 'moderate' });
  }, [bom, newEntry, setBom]);

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

  /* ---------- orphaned products (added but not linked into tree) ---------- */

  const orphanProducts = useMemo(() => {
    if (!bom) return [];
    // BFS from root to collect all reachable product IDs
    const reachable = new Set<string>([bom.finishedProductId]);
    const queue = [bom.finishedProductId];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      for (const e of bom.entries) {
        if (e.parentProductId === parentId && !reachable.has(e.childProductId)) {
          reachable.add(e.childProductId);
          queue.push(e.childProductId);
        }
      }
    }
    return bom.products.filter(p => !reachable.has(p.id));
  }, [bom]);

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
            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
              <button
                onClick={loadTemplate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[40px]"
                style={{
                  backgroundColor: accentColor,
                  color: '#000',
                  boxShadow: `0 0 24px ${accentColor}33`,
                }}
              >
                <Package className="w-4 h-4" />
                Load Industry Template
              </button>
              <button
                onClick={() => setShowCreateBOM(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[40px] bg-white/[0.06] text-white hover:bg-white/10 border border-white/10"
              >
                <Plus className="w-4 h-4" />
                Custom BOM
              </button>
            </div>
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
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
              >
                <Plus className="w-3 h-3" />
                Add Product
              </button>
              <button
                onClick={() => setShowAddEntry(true)}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
              >
                <Link2 className="w-3 h-3" />
                Link Products
              </button>
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
                  nodes={nodes}
                  onMapNode={mapNode}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Section 3: Unlinked Products                                */}
      {/* ============================================================ */}
      {bom && orphanProducts.length > 0 && (
        <div className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-[10px] text-amber-400/80 uppercase tracking-[0.2em] font-bold">
              Unlinked Products ({orphanProducts.length})
            </p>
            <span className="text-[10px] text-white/30 ml-auto">Not connected to the BOM tree — use "Link Products" to add them</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {orphanProducts.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.07] transition-colors group"
                onClick={() => {
                  setNewEntry(en => ({ ...en, childProductId: p.id }));
                  setShowAddEntry(true);
                }}
                title="Click to link this product"
              >
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ backgroundColor: `${TIER_COLORS[p.tier] ?? '#64748b'}22`, color: TIER_COLORS[p.tier] ?? '#64748b' }}
                >
                  T{p.tier}
                </span>
                <span className="text-xs text-white/70">{p.name}</span>
                {p.basePrice != null && (
                  <span className="text-[10px] text-white/30">${p.basePrice}</span>
                )}
                <Link2 className="w-3 h-3 text-white/20 group-hover:text-amber-400 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Section 4: Bottleneck Alerts                                */}
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

      {/* ============================================================ */}
      {/*  Modal: Create Custom BOM                                    */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showCreateBOM && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreateBOM(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">Create Custom BOM</h3>
                <button onClick={() => setShowCreateBOM(false)} className="text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Finished Product Name *</label>
                  <input
                    type="text" placeholder="e.g. Custom Product"
                    value={newFinishedName} onChange={e => setNewFinishedName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">BOM Name</label>
                  <input
                    type="text" placeholder="e.g. My Custom BOM"
                    value={newBOMName} onChange={e => setNewBOMName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
                  />
                  <p className="text-[10px] text-white/30 mt-1">Defaults to "[Product] BOM" if left blank</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={createCustomBOM}
                  disabled={!newFinishedName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{ backgroundColor: accentColor, color: '#000' }}
                >
                  Create BOM
                </button>
                <button onClick={() => setShowCreateBOM(false)} className="px-4 py-2.5 rounded-xl text-sm text-white/50 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/*  Modal: Add Product                                          */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showAddProduct && bom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddProduct(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">Add BOM Product</h3>
                <button onClick={() => setShowAddProduct(false)} className="text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Product Name *</label>
                  <input
                    type="text" placeholder="e.g. Engine Mount"
                    value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Tier</label>
                    <select
                      value={newProd.tier}
                      onChange={e => {
                        const t = parseInt(e.target.value);
                        setNewProd(p => ({ ...p, tier: t, category: TIER_CATEGORIES[t] ?? 'component' }));
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none cursor-pointer"
                    >
                      {[0, 1, 2, 3, 4].map(t => (
                        <option key={t} value={t} className="bg-[#111]">Tier {t} — {TIER_CATEGORIES[t]?.replace(/-/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Lead Time (days)</label>
                    <input
                      type="number" placeholder="—"
                      value={newProd.leadTime} onChange={e => setNewProd(p => ({ ...p, leadTime: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Base Price ($)</label>
                    <input
                      type="number" placeholder="e.g. 250"
                      value={newProd.basePrice} onChange={e => setNewProd(p => ({ ...p, basePrice: e.target.value, commodityId: '' }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Link to Commodity</label>
                    <select
                      value={newProd.commodityId}
                      onChange={e => {
                        const cid = e.target.value;
                        const commodity = industryConfig?.commodities.find(c => c.id === cid);
                        setNewProd(p => ({ ...p, commodityId: cid, basePrice: commodity ? String(commodity.basePrice) : p.basePrice }));
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#111]">— None —</option>
                      {(industryConfig?.commodities ?? []).map(c => (
                        <option key={c.id} value={c.id} className="bg-[#111]">{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(newProd.basePrice || newProd.commodityId) && (
                  <p className="text-[10px] text-cyan-400/60">
                    {newProd.commodityId
                      ? `Price follows ${industryConfig?.commodities.find(c => c.id === newProd.commodityId)?.name} commodity — fluctuates with market`
                      : `Fixed reference price $${newProd.basePrice}/unit — auto-fills supplier cost on node mapping`}
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={addProduct}
                  disabled={!newProd.name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{ backgroundColor: accentColor, color: '#000' }}
                >
                  Add Product
                </button>
                <button onClick={() => setShowAddProduct(false)} className="px-4 py-2.5 rounded-xl text-sm text-white/50 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/*  Modal: Link Products (Add BOM Entry)                        */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showAddEntry && bom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddEntry(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">Link Products</h3>
                <button onClick={() => setShowAddEntry(false)} className="text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-white/40">Define how much of a child product is needed to produce one unit of the parent.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Parent Product *</label>
                  <select
                    value={newEntry.parentProductId}
                    onChange={e => setNewEntry(en => ({ ...en, parentProductId: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#111]">— Select parent —</option>
                    {bom.products.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#111]">T{p.tier} — {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Child Product (Input) *</label>
                  <select
                    value={newEntry.childProductId}
                    onChange={e => setNewEntry(en => ({ ...en, childProductId: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#111]">— Select child —</option>
                    {bom.products.filter(p => p.id !== newEntry.parentProductId).map(p => (
                      <option key={p.id} value={p.id} className="bg-[#111]">T{p.tier} — {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Qty per Parent Unit</label>
                    <input
                      type="number" step="any" min="0"
                      value={newEntry.quantityPer} onChange={e => setNewEntry(en => ({ ...en, quantityPer: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Unit</label>
                    <input
                      type="text" placeholder="pcs / kg / liters"
                      value={newEntry.unit} onChange={e => setNewEntry(en => ({ ...en, unit: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest mb-1 block">Substitution Difficulty</label>
                    <select
                      value={newEntry.substitutionDifficulty}
                      onChange={e => setNewEntry(en => ({ ...en, substitutionDifficulty: e.target.value as BOMEntry['substitutionDifficulty'] }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none cursor-pointer"
                    >
                      {['easy', 'moderate', 'hard', 'none'].map(v => (
                        <option key={v} value={v} className="bg-[#111]">{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-2.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox" checked={newEntry.critical}
                        onChange={e => setNewEntry(en => ({ ...en, critical: e.target.checked }))}
                        className="w-4 h-4 rounded accent-red-400"
                      />
                      <span className="text-xs text-white/60">Critical path</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={addEntry}
                  disabled={!newEntry.parentProductId || !newEntry.childProductId}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{ backgroundColor: accentColor, color: '#000' }}
                >
                  Link Products
                </button>
                <button onClick={() => setShowAddEntry(false)} className="px-4 py-2.5 rounded-xl text-sm text-white/50 bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BOMView;
