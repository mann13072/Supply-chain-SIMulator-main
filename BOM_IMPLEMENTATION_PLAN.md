# Multi-Tier BOM Propagation & Automated Scaling — Implementation Plan

## Current State

The simulator has **no explicit BOM**. The only material-related fields are:

| Field | Location | What it does |
|---|---|---|
| `materialId` | `SupplyNode` (SUPPLIER) | Tags which commodity a supplier provides |
| `inputMaterialIds` | `SupplyNode` (FACTORY) | Lists commodities consumed — but only as a **cost multiplier**, not a physical constraint |
| `outputProduct` | `SupplyNode` (FACTORY) | A text label, no structural meaning |
| `Commodity` | `IndustryConfig` | Price/unit/color metadata — no BOM linkage |

### Three engine-level gaps that block tier-down risk assessment

1. **Single inventory pool** — Every node has one `inventoryLevel`. A factory needing steel + copper + semiconductors tracks them as one combined number. Having 500 units of steel and 0 semiconductors still shows `inventoryLevel = 500`.

2. **Production is not material-constrained** — `grossProduction = capacity × yieldRate × squeeze` (App.tsx:352). The engine never checks "do I have enough of each input per the BOM ratio?" `inputMaterialIds` only affects cost, not whether production can happen.

3. **Reordering is monolithic** — A factory places one order to the best upstream route (App.tsx:491-518). It doesn't independently track or reorder each input material.

**Consequence:** A Tier 3 disruption can only manifest as slow inventory bleed over many days. There is no instant structural signal like "silicon supplier offline → factory cannot produce → 100% of output at risk."

---

## Revised Plan — 7 Phases

### Phase 1: Data Model (types.ts)

New interfaces:

```typescript
/* ── BOM Product: any item that appears in a bill of materials ── */
export interface BOMProduct {
  id: string;
  name: string;
  tier: number;              // 0 = finished good, 1 = major assembly, 2 = component,
                             // 3 = sub-component, 4 = raw material
  category: string;          // "finished-good" | "assembly" | "component" | "raw-material"
  commodityId?: string;      // links to existing Commodity (for raw materials)
  defaultLeadTimeDays?: number;
}

/* ── BOM Entry: one parent-child relationship with quantity ratio ── */
export interface BOMEntry {
  parentProductId: string;   // e.g. "powertrain-assembly"
  childProductId: string;    // e.g. "semiconductor-chip"
  quantityPer: number;       // units of child needed per 1 unit of parent
  unit: string;              // "pcs", "kg", "liters"

  // Criticality
  critical: boolean;                                     // single-source or irreplaceable?
  substitutionDifficulty: 'easy' | 'moderate' | 'hard' | 'none';

  // Transparency & Auditability
  source: 'user-defined' | 'template-default' | 'ai-inferred';
  confidence: number;        // 0–100%, how trustworthy this entry is
  rationale?: string;        // "Standard automotive BOM: mid-size sedan, steel-body"
}

/* ── Bill of Materials: the full tree for a finished good ── */
export interface BillOfMaterials {
  id: string;
  finishedProductId: string;
  name: string;
  industry: string;
  products: BOMProduct[];
  entries: BOMEntry[];
}
```

Extensions to existing interfaces:

```typescript
/* ── SupplyNode: add material-specific inventory + BOM linkage ── */
export interface SupplyNode {
  // ... all existing fields unchanged ...

  // NEW: BOM linkage
  bomProductId?: string;        // which BOM product this node produces/supplies
  tier?: number;                // 0–4, inferred from BOM or manually set

  // NEW: Material-specific inventory (factories only)
  // Keys = BOMProduct.id (child material), Values = quantity on hand
  materialInventory?: Record<string, number>;
  // Existing inventoryLevel becomes the OUTPUT BUFFER (finished goods ready to ship)
}

/* ── InTransitShipment: shipments carry material identity ── */
export interface InTransitShipment {
  // ... all existing fields unchanged ...

  materialId?: string;          // NEW: which material this shipment carries
}

/* ── IndustryConfig: embed default BOM ── */
export interface IndustryConfig {
  // ... all existing fields unchanged ...

  defaultBOM?: BillOfMaterials; // NEW: standard BOM template for this industry
}

/* ── HistorySnapshot: BOM-specific metrics per day ── */
export interface HistorySnapshot {
  // ... all existing fields unchanged ...

  // NEW: BOM metrics
  bomRiskScores?: { productId: string; riskPct: number }[];
  demandExplosion?: { productId: string; requiredQty: number; availableQty: number }[];
  materialBottleneck?: { factoryId: string; materialId: string; daysUntilStockout: number }[];
}
```

