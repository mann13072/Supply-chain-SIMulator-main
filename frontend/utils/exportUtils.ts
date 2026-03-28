import * as XLSX from 'xlsx';
import type {
  SupplyNode,
  Route,
  IndustryConfig,
  SimulationParams,
  HistorySnapshot,
  NodeStatus,
} from '../types';

export interface ExportData {
  nodes: SupplyNode[];
  routes: Route[];
  industryConfig: IndustryConfig;
  params: SimulationParams;
  history: HistorySnapshot[];
  day: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  // Clean up after a tick so the browser can finish the download
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}

function nodeName(nodes: SupplyNode[], id: string): string {
  return nodes.find((n) => n.id === id)?.name ?? id;
}

// ---------------------------------------------------------------------------
// 1. Export JSON
// ---------------------------------------------------------------------------

export function exportJSON(data: ExportData): void {
  const payload = {
    nodes: data.nodes,
    routes: data.routes,
    industryConfig: data.industryConfig,
    params: data.params,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const name = sanitizeFilename(data.industryConfig.name);
  downloadBlob(blob, `chainsim-${name}-${dateStamp()}.json`);
}

// ---------------------------------------------------------------------------
// 2. Export Excel
// ---------------------------------------------------------------------------

export function exportExcel(data: ExportData): void {
  const { nodes, routes, industryConfig, history } = data;
  const wb = XLSX.utils.book_new();

  // -- Nodes sheet --
  const nodesRows = nodes.map((n) => ({
    Name: n.name,
    Type: n.type,
    Status: n.status,
    Location: n.location,
    Inventory: n.inventoryLevel,
    'Max Capacity': n.maxCapacity,
    Lat: n.coordinates.lat,
    Lng: n.coordinates.lng,
  }));
  const wsNodes = XLSX.utils.json_to_sheet(nodesRows);
  XLSX.utils.book_append_sheet(wb, wsNodes, 'Nodes');

  // -- Routes sheet --
  const routesRows = routes.map((r) => ({
    From: nodeName(nodes, r.fromId),
    To: nodeName(nodes, r.toId),
    Mode: r.mode,
    'Distance (km)': r.distance,
    'Lead Time (days)': r.baseLeadTime,
    'Cost/km': r.costPerUnitDistance,
    Capacity: r.vehicleCapacity,
  }));
  const wsRoutes = XLSX.utils.json_to_sheet(routesRows);
  XLSX.utils.book_append_sheet(wb, wsRoutes, 'Routes');

  // -- Commodities sheet --
  const commoditiesRows = industryConfig.commodities.map((c) => ({
    Name: c.name,
    Unit: c.unit,
    'Base Price': c.basePrice,
    Color: c.color,
  }));
  const wsCommodities = XLSX.utils.json_to_sheet(commoditiesRows);
  XLSX.utils.book_append_sheet(wb, wsCommodities, 'Commodities');

  // -- Simulation History sheet (only if data exists) --
  if (history.length > 0) {
    const historyRows = history.map((h) => {
      const fillRate =
        h.demandTotal > 0
          ? Math.round((h.demandFulfilled / h.demandTotal) * 10000) / 100
          : 0;
      const disruptions =
        h.disruptionCounts.naturalDisaster +
        h.disruptionCounts.cyberIncident +
        h.disruptionCounts.supplierFailure +
        h.disruptionCounts.laborStrike +
        h.disruptionCounts.demandShock +
        h.disruptionCounts.qualityRecall +
        h.disruptionCounts.pandemicEffect;
      return {
        Day: h.day,
        Demand: h.demandTotal,
        Fulfilled: h.demandFulfilled,
        'Fill Rate %': fillRate,
        'Holding Cost': h.holdingCost,
        'Stockout Cost': h.stockoutCost,
        'Shipments In Flight': h.shipmentsInFlight,
        Disruptions: disruptions,
      };
    });
    const wsHistory = XLSX.utils.json_to_sheet(historyRows);
    XLSX.utils.book_append_sheet(wb, wsHistory, 'Simulation History');
  }

  const name = sanitizeFilename(industryConfig.name);
  XLSX.writeFile(wb, `chainsim-${name}-${dateStamp()}.xlsx`);
}

// ---------------------------------------------------------------------------
// 3. Export Report (print-ready HTML -> PDF via browser print)
// ---------------------------------------------------------------------------

export function exportReport(data: ExportData): void {
  const { nodes, routes, industryConfig, history, day } = data;
  const date = dateStamp();
  const currencySymbol = industryConfig.currencySymbol || '$';

  const optimalCount = nodes.filter((n) => n.status === ('OPTIMAL' as NodeStatus)).length;
  const healthPct = nodes.length > 0 ? Math.round((optimalCount / nodes.length) * 100) : 0;

  // Build performance metrics section (only if history exists)
  let performanceHTML = '';
  if (history.length > 0) {
    const totalDemand = history.reduce((s, h) => s + h.demandTotal, 0);
    const totalFulfilled = history.reduce((s, h) => s + h.demandFulfilled, 0);
    const avgFillRate = totalDemand > 0 ? Math.round((totalFulfilled / totalDemand) * 10000) / 100 : 0;
    const totalHolding = history.reduce((s, h) => s + h.holdingCost, 0);
    const totalStockout = history.reduce((s, h) => s + h.stockoutCost, 0);

    const disruptionTotals = history.reduce(
      (acc, h) => {
        acc.naturalDisaster += h.disruptionCounts.naturalDisaster;
        acc.cyberIncident += h.disruptionCounts.cyberIncident;
        acc.supplierFailure += h.disruptionCounts.supplierFailure;
        acc.laborStrike += h.disruptionCounts.laborStrike;
        acc.demandShock += h.disruptionCounts.demandShock;
        acc.qualityRecall += h.disruptionCounts.qualityRecall;
        acc.pandemicEffect += h.disruptionCounts.pandemicEffect;
        return acc;
      },
      {
        naturalDisaster: 0,
        cyberIncident: 0,
        supplierFailure: 0,
        laborStrike: 0,
        demandShock: 0,
        qualityRecall: 0,
        pandemicEffect: 0,
      }
    );

    performanceHTML = `
      <h2>Performance Metrics</h2>
      <table>
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Average Fill Rate</td><td>${avgFillRate}%</td></tr>
          <tr><td>Total Holding Cost</td><td>${currencySymbol}${totalHolding.toLocaleString()}</td></tr>
          <tr><td>Total Stockout Cost</td><td>${currencySymbol}${totalStockout.toLocaleString()}</td></tr>
        </tbody>
      </table>
      <h3>Disruptions by Type</h3>
      <table>
        <thead><tr><th>Type</th><th>Count</th></tr></thead>
        <tbody>
          <tr><td>Natural Disaster</td><td>${disruptionTotals.naturalDisaster}</td></tr>
          <tr><td>Cyber Incident</td><td>${disruptionTotals.cyberIncident}</td></tr>
          <tr><td>Supplier Failure</td><td>${disruptionTotals.supplierFailure}</td></tr>
          <tr><td>Labor Strike</td><td>${disruptionTotals.laborStrike}</td></tr>
          <tr><td>Demand Shock</td><td>${disruptionTotals.demandShock}</td></tr>
          <tr><td>Quality Recall</td><td>${disruptionTotals.qualityRecall}</td></tr>
          <tr><td>Pandemic Effect</td><td>${disruptionTotals.pandemicEffect}</td></tr>
        </tbody>
      </table>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ChainSim Report - ${escapeHTML(industryConfig.name)}</title>
<style>
  @media print {
    @page { size: A4; margin: 15mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #111;
    padding: 20px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 2px solid #111;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  header h1 { font-size: 20px; font-weight: 700; }
  header .meta { font-size: 11px; color: #444; text-align: right; }
  h2 {
    font-size: 14px;
    font-weight: 700;
    border-bottom: 1px solid #999;
    padding-bottom: 3px;
    margin: 18px 0 8px;
  }
  h3 { font-size: 12px; font-weight: 600; margin: 12px 0 6px; }
  .summary-box {
    border: 1.5px solid #111;
    padding: 10px 14px;
    margin-bottom: 14px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .summary-box .item { text-align: center; }
  .summary-box .item .label { font-size: 9px; text-transform: uppercase; color: #555; }
  .summary-box .item .value { font-size: 18px; font-weight: 700; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 10px;
  }
  th, td {
    border: 1px solid #999;
    padding: 4px 6px;
    text-align: left;
  }
  th {
    background: #eee;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 9px;
  }
  tr:nth-child(even) td { background: #f9f9f9; }
  footer {
    margin-top: 20px;
    border-top: 1px solid #999;
    padding-top: 6px;
    font-size: 9px;
    color: #666;
    text-align: center;
  }
</style>
</head>
<body>
  <header>
    <h1>ChainSim Report</h1>
    <div class="meta">
      <div><strong>${escapeHTML(industryConfig.name)}</strong></div>
      <div>${date}</div>
    </div>
  </header>

  <div class="summary-box">
    <div class="item"><div class="label">Total Nodes</div><div class="value">${nodes.length}</div></div>
    <div class="item"><div class="label">Total Routes</div><div class="value">${routes.length}</div></div>
    <div class="item"><div class="label">Simulation Days</div><div class="value">${day}</div></div>
    <div class="item"><div class="label">Network Health</div><div class="value">${healthPct}%</div></div>
  </div>

  <h2>Commodities</h2>
  <table>
    <thead><tr><th>Name</th><th>Unit</th><th>Base Price</th></tr></thead>
    <tbody>
      ${industryConfig.commodities
        .map(
          (c) =>
            `<tr><td>${escapeHTML(c.name)}</td><td>${escapeHTML(c.unit)}</td><td>${currencySymbol}${c.basePrice.toLocaleString()}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>Network Nodes</h2>
  <table>
    <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Inventory</th><th>Max Capacity</th><th>Utilization %</th></tr></thead>
    <tbody>
      ${nodes
        .map((n) => {
          const util = n.maxCapacity > 0 ? Math.round((n.inventoryLevel / n.maxCapacity) * 100) : 0;
          return `<tr><td>${escapeHTML(n.name)}</td><td>${escapeHTML(n.type)}</td><td>${escapeHTML(n.status)}</td><td>${n.inventoryLevel.toLocaleString()}</td><td>${n.maxCapacity.toLocaleString()}</td><td>${util}%</td></tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <h2>Routes</h2>
  <table>
    <thead><tr><th>From</th><th>To</th><th>Mode</th><th>Distance (km)</th><th>Lead Time (days)</th></tr></thead>
    <tbody>
      ${routes
        .map(
          (r) =>
            `<tr><td>${escapeHTML(nodeName(nodes, r.fromId))}</td><td>${escapeHTML(nodeName(nodes, r.toId))}</td><td>${escapeHTML(r.mode)}</td><td>${r.distance.toLocaleString()}</td><td>${r.baseLeadTime}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>

  ${performanceHTML}

  <footer>Generated by ChainSim &bull; ${date}</footer>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 500);
    });
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ---------------------------------------------------------------------------
// 4. Export Read-Only Dashboard (self-contained HTML download)
// ---------------------------------------------------------------------------

export function exportReadOnlyDashboard(data: ExportData): void {
  const { nodes, routes, industryConfig, day } = data;

  const embeddedData = {
    nodes: nodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      status: n.status,
      location: n.location,
      inventoryLevel: n.inventoryLevel,
      maxCapacity: n.maxCapacity,
    })),
    routes: routes.map((r) => ({
      fromName: nodeName(nodes, r.fromId),
      toName: nodeName(nodes, r.toId),
      mode: r.mode,
      distance: r.distance,
      baseLeadTime: r.baseLeadTime,
    })),
    commodities: industryConfig.commodities.map((c) => ({
      name: c.name,
      unit: c.unit,
      basePrice: c.basePrice,
      color: c.color,
    })),
    industryName: industryConfig.name,
    currencySymbol: industryConfig.currencySymbol || '$',
    day,
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ChainSim Dashboard - ${escapeHTML(industryConfig.name)}</title>
<style>
  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface-hover: #22263a;
    --border: #2a2e3e;
    --text: #e4e4e7;
    --text-muted: #9ca3af;
    --accent: #6366f1;
    --optimal: #22c55e;
    --warning: #eab308;
    --critical: #ef4444;
    --offline: #6b7280;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    min-height: 100vh;
  }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
    flex-wrap: wrap;
    gap: 8px;
  }
  header h1 { font-size: 24px; font-weight: 700; }
  header h1 span { color: var(--accent); }
  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 12px;
  }
  .grid { display: grid; gap: 12px; margin-bottom: 32px; }
  .grid-nodes { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .grid-routes { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  .grid-commodities { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px;
    transition: background 0.15s;
  }
  .card:hover { background: var(--surface-hover); }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .card-header h3 { font-size: 14px; font-weight: 600; }
  .status-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .status-dot.OPTIMAL { background: var(--optimal); }
  .status-dot.WARNING { background: var(--warning); }
  .status-dot.CRITICAL { background: var(--critical); }
  .status-dot.OFFLINE { background: var(--offline); }
  .card-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-muted);
    padding: 2px 0;
  }
  .card-row .val { color: var(--text); font-weight: 500; }
  .progress-bar {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;
  }
  .progress-bar .fill {
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
    transition: width 0.3s;
  }
  .commodity-swatch {
    width: 14px; height: 14px;
    border-radius: 3px;
    display: inline-block;
    vertical-align: middle;
    margin-right: 6px;
    flex-shrink: 0;
  }
  .route-arrow { color: var(--accent); font-weight: 700; margin: 0 4px; }
  footer {
    text-align: center;
    color: var(--text-muted);
    font-size: 11px;
    padding: 24px 0 12px;
    border-top: 1px solid var(--border);
  }
  @media (max-width: 600px) {
    .grid-nodes, .grid-routes, .grid-commodities {
      grid-template-columns: 1fr;
    }
    header { flex-direction: column; align-items: flex-start; }
  }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1><span>ChainSim</span> Dashboard</h1>
    <div>
      <span class="badge">${escapeHTML(industryConfig.name)}</span>
      <span class="badge">Day ${day}</span>
    </div>
  </header>

  <div class="section-title">Network Nodes</div>
  <div class="grid grid-nodes" id="nodes"></div>

  <div class="section-title">Routes</div>
  <div class="grid grid-routes" id="routes"></div>

  <div class="section-title">Commodities</div>
  <div class="grid grid-commodities" id="commodities"></div>

  <footer>Generated by ChainSim &bull; ${dateStamp()}</footer>
