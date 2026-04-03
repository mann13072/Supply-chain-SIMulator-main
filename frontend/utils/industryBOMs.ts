import { BOMProduct, BOMEntry, BillOfMaterials, SupplyNode, NodeType } from '../types';

// ---------------------------------------------------------------------------
// Automotive BOM
// ---------------------------------------------------------------------------

const automotiveProducts: BOMProduct[] = [
  // Tier 0
  { id: 'auto-finished-vehicle', name: 'Finished Vehicle', tier: 0, category: 'finished-good', defaultLeadTimeDays: 1 },
  // Tier 1
  { id: 'auto-powertrain', name: 'Powertrain Assembly', tier: 1, category: 'assembly', defaultLeadTimeDays: 5 },
  { id: 'auto-chassis-body', name: 'Chassis & Body', tier: 1, category: 'assembly', defaultLeadTimeDays: 5 },
  { id: 'auto-interior-trim', name: 'Interior & Trim', tier: 1, category: 'assembly', defaultLeadTimeDays: 4 },
  // Tier 2
  { id: 'auto-engine-block', name: 'Engine Block', tier: 2, category: 'component', defaultLeadTimeDays: 10 },
  { id: 'auto-transmission', name: 'Transmission', tier: 2, category: 'component', defaultLeadTimeDays: 10 },
  { id: 'auto-electronics-module', name: 'Electronics Module', tier: 2, category: 'component', defaultLeadTimeDays: 12 },
  { id: 'auto-steel-frame', name: 'Steel Frame', tier: 2, category: 'component', defaultLeadTimeDays: 10 },
  { id: 'auto-rubber-components', name: 'Rubber Components', tier: 2, category: 'component', defaultLeadTimeDays: 8 },
  { id: 'auto-plastics', name: 'Plastics', tier: 2, category: 'component', defaultLeadTimeDays: 7 },
  // Tier 3
  { id: 'auto-cast-iron', name: 'Cast Iron', tier: 3, category: 'sub-component', defaultLeadTimeDays: 18 },
  { id: 'auto-aluminum-alloy', name: 'Aluminum Alloy', tier: 3, category: 'sub-component', defaultLeadTimeDays: 16 },
  { id: 'auto-steel-gears', name: 'Steel Gears', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'auto-semiconductor-chips', name: 'Semiconductor Chips', tier: 3, category: 'sub-component', defaultLeadTimeDays: 21 },
  { id: 'auto-copper-wiring', name: 'Copper Wiring', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'auto-hot-rolled-steel', name: 'Hot-Rolled Steel', tier: 3, category: 'sub-component', defaultLeadTimeDays: 18 },
  { id: 'auto-natural-rubber', name: 'Natural Rubber', tier: 3, category: 'sub-component', commodityId: 'rubber', defaultLeadTimeDays: 16 },
  { id: 'auto-polymer-pellets', name: 'Polymer Pellets', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  // Tier 4
  { id: 'auto-iron-ore', name: 'Iron Ore', tier: 4, category: 'raw-material', commodityId: 'steel', defaultLeadTimeDays: 35 },
  { id: 'auto-bauxite', name: 'Bauxite', tier: 4, category: 'raw-material', commodityId: 'aluminum', defaultLeadTimeDays: 35 },
  { id: 'auto-steel-coil', name: 'Steel Coil', tier: 4, category: 'raw-material', commodityId: 'steel', defaultLeadTimeDays: 30 },
  { id: 'auto-silicon-wafer', name: 'Silicon Wafer', tier: 4, category: 'raw-material', commodityId: 'semiconductors', defaultLeadTimeDays: 45 },
  { id: 'auto-copper-ore', name: 'Copper Ore', tier: 4, category: 'raw-material', defaultLeadTimeDays: 35 },
  { id: 'auto-latex', name: 'Latex', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'auto-petroleum-distillate', name: 'Petroleum Distillate', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
];

const automotiveEntries: BOMEntry[] = [
  // Tier 0 -> Tier 1
  { parentProductId: 'auto-finished-vehicle', childProductId: 'auto-powertrain', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: 'Standard mid-size sedan: 1 powertrain per vehicle' },
  { parentProductId: 'auto-finished-vehicle', childProductId: 'auto-chassis-body', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: 'Standard mid-size sedan: 1 chassis-body per vehicle' },
  { parentProductId: 'auto-finished-vehicle', childProductId: 'auto-interior-trim', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: 'Standard mid-size sedan: 1 interior set per vehicle' },
  // Powertrain -> Tier 2
  { parentProductId: 'auto-powertrain', childProductId: 'auto-engine-block', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '1 engine block per powertrain assembly' },
  { parentProductId: 'auto-powertrain', childProductId: 'auto-transmission', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '1 transmission unit per powertrain assembly' },
  { parentProductId: 'auto-powertrain', childProductId: 'auto-electronics-module', quantityPer: 3, unit: 'pcs', critical: true, substitutionDifficulty: 'hard', source: 'template-default', confidence: 70, rationale: 'Typical vehicle ECU count: 3 major electronic control modules' },
  // Engine Block -> Tier 3
  { parentProductId: 'auto-engine-block', childProductId: 'auto-cast-iron', quantityPer: 85, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: 'Cast iron makes up ~85 kg of a typical engine block' },
  { parentProductId: 'auto-engine-block', childProductId: 'auto-aluminum-alloy', quantityPer: 15, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: 'Aluminum alloy head and components ~15 kg per engine' },
  // Transmission -> Tier 3
  { parentProductId: 'auto-transmission', childProductId: 'auto-steel-gears', quantityPer: 12, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: 'Gear set weight ~12 kg for a 6-speed automatic transmission' },
  // Electronics Module -> Tier 3
  { parentProductId: 'auto-electronics-module', childProductId: 'auto-semiconductor-chips', quantityPer: 8, unit: 'pcs', critical: true, substitutionDifficulty: 'hard', source: 'template-default', confidence: 55, rationale: 'Approximately 8 semiconductor chips per ECU module' },
  { parentProductId: 'auto-electronics-module', childProductId: 'auto-copper-wiring', quantityPer: 2, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: 'Wiring harness ~2 kg copper per module' },
  // Chassis & Body -> Tier 2
  { parentProductId: 'auto-chassis-body', childProductId: 'auto-steel-frame', quantityPer: 350, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: 'Body-in-white steel frame ~350 kg for mid-size sedan' },
  { parentProductId: 'auto-chassis-body', childProductId: 'auto-rubber-components', quantityPer: 4, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '4 tires and associated rubber components per vehicle' },
  // Interior & Trim -> Tier 2
  { parentProductId: 'auto-interior-trim', childProductId: 'auto-plastics', quantityPer: 25, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: 'Dashboard, panels, and trim plastics ~25 kg' },
  // Cast Iron -> Tier 4
  { parentProductId: 'auto-cast-iron', childProductId: 'auto-iron-ore', quantityPer: 1.4, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~1.4 kg iron ore needed per 1 kg cast iron (smelting losses)' },
  // Aluminum Alloy -> Tier 4
  { parentProductId: 'auto-aluminum-alloy', childProductId: 'auto-bauxite', quantityPer: 3, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~3 kg bauxite per 1 kg aluminum alloy (Bayer-Hall-Heroult)' },
  // Steel Gears -> Tier 4
  { parentProductId: 'auto-steel-gears', childProductId: 'auto-steel-coil', quantityPer: 1.5, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 60, rationale: '~1.5 kg steel coil per 1 kg finished gears (machining waste)' },
  // Semiconductor Chips -> Tier 4
  { parentProductId: 'auto-semiconductor-chips', childProductId: 'auto-silicon-wafer', quantityPer: 0.5, unit: 'pcs', critical: true, substitutionDifficulty: 'none', source: 'template-default', confidence: 50, rationale: '~0.5 wafer equivalent per chip (multiple die per wafer)' },
  // Copper Wiring -> Tier 4
  { parentProductId: 'auto-copper-wiring', childProductId: 'auto-copper-ore', quantityPer: 3, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 50, rationale: '~3 kg ore per 1 kg refined copper (concentration losses)' },
  // Steel Frame -> Tier 3
  { parentProductId: 'auto-steel-frame', childProductId: 'auto-hot-rolled-steel', quantityPer: 1.15, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '1.15 kg HRS per 1 kg frame (stamping/trimming waste)' },
  // Hot-Rolled Steel -> Tier 4 (reuses auto-iron-ore)
  { parentProductId: 'auto-hot-rolled-steel', childProductId: 'auto-iron-ore', quantityPer: 1.4, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~1.4 kg iron ore per 1 kg hot-rolled steel' },
  // Rubber Components -> Tier 3
  { parentProductId: 'auto-rubber-components', childProductId: 'auto-natural-rubber', quantityPer: 2, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~2 kg natural rubber per tire/component unit' },
  // Natural Rubber -> Tier 4
  { parentProductId: 'auto-natural-rubber', childProductId: 'auto-latex', quantityPer: 1.5, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 50, rationale: '~1.5 kg latex per 1 kg processed natural rubber' },
  // Plastics -> Tier 3
  { parentProductId: 'auto-plastics', childProductId: 'auto-polymer-pellets', quantityPer: 1.12, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '1.12 kg pellets per 1 kg molded plastic (scrap/runner waste)' },
  // Polymer Pellets -> Tier 4
  { parentProductId: 'auto-polymer-pellets', childProductId: 'auto-petroleum-distillate', quantityPer: 1.25, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 45, rationale: '~1.25 kg petroleum distillate per 1 kg polymer pellets' },
];

const automotiveBOM: BillOfMaterials = {
  id: 'automotive-bom',
  finishedProductId: 'auto-finished-vehicle',
  name: 'Automotive Standard BOM',
  industry: 'automotive',
  products: automotiveProducts,
  entries: automotiveEntries,
};

// ---------------------------------------------------------------------------
// Tech / Electronics BOM
// ---------------------------------------------------------------------------

const techProducts: BOMProduct[] = [
  // Tier 0
  { id: 'tech-smartphone', name: 'Smartphone', tier: 0, category: 'finished-good', defaultLeadTimeDays: 1 },
  // Tier 1
  { id: 'tech-pcb-assembly', name: 'PCB Assembly', tier: 1, category: 'assembly', defaultLeadTimeDays: 5 },
  { id: 'tech-display-assembly', name: 'Display Assembly', tier: 1, category: 'assembly', defaultLeadTimeDays: 5 },
  { id: 'tech-battery', name: 'Battery', tier: 1, category: 'assembly', defaultLeadTimeDays: 5 },
  { id: 'tech-casing', name: 'Casing', tier: 1, category: 'assembly', defaultLeadTimeDays: 3 },
  // Tier 2
  { id: 'tech-processor', name: 'Processor', tier: 2, category: 'component', defaultLeadTimeDays: 14 },
  { id: 'tech-memory-chip', name: 'Memory Chip', tier: 2, category: 'component', defaultLeadTimeDays: 12 },
  { id: 'tech-oled-panel', name: 'OLED Panel', tier: 2, category: 'component', defaultLeadTimeDays: 14 },
  { id: 'tech-touch-digitizer', name: 'Touch Digitizer', tier: 2, category: 'component', defaultLeadTimeDays: 10 },
  { id: 'tech-li-ion-cell', name: 'Li-Ion Cell', tier: 2, category: 'component', defaultLeadTimeDays: 10 },
  { id: 'tech-aluminum-shell', name: 'Aluminum Shell', tier: 2, category: 'component', defaultLeadTimeDays: 7 },
  // Tier 3
  { id: 'tech-silicon-die', name: 'Silicon Die', tier: 3, category: 'sub-component', defaultLeadTimeDays: 21 },
  { id: 'tech-nand-flash', name: 'NAND Flash', tier: 3, category: 'sub-component', defaultLeadTimeDays: 18 },
  { id: 'tech-organic-compounds', name: 'Organic Compounds', tier: 3, category: 'sub-component', defaultLeadTimeDays: 16 },
  { id: 'tech-ito-film', name: 'ITO Film', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'tech-cathode-material', name: 'Cathode Material', tier: 3, category: 'sub-component', defaultLeadTimeDays: 18 },
  { id: 'tech-anode-material', name: 'Anode Material', tier: 3, category: 'sub-component', defaultLeadTimeDays: 16 },
  { id: 'tech-aluminum-sheet', name: 'Aluminum Sheet', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  // Tier 4
  { id: 'tech-silicon-wafer', name: 'Silicon Wafer', tier: 4, category: 'raw-material', commodityId: 'semiconductors', defaultLeadTimeDays: 45 },
  { id: 'tech-rare-earth', name: 'Rare Earth Elements', tier: 4, category: 'raw-material', commodityId: 'rare_earth', defaultLeadTimeDays: 40 },
  { id: 'tech-indium', name: 'Indium', tier: 4, category: 'raw-material', defaultLeadTimeDays: 35 },
  { id: 'tech-lithium-carbonate', name: 'Lithium Carbonate', tier: 4, category: 'raw-material', commodityId: 'lithium', defaultLeadTimeDays: 40 },
  { id: 'tech-graphite', name: 'Graphite', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'tech-bauxite', name: 'Bauxite', tier: 4, category: 'raw-material', commodityId: 'aluminum', defaultLeadTimeDays: 35 },
];

const techEntries: BOMEntry[] = [
  // Tier 0 -> Tier 1
  { parentProductId: 'tech-smartphone', childProductId: 'tech-pcb-assembly', quantityPer: 1, unit: 'pcs', critical: true, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 main PCB assembly per smartphone' },
  { parentProductId: 'tech-smartphone', childProductId: 'tech-display-assembly', quantityPer: 1, unit: 'pcs', critical: true, substitutionDifficulty: 'hard', source: 'template-default', confidence: 85, rationale: '1 display assembly per smartphone' },
  { parentProductId: 'tech-smartphone', childProductId: 'tech-battery', quantityPer: 1, unit: 'pcs', critical: true, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 battery per smartphone' },
  { parentProductId: 'tech-smartphone', childProductId: 'tech-casing', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'easy', source: 'template-default', confidence: 85, rationale: '1 casing per smartphone' },
  // PCB Assembly -> Tier 2
  { parentProductId: 'tech-pcb-assembly', childProductId: 'tech-processor', quantityPer: 1, unit: 'pcs', critical: true, substitutionDifficulty: 'hard', source: 'template-default', confidence: 70, rationale: '1 SoC processor per PCB' },
  { parentProductId: 'tech-pcb-assembly', childProductId: 'tech-memory-chip', quantityPer: 2, unit: 'pcs', critical: true, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '2 memory chips (RAM + storage) per PCB' },
  // Display Assembly -> Tier 2
  { parentProductId: 'tech-display-assembly', childProductId: 'tech-oled-panel', quantityPer: 1, unit: 'pcs', critical: true, substitutionDifficulty: 'hard', source: 'template-default', confidence: 70, rationale: '1 OLED panel per display assembly' },
  { parentProductId: 'tech-display-assembly', childProductId: 'tech-touch-digitizer', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '1 touch digitizer layer per display assembly' },
  // Battery -> Tier 2
  { parentProductId: 'tech-battery', childProductId: 'tech-li-ion-cell', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '1 Li-Ion cell per smartphone battery' },
  // Casing -> Tier 2
  { parentProductId: 'tech-casing', childProductId: 'tech-aluminum-shell', quantityPer: 0.15, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~150 g aluminum shell per smartphone casing' },
  // Processor -> Tier 3
  { parentProductId: 'tech-processor', childProductId: 'tech-silicon-die', quantityPer: 1, unit: 'pcs', critical: true, substitutionDifficulty: 'none', source: 'template-default', confidence: 55, rationale: '1 silicon die per processor chip' },
  // Memory Chip -> Tier 3
  { parentProductId: 'tech-memory-chip', childProductId: 'tech-nand-flash', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '1 NAND flash die per memory chip' },
  // OLED Panel -> Tier 3
  { parentProductId: 'tech-oled-panel', childProductId: 'tech-organic-compounds', quantityPer: 0.005, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~5 g of organic light-emitting compounds per panel' },
  // Touch Digitizer -> Tier 3
  { parentProductId: 'tech-touch-digitizer', childProductId: 'tech-ito-film', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '1 ITO (Indium Tin Oxide) film per touch layer' },
  // Li-Ion Cell -> Tier 3
  { parentProductId: 'tech-li-ion-cell', childProductId: 'tech-cathode-material', quantityPer: 0.03, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~30 g cathode active material per cell' },
  { parentProductId: 'tech-li-ion-cell', childProductId: 'tech-anode-material', quantityPer: 0.02, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~20 g anode material (graphite) per cell' },
  // Aluminum Shell -> Tier 3
  { parentProductId: 'tech-aluminum-shell', childProductId: 'tech-aluminum-sheet', quantityPer: 0.2, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~200 g aluminum sheet per shell (CNC machining waste)' },
  // Silicon Die -> Tier 4
  { parentProductId: 'tech-silicon-die', childProductId: 'tech-silicon-wafer', quantityPer: 0.02, unit: 'pcs', critical: true, substitutionDifficulty: 'none', source: 'template-default', confidence: 55, rationale: '~0.02 wafer equivalent per die (many die per wafer)' },
  // NAND Flash -> Tier 4 (reuses tech-silicon-wafer)
  { parentProductId: 'tech-nand-flash', childProductId: 'tech-silicon-wafer', quantityPer: 0.01, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~0.01 wafer equivalent per NAND flash die' },
  // Organic Compounds -> Tier 4
  { parentProductId: 'tech-organic-compounds', childProductId: 'tech-rare-earth', quantityPer: 0.001, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 45, rationale: '~1 g rare earth elements per 5 g organic compound batch' },
  // ITO Film -> Tier 4
  { parentProductId: 'tech-ito-film', childProductId: 'tech-indium', quantityPer: 0.0005, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 40, rationale: '~0.5 g indium per ITO film (sputtering target yield)' },
  // Cathode Material -> Tier 4
  { parentProductId: 'tech-cathode-material', childProductId: 'tech-lithium-carbonate', quantityPer: 0.05, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 50, rationale: '~50 g lithium carbonate per 30 g cathode material (NMC chemistry)' },
  // Anode Material -> Tier 4
  { parentProductId: 'tech-anode-material', childProductId: 'tech-graphite', quantityPer: 0.03, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 50, rationale: '~30 g graphite per 20 g anode material (processing losses)' },
  // Aluminum Sheet -> Tier 4
  { parentProductId: 'tech-aluminum-sheet', childProductId: 'tech-bauxite', quantityPer: 0.6, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 60, rationale: '~0.6 kg bauxite per 0.2 kg aluminum sheet (Bayer-Hall-Heroult)' },
];

const techBOM: BillOfMaterials = {
  id: 'tech-bom',
  finishedProductId: 'tech-smartphone',
  name: 'Tech/Electronics Standard BOM',
  industry: 'tech',
  products: techProducts,
  entries: techEntries,
};

// ---------------------------------------------------------------------------
// Pharma BOM
// ---------------------------------------------------------------------------

const pharmaProducts: BOMProduct[] = [
  // Tier 0
  { id: 'pharma-drug-product', name: 'Drug Product (Tablet)', tier: 0, category: 'finished-good', defaultLeadTimeDays: 1 },
  // Tier 1
  { id: 'pharma-formulated-drug', name: 'Formulated Drug', tier: 1, category: 'assembly', defaultLeadTimeDays: 7 },
  { id: 'pharma-primary-packaging', name: 'Primary Packaging', tier: 1, category: 'assembly', commodityId: 'packaging', defaultLeadTimeDays: 4 },
  { id: 'pharma-secondary-packaging', name: 'Secondary Packaging', tier: 1, category: 'assembly', defaultLeadTimeDays: 3 },
  // Tier 2
  { id: 'pharma-api', name: 'Active Pharmaceutical Ingredient', tier: 2, category: 'component', commodityId: 'apis', defaultLeadTimeDays: 14 },
  { id: 'pharma-excipient-blend', name: 'Excipient Blend', tier: 2, category: 'component', commodityId: 'excipients', defaultLeadTimeDays: 10 },
  { id: 'pharma-blister-pack', name: 'Blister Pack', tier: 2, category: 'component', defaultLeadTimeDays: 8 },
  { id: 'pharma-carton-box', name: 'Carton Box', tier: 2, category: 'component', defaultLeadTimeDays: 7 },
  // Tier 3
  { id: 'pharma-chemical-intermediate', name: 'Chemical Intermediate', tier: 3, category: 'sub-component', defaultLeadTimeDays: 21 },
  { id: 'pharma-mcc', name: 'Microcrystalline Cellulose', tier: 3, category: 'sub-component', defaultLeadTimeDays: 16 },
  { id: 'pharma-starch', name: 'Starch', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'pharma-pvc-film', name: 'PVC Film', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'pharma-aluminum-foil', name: 'Aluminum Foil', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'pharma-cardboard', name: 'Cardboard', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  // Tier 4
  { id: 'pharma-raw-chemical', name: 'Raw Chemical', tier: 4, category: 'raw-material', defaultLeadTimeDays: 35 },
  { id: 'pharma-wood-pulp', name: 'Wood Pulp', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'pharma-corn', name: 'Corn', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'pharma-pvc-resin', name: 'PVC Resin', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'pharma-aluminum-ingot', name: 'Aluminum Ingot', tier: 4, category: 'raw-material', defaultLeadTimeDays: 35 },
  { id: 'pharma-recycled-paper', name: 'Recycled Paper', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
];

const pharmaEntries: BOMEntry[] = [
  // Tier 0 -> Tier 1
  { parentProductId: 'pharma-drug-product', childProductId: 'pharma-formulated-drug', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 formulated drug batch per finished tablet batch' },
  { parentProductId: 'pharma-drug-product', childProductId: 'pharma-primary-packaging', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 primary packaging set per drug product unit' },
  { parentProductId: 'pharma-drug-product', childProductId: 'pharma-secondary-packaging', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 secondary packaging set per drug product unit' },
  // Formulated Drug -> Tier 2
  { parentProductId: 'pharma-formulated-drug', childProductId: 'pharma-api', quantityPer: 0.5, unit: 'kg', critical: true, substitutionDifficulty: 'none', source: 'template-default', confidence: 70, rationale: '~0.5 kg API per batch; GMP-regulated, single-source typical' },
  { parentProductId: 'pharma-formulated-drug', childProductId: 'pharma-excipient-blend', quantityPer: 5, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~5 kg excipient blend per batch (fillers, binders, lubricants)' },
  // Primary Packaging -> Tier 2
  { parentProductId: 'pharma-primary-packaging', childProductId: 'pharma-blister-pack', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '1 blister pack per primary packaging unit' },
  // Secondary Packaging -> Tier 2
  { parentProductId: 'pharma-secondary-packaging', childProductId: 'pharma-carton-box', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '1 carton box per secondary packaging unit' },
  // API -> Tier 3
  { parentProductId: 'pharma-api', childProductId: 'pharma-chemical-intermediate', quantityPer: 2, unit: 'kg', critical: true, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~2 kg intermediate per 1 kg API (multi-step synthesis yield)' },
  // Excipient Blend -> Tier 3
  { parentProductId: 'pharma-excipient-blend', childProductId: 'pharma-mcc', quantityPer: 3, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~3 kg MCC filler per 5 kg excipient blend' },
  { parentProductId: 'pharma-excipient-blend', childProductId: 'pharma-starch', quantityPer: 2, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~2 kg starch binder per 5 kg excipient blend' },
  // Blister Pack -> Tier 3
  { parentProductId: 'pharma-blister-pack', childProductId: 'pharma-pvc-film', quantityPer: 0.01, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~10 g PVC film per blister cavity sheet' },
  { parentProductId: 'pharma-blister-pack', childProductId: 'pharma-aluminum-foil', quantityPer: 0.005, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~5 g aluminum foil lidding per blister pack' },
  // Carton Box -> Tier 3
  { parentProductId: 'pharma-carton-box', childProductId: 'pharma-cardboard', quantityPer: 0.05, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~50 g cardboard per folding carton box' },
  // Chemical Intermediate -> Tier 4
  { parentProductId: 'pharma-chemical-intermediate', childProductId: 'pharma-raw-chemical', quantityPer: 3, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 45, rationale: '~3 kg raw chemicals per 1 kg intermediate (reaction yield ~33%)' },
  // MCC -> Tier 4
  { parentProductId: 'pharma-mcc', childProductId: 'pharma-wood-pulp', quantityPer: 5, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~5 kg wood pulp per 3 kg MCC (acid hydrolysis yield)' },
  // Starch -> Tier 4
  { parentProductId: 'pharma-starch', childProductId: 'pharma-corn', quantityPer: 4, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 60, rationale: '~4 kg corn per 2 kg starch (wet milling extraction)' },
  // PVC Film -> Tier 4
  { parentProductId: 'pharma-pvc-film', childProductId: 'pharma-pvc-resin', quantityPer: 0.015, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~15 g PVC resin per 10 g film (extrusion waste)' },
  // Aluminum Foil -> Tier 4
  { parentProductId: 'pharma-aluminum-foil', childProductId: 'pharma-aluminum-ingot', quantityPer: 0.008, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 60, rationale: '~8 g aluminum ingot per 5 g foil (rolling losses)' },
  // Cardboard -> Tier 4
  { parentProductId: 'pharma-cardboard', childProductId: 'pharma-recycled-paper', quantityPer: 0.07, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 65, rationale: '~70 g recycled paper per 50 g cardboard (repulping yield)' },
];

const pharmaBOM: BillOfMaterials = {
  id: 'pharma-bom',
  finishedProductId: 'pharma-drug-product',
  name: 'Pharma Standard BOM',
  industry: 'pharma',
  products: pharmaProducts,
  entries: pharmaEntries,
};

// ---------------------------------------------------------------------------
// FMCG (Food & Beverage) BOM
// ---------------------------------------------------------------------------

const fmcgProducts: BOMProduct[] = [
  // Tier 0
  { id: 'fmcg-packaged-food', name: 'Packaged Food Product', tier: 0, category: 'finished-good', defaultLeadTimeDays: 1 },
  // Tier 1
  { id: 'fmcg-food-product', name: 'Food Product', tier: 1, category: 'assembly', defaultLeadTimeDays: 3 },
  { id: 'fmcg-packaging', name: 'Packaging', tier: 1, category: 'assembly', commodityId: 'packaging_m', defaultLeadTimeDays: 4 },
  // Tier 2
  { id: 'fmcg-flour', name: 'Flour', tier: 2, category: 'component', commodityId: 'wheat', defaultLeadTimeDays: 8 },
  { id: 'fmcg-sugar', name: 'Sugar', tier: 2, category: 'component', defaultLeadTimeDays: 8 },
  { id: 'fmcg-vegetable-oil', name: 'Vegetable Oil', tier: 2, category: 'component', defaultLeadTimeDays: 10 },
  { id: 'fmcg-flexible-wrapper', name: 'Flexible Wrapper', tier: 2, category: 'component', defaultLeadTimeDays: 7 },
  { id: 'fmcg-outer-carton', name: 'Outer Carton', tier: 2, category: 'component', defaultLeadTimeDays: 7 },
  // Tier 3
  { id: 'fmcg-milled-wheat', name: 'Milled Wheat', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'fmcg-refined-sugar', name: 'Refined Sugar', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'fmcg-refined-oil', name: 'Refined Oil', tier: 3, category: 'sub-component', defaultLeadTimeDays: 16 },
  { id: 'fmcg-laminated-film', name: 'Laminated Film', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'fmcg-corrugated-board', name: 'Corrugated Board', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  // Tier 4
  { id: 'fmcg-raw-wheat', name: 'Raw Wheat', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'fmcg-sugarcane', name: 'Sugarcane', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'fmcg-palm-fruit', name: 'Palm Fruit', tier: 4, category: 'raw-material', commodityId: 'palm_oil', defaultLeadTimeDays: 35 },
  { id: 'fmcg-plastic-resin', name: 'Plastic Resin', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'fmcg-kraft-paper', name: 'Kraft Paper', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
];

const fmcgEntries: BOMEntry[] = [
  // Tier 0 -> Tier 1
  { parentProductId: 'fmcg-packaged-food', childProductId: 'fmcg-food-product', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 food product per packaged unit' },
  { parentProductId: 'fmcg-packaged-food', childProductId: 'fmcg-packaging', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 packaging set per packaged food unit' },
  // Food Product -> Tier 2
  { parentProductId: 'fmcg-food-product', childProductId: 'fmcg-flour', quantityPer: 0.5, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~500 g flour per unit (baked goods base ingredient)' },
  { parentProductId: 'fmcg-food-product', childProductId: 'fmcg-sugar', quantityPer: 0.2, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~200 g sugar per unit (sweetener)' },
  { parentProductId: 'fmcg-food-product', childProductId: 'fmcg-vegetable-oil', quantityPer: 0.1, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~100 g vegetable oil per unit (fat content)' },
  // Packaging -> Tier 2
  { parentProductId: 'fmcg-packaging', childProductId: 'fmcg-flexible-wrapper', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '1 flexible wrapper per individual unit' },
  { parentProductId: 'fmcg-packaging', childProductId: 'fmcg-outer-carton', quantityPer: 0.083, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '1 carton per 12 units (0.083 cartons per unit)' },
  // Flour -> Tier 3
  { parentProductId: 'fmcg-flour', childProductId: 'fmcg-milled-wheat', quantityPer: 0.6, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~0.6 kg milled wheat per 0.5 kg flour (extraction rate ~83%)' },
  // Sugar -> Tier 3
  { parentProductId: 'fmcg-sugar', childProductId: 'fmcg-refined-sugar', quantityPer: 0.25, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~0.25 kg refined sugar per 0.2 kg packaged sugar (processing overhead)' },
  // Vegetable Oil -> Tier 3
  { parentProductId: 'fmcg-vegetable-oil', childProductId: 'fmcg-refined-oil', quantityPer: 0.12, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~0.12 kg refined oil per 0.1 kg blended oil (refining loss)' },
  // Flexible Wrapper -> Tier 3
  { parentProductId: 'fmcg-flexible-wrapper', childProductId: 'fmcg-laminated-film', quantityPer: 0.008, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~8 g laminated film per wrapper' },
  // Outer Carton -> Tier 3
  { parentProductId: 'fmcg-outer-carton', childProductId: 'fmcg-corrugated-board', quantityPer: 0.1, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~100 g corrugated board per outer carton' },
  // Milled Wheat -> Tier 4
  { parentProductId: 'fmcg-milled-wheat', childProductId: 'fmcg-raw-wheat', quantityPer: 0.8, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 65, rationale: '~0.8 kg raw wheat per 0.6 kg milled wheat (cleaning/hulling loss)' },
  // Refined Sugar -> Tier 4
  { parentProductId: 'fmcg-refined-sugar', childProductId: 'fmcg-sugarcane', quantityPer: 1.0, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 60, rationale: '~1.0 kg sugarcane per 0.25 kg refined sugar (juice extraction + crystallization)' },
  // Refined Oil -> Tier 4
  { parentProductId: 'fmcg-refined-oil', childProductId: 'fmcg-palm-fruit', quantityPer: 0.3, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~0.3 kg palm fruit per 0.12 kg refined oil (pressing + refining)' },
  // Laminated Film -> Tier 4
  { parentProductId: 'fmcg-laminated-film', childProductId: 'fmcg-plastic-resin', quantityPer: 0.01, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~10 g plastic resin per 8 g laminated film (extrusion waste)' },
  // Corrugated Board -> Tier 4
  { parentProductId: 'fmcg-corrugated-board', childProductId: 'fmcg-kraft-paper', quantityPer: 0.12, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 60, rationale: '~120 g kraft paper per 100 g corrugated board (fluting + liners)' },
];

const fmcgBOM: BillOfMaterials = {
  id: 'fmcg-bom',
  finishedProductId: 'fmcg-packaged-food',
  name: 'FMCG Food & Beverage Standard BOM',
  industry: 'fmcg',
  products: fmcgProducts,
  entries: fmcgEntries,
};

// ---------------------------------------------------------------------------
// Solar BOM
// ---------------------------------------------------------------------------

const solarProducts: BOMProduct[] = [
  // Tier 0
  { id: 'solar-panel', name: 'Solar Panel', tier: 0, category: 'finished-good', defaultLeadTimeDays: 1 },
  // Tier 1
  { id: 'solar-cell-assembly', name: 'Cell Assembly', tier: 1, category: 'assembly', defaultLeadTimeDays: 5 },
  { id: 'solar-panel-frame', name: 'Panel Frame', tier: 1, category: 'assembly', defaultLeadTimeDays: 4 },
  { id: 'solar-glass-cover', name: 'Glass Cover', tier: 1, category: 'assembly', commodityId: 'glass', defaultLeadTimeDays: 5 },
  { id: 'solar-backsheet-encapsulant', name: 'Backsheet & Encapsulant', tier: 1, category: 'assembly', defaultLeadTimeDays: 4 },
  // Tier 2
  { id: 'solar-cell', name: 'Solar Cell', tier: 2, category: 'component', defaultLeadTimeDays: 14 },
  { id: 'solar-silver-paste', name: 'Silver Paste', tier: 2, category: 'component', commodityId: 'silver', defaultLeadTimeDays: 10 },
  { id: 'solar-aluminum-frame', name: 'Aluminum Frame', tier: 2, category: 'component', commodityId: 'aluminum', defaultLeadTimeDays: 10 },
  { id: 'solar-tempered-glass', name: 'Tempered Glass', tier: 2, category: 'component', defaultLeadTimeDays: 10 },
  { id: 'solar-eva-encapsulant', name: 'EVA Encapsulant', tier: 2, category: 'component', defaultLeadTimeDays: 8 },
  { id: 'solar-backsheet-film', name: 'Backsheet Film', tier: 2, category: 'component', defaultLeadTimeDays: 8 },
  // Tier 3
  { id: 'solar-silicon-wafer', name: 'Silicon Wafer', tier: 3, category: 'sub-component', commodityId: 'polysilicon', defaultLeadTimeDays: 21 },
  { id: 'solar-silver-powder', name: 'Silver Powder', tier: 3, category: 'sub-component', defaultLeadTimeDays: 18 },
  { id: 'solar-aluminum-extrusion', name: 'Aluminum Extrusion', tier: 3, category: 'sub-component', defaultLeadTimeDays: 16 },
  { id: 'solar-float-glass', name: 'Float Glass', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  { id: 'solar-eva-resin', name: 'EVA Resin', tier: 3, category: 'sub-component', defaultLeadTimeDays: 16 },
  { id: 'solar-pet-film', name: 'PET Film', tier: 3, category: 'sub-component', defaultLeadTimeDays: 14 },
  // Tier 4
  { id: 'solar-polysilicon-chunk', name: 'Polysilicon Chunk', tier: 4, category: 'raw-material', defaultLeadTimeDays: 45 },
  { id: 'solar-silver-ore', name: 'Silver Ore', tier: 4, category: 'raw-material', defaultLeadTimeDays: 40 },
  { id: 'solar-bauxite', name: 'Bauxite', tier: 4, category: 'raw-material', defaultLeadTimeDays: 35 },
  { id: 'solar-silica-sand', name: 'Silica Sand', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'solar-ethylene', name: 'Ethylene', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
  { id: 'solar-pet-resin', name: 'PET Resin', tier: 4, category: 'raw-material', defaultLeadTimeDays: 30 },
];

const solarEntries: BOMEntry[] = [
  // Tier 0 -> Tier 1
  { parentProductId: 'solar-panel', childProductId: 'solar-cell-assembly', quantityPer: 60, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '60-cell configuration is the standard residential panel format' },
  { parentProductId: 'solar-panel', childProductId: 'solar-panel-frame', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 aluminum frame per panel' },
  { parentProductId: 'solar-panel', childProductId: 'solar-glass-cover', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 tempered glass cover per panel' },
  { parentProductId: 'solar-panel', childProductId: 'solar-backsheet-encapsulant', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 85, rationale: '1 backsheet + encapsulant set per panel' },
  // Cell Assembly -> Tier 2
  { parentProductId: 'solar-cell-assembly', childProductId: 'solar-cell', quantityPer: 1, unit: 'pcs', critical: true, substitutionDifficulty: 'hard', source: 'template-default', confidence: 70, rationale: '1 solar cell per cell assembly position' },
  { parentProductId: 'solar-cell-assembly', childProductId: 'solar-silver-paste', quantityPer: 0.0002, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~0.2 g silver paste per cell for front/back contacts' },
  // Panel Frame -> Tier 2
  { parentProductId: 'solar-panel-frame', childProductId: 'solar-aluminum-frame', quantityPer: 2.5, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~2.5 kg aluminum frame per standard panel' },
  // Glass Cover -> Tier 2
  { parentProductId: 'solar-glass-cover', childProductId: 'solar-tempered-glass', quantityPer: 1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '1 tempered glass sheet per glass cover' },
  // Backsheet & Encapsulant -> Tier 2
  { parentProductId: 'solar-backsheet-encapsulant', childProductId: 'solar-eva-encapsulant', quantityPer: 0.8, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~0.8 kg EVA encapsulant (front + rear sheets) per panel' },
  { parentProductId: 'solar-backsheet-encapsulant', childProductId: 'solar-backsheet-film', quantityPer: 0.3, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~0.3 kg backsheet film per panel' },
  // Solar Cell -> Tier 3
  { parentProductId: 'solar-cell', childProductId: 'solar-silicon-wafer', quantityPer: 1, unit: 'pcs', critical: true, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '1 mono/poly-crystalline silicon wafer per solar cell' },
  // Silver Paste -> Tier 3
  { parentProductId: 'solar-silver-paste', childProductId: 'solar-silver-powder', quantityPer: 0.00025, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~0.25 g silver powder per 0.2 g paste (with glass frit binder)' },
  // Aluminum Frame -> Tier 3
  { parentProductId: 'solar-aluminum-frame', childProductId: 'solar-aluminum-extrusion', quantityPer: 2.8, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~2.8 kg extrusion per 2.5 kg finished frame (cutting waste)' },
  // Tempered Glass -> Tier 3
  { parentProductId: 'solar-tempered-glass', childProductId: 'solar-float-glass', quantityPer: 1.1, unit: 'pcs', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~1.1 float glass per 1 tempered glass (breakage/QC loss)' },
  // EVA Encapsulant -> Tier 3
  { parentProductId: 'solar-eva-encapsulant', childProductId: 'solar-eva-resin', quantityPer: 0.9, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~0.9 kg EVA resin per 0.8 kg encapsulant film (extrusion)' },
  // Backsheet Film -> Tier 3
  { parentProductId: 'solar-backsheet-film', childProductId: 'solar-pet-film', quantityPer: 0.35, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~0.35 kg PET film per 0.3 kg backsheet (lamination waste)' },
  // Silicon Wafer -> Tier 4
  { parentProductId: 'solar-silicon-wafer', childProductId: 'solar-polysilicon-chunk', quantityPer: 0.012, unit: 'kg', critical: true, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 70, rationale: '~12 g polysilicon per wafer (ingot growth + wire-saw kerf loss)' },
  // Silver Powder -> Tier 4
  { parentProductId: 'solar-silver-powder', childProductId: 'solar-silver-ore', quantityPer: 0.0005, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 50, rationale: '~0.5 g silver ore per 0.25 g powder (refining yield)' },
  // Aluminum Extrusion -> Tier 4
  { parentProductId: 'solar-aluminum-extrusion', childProductId: 'solar-bauxite', quantityPer: 8.4, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~8.4 kg bauxite per 2.8 kg extrusion (Bayer-Hall-Heroult ~3:1)' },
  // Float Glass -> Tier 4
  { parentProductId: 'solar-float-glass', childProductId: 'solar-silica-sand', quantityPer: 3.5, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 55, rationale: '~3.5 kg silica sand per float glass sheet (melting batch)' },
  // EVA Resin -> Tier 4
  { parentProductId: 'solar-eva-resin', childProductId: 'solar-ethylene', quantityPer: 1.2, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 50, rationale: '~1.2 kg ethylene per 0.9 kg EVA resin (copolymerization)' },
  // PET Film -> Tier 4
  { parentProductId: 'solar-pet-film', childProductId: 'solar-pet-resin', quantityPer: 0.4, unit: 'kg', critical: false, substitutionDifficulty: 'moderate', source: 'template-default', confidence: 50, rationale: '~0.4 kg PET resin per 0.35 kg PET film (extrusion yield)' },
];

const solarBOM: BillOfMaterials = {
  id: 'solar-bom',
  finishedProductId: 'solar-panel',
  name: 'Solar Panel Standard BOM',
  industry: 'solar',
  products: solarProducts,
  entries: solarEntries,
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const INDUSTRY_BOMS: Record<string, BillOfMaterials> = {
  automotive: automotiveBOM,
  tech: techBOM,
  pharma: pharmaBOM,
  fmcg: fmcgBOM,
  solar: solarBOM,
};

export function getIndustryBOM(industryId: string): BillOfMaterials | null {
  return INDUSTRY_BOMS[industryId] ?? null;
}

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  automotive: ['tesla', 'vehicle', 'car', 'motor', 'engine', 'chassis', 'transmission', 'gigafactory', 'lithium', 'cobalt', 'bosch', 'magna', 'continental', 'volkswagen', 'ford', 'toyota', 'bmw', 'battery pack', 'ev ', 'electric vehicle', 'panasonic', 'samsung sdi', 'catl'],
  tech: ['tsmc', 'chip fab', 'semiconductor', 'wafer', 'apple', 'intel', 'nvidia', 'circuit', 'server', 'smartphone', 'microchip', 'foundry', 'printed circuit'],
  pharma: ['pharma', 'drug', 'medicine', 'clinical', 'hospital', 'tablet', 'capsule', 'vaccine', 'active ingredient', 'pfizer', 'bayer', 'api plant'],
  fmcg: ['consumer goods', 'food', 'beverage', 'retail store', 'walmart', 'supermarket', 'procter', 'unilever', 'grocery', 'fmcg'],
  solar: ['solar', 'photovoltaic', 'inverter', 'solar panel', 'solar module', 'tracker', 'sunpower', 'first solar', 'polysilicon', 'solar farm'],
};

/**
 * Infer the most likely industry from a set of node names via keyword scoring.
 * Returns the industry id (e.g. 'automotive') or null if no match is confident enough.
 */
export function inferIndustryFromNodes(nodes: SupplyNode[]): string | null {
  const scores: Record<string, number> = {};
  for (const id of Object.keys(INDUSTRY_KEYWORDS)) scores[id] = 0;

  const nodeText = nodes.map(n => n.name.toLowerCase()).join(' ');
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const kw of keywords) {
      if (nodeText.includes(kw)) scores[industry]++;
    }
  }

  const [bestId, bestScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return bestScore > 0 ? bestId : null;
}

/**
 * Auto-map supply chain nodes to BOM products and initialize material inventory.
 *
 * Mapping strategy:
 *  - SUPPLIER nodes → Tier 3/4 raw materials via materialId == commodityId
 *  - FACTORY nodes  → Tier 1/2 assemblies (first unmatched factory → highest-tier assembly)
 *  - RETAIL nodes   → Tier 0 finished good
 *  - SUPPLIER without materialId → match by name keywords against BOM product names
 *
 * Also initializes materialInventory on factories so the engine can track per-material bins.
 *
 * Returns a new nodes array with bomProductId, tier, and materialInventory set.
 */
export function autoMapNodesToBOM(
  nodes: SupplyNode[],
  bom: BillOfMaterials
): SupplyNode[] {
  const mapped = nodes.map(n => ({ ...n }));
  const usedProductIds = new Set<string>();

  // Build lookup: commodityId → BOMProduct[]
  const byCommodity = new Map<string, BOMProduct[]>();
  for (const p of bom.products) {
    if (p.commodityId) {
      const list = byCommodity.get(p.commodityId) ?? [];
      list.push(p);
      byCommodity.set(p.commodityId, list);
    }
  }

  // Products by tier (sorted descending — assign raw materials first)
  const assemblies = bom.products.filter(p => p.tier === 1 || p.tier === 2).sort((a, b) => a.tier - b.tier);
  const finishedGood = bom.products.find(p => p.id === bom.finishedProductId);

  // Helper: simple keyword matching between node name and product name
  const nameScore = (nodeName: string, productName: string): number => {
    const nWords = nodeName.toLowerCase().split(/[\s\-_]+/);
    const pWords = productName.toLowerCase().split(/[\s\-_]+/);
    let hits = 0;
    for (const nw of nWords) {
      if (nw.length < 3) continue; // skip tiny words
      for (const pw of pWords) {
        if (pw.includes(nw) || nw.includes(pw)) { hits++; break; }
      }
    }
    return hits;
  };

  // ── Pass 1: SUPPLIER → raw materials (Tier 3/4) via materialId ──
  for (const node of mapped) {
    if (node.type !== NodeType.SUPPLIER) continue;
    if (node.materialId) {
      const candidates = byCommodity.get(node.materialId) ?? [];
      // Prefer the deepest tier match not yet used
      const best = candidates
        .filter(p => !usedProductIds.has(p.id))
        .sort((a, b) => b.tier - a.tier)[0];
      if (best) {
        node.bomProductId = best.id;
        node.tier = best.tier;
        usedProductIds.add(best.id);
        continue;
      }
    }
    // Fallback: name-based matching against all Tier 3/4 products
    const rawMaterials = bom.products.filter(p => p.tier >= 3 && !usedProductIds.has(p.id));
    let bestScore = 0;
    let bestProduct: BOMProduct | null = null;
    for (const p of rawMaterials) {
      const score = nameScore(node.name, p.name);
      if (score > bestScore) { bestScore = score; bestProduct = p; }
    }
    if (bestProduct && bestScore >= 1) {
      node.bomProductId = bestProduct.id;
      node.tier = bestProduct.tier;
      usedProductIds.add(bestProduct.id);
    } else {
      // Final fallback: grab any available Tier 3/4 product (handles generic node names)
      const fallback = bom.products.filter(p => p.tier >= 3 && !usedProductIds.has(p.id))[0];
      if (fallback) {
        node.bomProductId = fallback.id;
        node.tier = fallback.tier;
        usedProductIds.add(fallback.id);
      }
    }
  }

  // ── Pass 2: RETAIL → finished good (Tier 0) ──
  if (finishedGood) {
    for (const node of mapped) {
      if (node.type === NodeType.RETAIL) {
        node.bomProductId = finishedGood.id;
        node.tier = 0;
        // Don't add to usedProductIds — multiple retail nodes can share the finished good
      }
    }
  }

  // ── Pass 3: FACTORY → assemblies (Tier 1/2) ──
  const unmappedFactories = mapped.filter(n => n.type === NodeType.FACTORY && !n.bomProductId);
  const unmappedAssemblies = assemblies.filter(p => !usedProductIds.has(p.id));

  for (const node of unmappedFactories) {
    // Try name matching first
    let bestScore = 0;
    let bestProduct: BOMProduct | null = null;
    for (const p of unmappedAssemblies.filter(p => !usedProductIds.has(p.id))) {
      const score = nameScore(node.name, p.name);
      if (score > bestScore) { bestScore = score; bestProduct = p; }
    }
    if (bestProduct && bestScore >= 1) {
      node.bomProductId = bestProduct.id;
      node.tier = bestProduct.tier;
      usedProductIds.add(bestProduct.id);
    } else {
      // Grab the first available assembly
      const fallback = unmappedAssemblies.find(p => !usedProductIds.has(p.id));
      if (fallback) {
        node.bomProductId = fallback.id;
        node.tier = fallback.tier;
        usedProductIds.add(fallback.id);
      }
    }
  }

  // ── Pass 3.5: WAREHOUSE / DISTRIBUTION_CENTER → tier-1/2 assemblies ──
  const unmappedStorageNodes = mapped.filter(
    n => (n.type === NodeType.WAREHOUSE || n.type === NodeType.DISTRIBUTION_CENTER) && !n.bomProductId
  );
  for (const node of unmappedStorageNodes) {
    const candidates = bom.products.filter(p => (p.tier === 1 || p.tier === 2) && !usedProductIds.has(p.id));
    let bestScore = 0;
    let bestProduct: BOMProduct | null = null;
    for (const p of candidates) {
      const score = nameScore(node.name, p.name);
      if (score > bestScore) { bestScore = score; bestProduct = p; }
    }
    if (bestProduct && bestScore >= 1) {
      node.bomProductId = bestProduct.id;
      node.tier = bestProduct.tier;
      usedProductIds.add(bestProduct.id);
    } else {
      const fallback = candidates[0];
      if (fallback) {
        node.bomProductId = fallback.id;
        node.tier = fallback.tier;
        usedProductIds.add(fallback.id);
      }
    }
  }

  // ── Pass 4: Initialize materialInventory on BOM-mapped factories ──
  for (const node of mapped) {
    if (node.type !== NodeType.FACTORY || !node.bomProductId) continue;
    const inputs = bom.entries.filter(e => e.parentProductId === node.bomProductId);
    if (inputs.length === 0) continue;
    const matInv: Record<string, number> = {};
    for (const input of inputs) {
      // Seed with enough material for ~5 days of production at current capacity
      const dailyUsage = (node.productionCapacity || 100) * input.quantityPer;
      matInv[input.childProductId] = Math.round(dailyUsage * 5);
    }
    node.materialInventory = matInv;
  }

  return mapped;
}