### Backward Compatibility

All new fields are **optional**. Networks without BOM data use existing single-pool logic unchanged. The engine checks `if (bom && node.bomProductId)` before applying any BOM-aware logic.

---

### Phase 2: Standard Industry BOM Templates

**New file:** `frontend/utils/industryBOMs.ts`

Pre-built BOM trees for 5 industries, each covering 4 tiers with 15–30 entries. Every template entry is tagged `source: 'template-default'` with a `confidence` score and `rationale`.

#### Example — Automotive

```
Tier 0: Finished Vehicle (1)
├── Tier 1: Powertrain Assembly (1)           confidence: 85%
│   ├── Tier 2: Engine Block (1)              confidence: 80%
│   │   ├── Tier 3: Cast Iron (85 kg)         confidence: 70%
│   │   │   └── Tier 4: Iron Ore (120 kg)     confidence: 60%
│   │   └── Tier 3: Aluminum Alloy (15 kg)    confidence: 70%
│   │       └── Tier 4: Bauxite (45 kg)       confidence: 55%
│   ├── Tier 2: Transmission (1)
│   │   └── Tier 3: Steel Gears (12 kg)
│   │       └── Tier 4: Steel Coil (18 kg)
│   └── Tier 2: Electronics Module (3)
│       ├── Tier 3: Semiconductor Chips (8)   critical: true, substitution: hard
│       │   └── Tier 4: Silicon Wafer (0.5)   critical: true, substitution: none
│       └── Tier 3: Copper Wiring (2 kg)
│           └── Tier 4: Copper Ore (6 kg)
├── Tier 1: Chassis & Body (1)
│   ├── Tier 2: Steel Frame (350 kg)
│   │   └── Tier 3: Hot-Rolled Steel (400 kg)
│   │       └── Tier 4: Iron Ore (560 kg)
│   └── Tier 2: Rubber Components (4)
│       └── Tier 3: Natural Rubber (8 kg)
│           └── Tier 4: Latex (12 kg)
└── Tier 1: Interior & Trim (1)
    └── Tier 2: Plastics (25 kg)
        └── Tier 3: Polymer Pellets (28 kg)
            └── Tier 4: Petroleum Distillate (35 kg)
```

**Additional templates:** Electronics (smartphone), Pharmaceutical, Food & Beverage, Apparel.

#### Auto-Mapping Logic

When a user loads a template:

1. Match SUPPLIER nodes to Tier 3/4 raw materials via `materialId` → `commodityId` fuzzy match
2. Match FACTORY nodes to Tier 1/2 assemblies via `outputProduct` → BOM product name
3. Unmatched products become **virtual nodes** (gray, dashed border) — assumed infinite supply but with a `confidence: 30%` risk penalty
4. User gets a mapping report: "Auto-mapped 6 of 18 BOM products. 12 remain as estimates."

---

### Phase 3: Simulation Engine Changes (App.tsx `computeNextSimulationState`)

These are the core changes that make tier-down risk **emergent** in the simulation rather than a formula overlay.

#### Change 3a: Material-Specific Inventory at Factories

When a shipment arrives at a factory (Step 1), route it to the correct material bin:

```typescript
// Step 1 (arriving shipments) — MODIFIED
if (arriving.materialId && dest.materialInventory) {
  // Route to specific material bin
  dest.materialInventory[arriving.materialId] =
    (dest.materialInventory[arriving.materialId] || 0) + arriving.quantity;
} else {
  // Existing behavior: add to generic inventory pool
  dest.inventoryLevel = Math.min(dest.maxCapacity, dest.inventoryLevel + arriving.quantity);
}
```

#### Change 3b: BOM-Constrained Production

Replace the production logic for factories with BOM data. The key insight: **output = min(capacity, min(available[material_i] / quantityPer[material_i]) for all inputs)**.