</div>
<script>
const DATA = ${JSON.stringify(embeddedData)};

function render() {
  // Nodes
  const nodesEl = document.getElementById('nodes');
  nodesEl.innerHTML = DATA.nodes.map(function(n) {
    var util = n.maxCapacity > 0 ? Math.round((n.inventoryLevel / n.maxCapacity) * 100) : 0;
    return '<div class="card">' +
      '<div class="card-header"><h3>' + esc(n.name) + '</h3><span class="status-dot ' + n.status + '" title="' + n.status + '"></span></div>' +
      '<div class="card-row"><span>Type</span><span class="val">' + esc(n.type) + '</span></div>' +
      '<div class="card-row"><span>Location</span><span class="val">' + esc(n.location) + '</span></div>' +
      '<div class="card-row"><span>Inventory</span><span class="val">' + n.inventoryLevel.toLocaleString() + ' / ' + n.maxCapacity.toLocaleString() + '</span></div>' +
      '<div class="progress-bar"><div class="fill" style="width:' + Math.min(util, 100) + '%"></div></div>' +
    '</div>';
  }).join('');

  // Routes
  var routesEl = document.getElementById('routes');
  routesEl.innerHTML = DATA.routes.map(function(r) {
    return '<div class="card">' +
      '<div class="card-header"><h3>' + esc(r.fromName) + '<span class="route-arrow">&rarr;</span>' + esc(r.toName) + '</h3></div>' +
      '<div class="card-row"><span>Mode</span><span class="val">' + esc(r.mode) + '</span></div>' +
      '<div class="card-row"><span>Distance</span><span class="val">' + r.distance.toLocaleString() + ' km</span></div>' +
      '<div class="card-row"><span>Lead Time</span><span class="val">' + r.baseLeadTime + ' days</span></div>' +
    '</div>';
  }).join('');

  // Commodities
  var commoditiesEl = document.getElementById('commodities');
  commoditiesEl.innerHTML = DATA.commodities.map(function(c) {
    return '<div class="card">' +
      '<div class="card-header"><h3><span class="commodity-swatch" style="background:' + esc(c.color) + '"></span>' + esc(c.name) + '</h3></div>' +
      '<div class="card-row"><span>Unit</span><span class="val">' + esc(c.unit) + '</span></div>' +
      '<div class="card-row"><span>Base Price</span><span class="val">' + DATA.currencySymbol + c.basePrice.toLocaleString() + '</span></div>' +
    '</div>';
  }).join('');
}

function esc(str) {
  var el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

render();
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, `chainsim-dashboard-${dateStamp()}.html`);
}

// ---------------------------------------------------------------------------
// Shared HTML escape utility
// ---------------------------------------------------------------------------

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