```typescript
// Step 2 (production) — MODIFIED for BOM-aware factories
const grossProduction = Math.floor(productionCapacity * yieldRate * effectiveSqueeze);

let materialCap = Infinity;
let bottleneckMaterial: string | null = null;

if (bom && node.bomProductId && node.materialInventory) {
  const inputs = bom.entries.filter(e => e.parentProductId === node.bomProductId);
  for (const input of inputs) {
    const available = node.materialInventory[input.childProductId] || 0;
    const canMake = Math.floor(available / input.quantityPer);
    if (canMake < materialCap) {
      materialCap = canMake;
      bottleneckMaterial = input.childProductId;
    }
  }
}

const targetProduction = Math.min(grossProduction, demandCap, materialCap);

// ... defects, space cap, cost calc (unchanged) ...

// CONSUME input materials after production
if (bom && node.bomProductId && node.materialInventory && actualProduced > 0) {
  for (const input of bom.entries.filter(e => e.parentProductId === node.bomProductId)) {
    node.materialInventory[input.childProductId] -= actualProduced * input.quantityPer;
  }
}

// Track bottleneck for snapshot
if (bottleneckMaterial && materialCap < grossProduction) {
  materialBottlenecks.push({
    factoryId: node.id,
    materialId: bottleneckMaterial,
    daysUntilStockout: /* available / dailyUsageRate */
  });
}

// actualProduced goes to inventoryLevel (output buffer)
node.inventoryLevel = Math.min(node.maxCapacity, node.inventoryLevel + actualProduced);
```

**Fallback:** If `!bom || !node.bomProductId || !node.materialInventory`, the entire block is skipped and existing single-pool logic runs. Zero breaking changes.

#### Change 3c: Per-Material Reordering

For BOM-aware factories, replace the single reorder check with one check per input material:

```typescript
// Step 5 (reorder) — ADDITIONAL block for BOM-aware factories
if (bom && node.bomProductId && node.materialInventory && node.type === NodeType.FACTORY) {
  const inputs = bom.entries.filter(e => e.parentProductId === node.bomProductId);

  for (const input of inputs) {
    const onHand = node.materialInventory[input.childProductId] || 0;
    const dailyUsage = (node.productionCapacity || 100) * input.quantityPer;
    const bufferDays = 2; // safety factor
    const materialReorderPoint = dailyUsage * bufferDays;

    if (onHand > materialReorderPoint) continue; // this material is fine

    // Find routes from suppliers that provide THIS specific material
    const materialRoutes = routes.filter(r => {
      const src = nextNodes.find(n => n.id === r.fromId);
      return r.toId === node.id && src?.bomProductId === input.childProductId;
    });

    if (materialRoutes.length === 0) continue; // virtual node, no physical supplier

    // Select best route (same scoring logic as existing multi-sourcing)
    // ... order qty = dailyUsage * leadTime * safetyFactor ...
    // ... create shipment with materialId = input.childProductId ...
  }
  return; // skip the generic reorder below
}

// ... existing single-pool reorder logic (unchanged, runs for non-BOM nodes) ...
```

#### Change 3d: Shipments Carry Material Identity

When creating a shipment from a BOM-aware reorder:

```typescript
nextShipments.push({
  // ... all existing fields ...
  materialId: input.childProductId,  // NEW: what material this carries
});
```

This links back to Change 3a: arriving shipments route to the correct material bin.

#### Summary of Engine Changes

| What | Where (App.tsx) | Nature of change |
|---|---|---|
| Material bin routing on arrival | Step 1 (~line 205) | Add `if/else` branch |
| BOM-constrained production | Step 2 (~line 348) | Add `materialCap` before existing `targetProduction` calc |
| Input material consumption | Step 2 (~line 396) | Add consumption loop after `actualProduced` |
| Per-material reorder | Step 5 (~line 458) | Add new block before existing reorder; `return` to skip generic |
| Material identity on shipments | Step 5 (~line 585) | Add `materialId` field to shipment creation |

All changes are guarded by `if (bom && node.bomProductId)` — existing networks are untouched.

---

### Phase 4: Demand Explosion (Top-Down Push)

New function called at the start of each simulation tick, before production/reorder.

```typescript
function explodeDemand(
  retailDemand: Map<string, number>,  // nodeId → today's demand
  bom: BillOfMaterials,
  nodes: SupplyNode[]
): Map<string, number> {                // bomProductId → required quantity
  const required = new Map<string, number>();

  // Seed from retail nodes
  for (const [nodeId, demand] of retailDemand) {
    const productId = nodes.find(n => n.id === nodeId)?.bomProductId;
    if (productId) required.set(productId, (required.get(productId) || 0) + demand);
  }

  // BFS: explode each parent's demand into child requirements
  const queue = [...required.keys()];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    if (visited.has(parentId)) continue;
    visited.add(parentId);

    const parentQty = required.get(parentId)!;
    for (const entry of bom.entries.filter(e => e.parentProductId === parentId)) {
      const childQty = parentQty * entry.quantityPer;
      required.set(entry.childProductId, (required.get(entry.childProductId) || 0) + childQty);
      queue.push(entry.childProductId);
    }
  }

  return required;
}
```

**Integration points:**
- **Production** (Step 2): Factory production targets use `explodedDemand[bomProductId]` instead of just `downstreamDemand × 1.2`
- **Reorder** (Step 5): Supplier order quantities scaled by `explodedDemand[bomProductId]` adjusted for lead time buffer
- **Snapshot**: `demandExplosion` array written per day — required vs. available at each BOM product

---

### Phase 5: Risk Propagation (Bottom-Up Pull)

With the engine changes from Phase 3, risk propagation is now **two-layered**:

#### Layer 1: Emergent Risk (from the engine)

This happens automatically because of BOM-constrained production:
- Tier 4 supplier goes OFFLINE → stops shipping raw material
- Tier 2 factory's `materialInventory["silicon-wafer"]` depletes over lead-time days
- `materialCap` drops to 0 → production halts even with other materials available
- Downstream warehouses/retail stockout follows

This is **real behavior**, not a formula. It takes lead-time days to manifest.

#### Layer 2: Predictive Risk Score (forward-looking overlay)

Computed each tick to give **instant** visibility before the stockout actually happens:

```typescript
function computeBOMRiskScores(
  nodes: SupplyNode[],
  bom: BillOfMaterials,
  explodedDemand: Map<string, number>
): Map<string, number> {
  const risk = new Map<string, number>(); // productId → 0–100

  // Step 1: Score leaf nodes (Tier 3–4 raw materials)
  for (const product of bom.products.filter(p => p.tier >= 3)) {
    const suppliers = nodes.filter(n => n.bomProductId === product.id);

    if (suppliers.length === 0) {
      // VIRTUAL NODE — no physical supplier mapped = blind spot
      risk.set(product.id, 35); // baseline "unknown" risk
      continue;
    }

    const offlineFrac = suppliers.filter(n => n.status === 'OFFLINE').length / suppliers.length;
    const criticalFrac = suppliers.filter(n => n.status === 'CRITICAL').length / suppliers.length;
    const totalInventory = suppliers.reduce((s, n) => s + n.inventoryLevel, 0);
    const dailyRequired = explodedDemand.get(product.id) || 0;
    const daysOfSupply = dailyRequired > 0 ? totalInventory / dailyRequired : 999;

    // Risk = f(supplier status, inventory coverage)
    const statusRisk = (offlineFrac * 100) + (criticalFrac * 50);
    const coverageRisk = daysOfSupply < 3 ? 80 : daysOfSupply < 7 ? 50 : daysOfSupply < 14 ? 25 : 5;
    risk.set(product.id, Math.min(100, statusRisk * 0.6 + coverageRisk * 0.4));
  }

  // Step 2: Propagate upward through BOM (children → parents)
  for (let tier = 3; tier >= 0; tier--) {
    for (const product of bom.products.filter(p => p.tier === tier)) {
      const children = bom.entries.filter(e => e.parentProductId === product.id);
      if (children.length === 0) continue;

      let maxChildRisk = 0;
      let weightedSum = 0;
      let weightTotal = 0;

      for (const child of children) {
        const childRisk = risk.get(child.childProductId) || 0;
        const subBuffer = { easy: 0.3, moderate: 0.6, hard: 0.85, none: 1.0 }[child.substitutionDifficulty];
        const effective = childRisk * subBuffer;
        const w = child.critical ? 2.0 : 1.0;

        weightedSum += effective * w;
        weightTotal += w;
        maxChildRisk = Math.max(maxChildRisk, effective);
      }

      // 60% weakest-link (single critical shortage halts the line)
      // 40% weighted average (breadth of exposure)
      const composite = (maxChildRisk * 0.6) + ((weightedSum / weightTotal) * 0.4);
      risk.set(product.id, Math.min(100, composite));
    }
  }

  return risk;
}
```

**Why both layers?**
- Layer 1 (emergent) gives **accurate** behavior over time — you see the actual stockout cascade
- Layer 2 (predictive) gives **early warning** — "silicon wafer has 4 days of supply, finished vehicle risk is 72%" before anything runs out

---

### Phase 6: Transparency & Auditability Layer

This is what makes the system trustworthy rather than a black box.

#### 6a. Confidence Scoring

Every BOM entry carries `source`, `confidence`, and `rationale` (defined in Phase 1).

Aggregate metrics computed for UI display:

```typescript
interface BOMConfidenceReport {
  overallConfidence: number;        // weighted avg across all entries
  tierBreakdown: {
    tier: number;
    totalProducts: number;
    mappedProducts: number;         // linked to a physical node
    virtualProducts: number;        // template defaults, no node
    avgConfidence: number;
  }[];
  blindSpots: {                     // products with no mapped supplier
    productId: string;
    productName: string;
    tier: number;
    impactIfDisrupted: number;      // % of finished good output at risk
  }[];
}
```

**Example output:**
```
Overall BOM Confidence: 62%

Tier 1: 100% mapped (4/4)   — avg confidence 90%
Tier 2:  60% mapped (6/10)  — avg confidence 72%
Tier 3:  20% mapped (3/15)  — avg confidence 45%  ← warning
Tier 4:   0% mapped (0/8)   — avg confidence 30%  ← blind spot
```

#### 6b. Blind Spot Visibility

Virtual nodes (BOM products with no physical supplier) are first-class entities:
- Displayed with dashed borders and a warning icon in the BOM tree and on the map
- Each has an `impactIfDisrupted` score: "If this unknown Tier 4 supplier fails, X% of finished good production is at risk"
- A coverage dashboard shows the user exactly where their visibility drops off

#### 6c. Assumption Audit Trail

When hovering/clicking a template-sourced BOM entry, the user sees:

> **Source:** Industry template (Automotive — mid-size sedan)
> **Confidence:** 60%
> **Rationale:** "Standard steel-body vehicle requires ~120kg iron ore per engine block. Your actual quantity may differ by +/- 30%."
> **Action:** [Override with actual data] [Accept estimate]

User overrides change `source` to `'user-defined'` and `confidence` to 95%.

#### 6d. Risk Attribution Chains

When a finished product shows high risk, the UI displays the causal chain:

```
Finished Vehicle: 72% risk
  └─ Powertrain Assembly: 68% risk
     └─ Electronics Module: 91% risk
        └─ Semiconductor Chips: 95% risk  [critical, substitution: hard]
           └─ Silicon Wafer: 98% risk     [critical, substitution: none]
              └─ Supplier "Taiwan Fab": OFFLINE (12 days recovery)
                 materialInventory: 0 units
                 daysOfSupply: 0
```

This is not just a score — it's an auditable path from finished good to root cause, answering "why is my risk high and which specific deep-tier node is responsible?"

---

### Phase 7: UI Components

#### 7a. BOM Tree Viewer — `BOMView.tsx` (new file)

- Collapsible indented tree with tier badges (T0, T1, T2, T3, T4)
- Each node shows: name, quantity-per, risk % (color bar), confidence % (opacity)
- Virtual nodes: dashed border, gray, warning icon
- Click node → highlight corresponding supply chain node on NetworkMap
- Click node → show risk attribution chain in side panel
- Top bar: overall confidence %, tier coverage breakdown

#### 7b. BOM Editor — in `NetworkBuilder.tsx`

- "Auto-Generate BOM" button → picks template from `industryConfig.id`
- Mapping report after auto-generate: "Mapped 6/18 products. 12 are estimates."
- "Map Node to BOM Product" dropdown when editing a supply node
- Manual add/remove/edit BOM entries (quantity, criticality, substitution)
- Import BOM from CSV (extend existing importer)

#### 7c. Material Bottleneck Dashboard — in `AnalyticsView.tsx`

- New tab: "BOM & Materials"
- Per-factory material inventory bars (stacked by material, color-coded by days-of-supply)
- Bottleneck alerts: "Factory X: silicon wafer runs out in 3 days"
- Demand explosion waterfall: required vs. available at each tier

#### 7d. Risk Propagation View — in `RiskAnalysisView.tsx`

- Sankey or tree heatmap: risk flowing from Tier 4 → Tier 0
- Color gradient: green (0%) → yellow (40%) → red (80%+)
- "What-if" toggle: manually force any node OFFLINE, see risk cascade instantly
- Blind spot callout: "You have 8 unmapped Tier 4 materials. Mapping them would improve confidence by 25%."

---

### Phase 8: Backend Persistence

#### Database (models.py)

Add `bom_data` column to `UserNetwork`:

```python
class UserNetwork(Base):
    # ... existing columns ...
    bom_data = Column(JSON, nullable=True)  # BillOfMaterials dict
```

Add `bom_snapshot` to `SimulationRun`:

```python
class SimulationRun(Base):
    # ... existing columns ...
    bom_snapshot = Column(JSON, nullable=True)  # BOM at time of run
```

#### API (server.py)

No new endpoints needed. BOM data piggybacks on existing network save/load:
- `POST /api/networks` — include `bom_data` in the JSON body alongside `nodes`, `routes`, `params`
- `GET /api/networks/{id}` — return `bom_data` in response
- `POST /api/simulation-runs` — snapshot BOM into `bom_snapshot`

Auto-migration adds nullable columns on startup (existing pattern in server.py:36-54).

---

## Implementation Order

```
Phase 1: Data Model (types.ts)                          ← foundation, no behavior change
  │
  ├── Phase 2: Industry BOM Templates (industryBOMs.ts)  ← data, no behavior change
  │
  ├── Phase 3: Engine Changes (App.tsx)                   ← THE critical path
  │   ├── 3a: Material bin routing on arrival
  │   ├── 3b: BOM-constrained production
  │   ├── 3c: Per-material reordering
  │   └── 3d: Material identity on shipments
  │
  ├── Phase 4: Demand Explosion (App.tsx)                 ← uses BOM + engine
  │
  └── Phase 5: Risk Propagation (App.tsx)                 ← uses BOM + engine + demand
      │
      Phase 6: Transparency Layer (UI logic)              ← uses all above
      │
      Phase 7: UI Components                              ← visualization
      │   ├── 7a: BOM Tree Viewer
      │   ├── 7b: BOM Editor in NetworkBuilder
      │   ├── 7c: Material Bottleneck Dashboard
      │   └── 7d: Risk Propagation View
      │
      Phase 8: Backend Persistence                        ← save/load
```

**Critical path:** Phases 1 → 3 → 4 → 5 (engine). Everything else layers on top.

Phases 2 and 8 can be done in parallel with other work at any point.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| BOM lives on frontend alongside nodes/routes/params | Simulation engine runs client-side; backend just persists JSON |
| Material inventory only on FACTORY nodes | Suppliers produce one material (their `inventoryLevel` IS that material). Warehouses/DCs pass through generic finished goods. Only factories combine multiple inputs. |
| Virtual nodes assume infinite supply with risk penalty | Lets users simulate without mapping every Tier 4 supplier. The transparency layer makes clear what's estimated vs. known. |
| Risk = 60% weakest-link + 40% weighted average | A single critical component shortage halts an assembly line (weakest-link dominant), but broad exposure matters too |
| Two-layer risk (emergent + predictive) | Emergent gives accurate behavior over time; predictive gives early warning before stockouts happen |
| All new fields are optional | Zero breaking changes for existing networks. BOM features activate only when BOM data is present. |
| Confidence scores on every BOM entry | Users must be able to distinguish "I know this" from "the system guessed this" at every level |
| `source` field tracks provenance | Audit trail for where each BOM entry came from — user, template, or AI inference |

---

## Files Changed

| File | Type | Changes |
|---|---|---|
| `frontend/types.ts` | Modified | Add BOMProduct, BOMEntry, BillOfMaterials; extend SupplyNode, InTransitShipment, IndustryConfig, HistorySnapshot |
| `frontend/utils/industryBOMs.ts` | **New** | 5 industry BOM templates (~400 lines) |
| `frontend/App.tsx` | Modified | Material-aware production/reorder, demand explosion, risk propagation (~200 lines added) |
| `frontend/components/BOMView.tsx` | **New** | BOM tree viewer + risk attribution + confidence dashboard (~500 lines) |
| `frontend/components/NetworkBuilder.tsx` | Modified | BOM template selector, node-to-BOM mapping |
| `frontend/components/AnalyticsView.tsx` | Modified | New "BOM & Materials" tab |
| `frontend/components/RiskAnalysisView.tsx` | Modified | Risk propagation heatmap, what-if toggle |
| `frontend/components/IndustryWizard.tsx` | Modified | BOM template selection step |
| `backend/models.py` | Modified | Add `bom_data` and `bom_snapshot` columns |
| `backend/server.py` | Modified | Include BOM in network/run save/load |
