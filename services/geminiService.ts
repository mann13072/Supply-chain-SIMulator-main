import { SimulationParams, SimulationResult, SupplyNode, Route } from "../types";

const MOCK_RESULT: SimulationResult = {
  narrative: "Simulation completed using fallback logic. The complex interaction of rising silver prices and logistics bottlenecks has created a bullwhip effect. While module assembly is resilient, the cost basis has shifted significantly, threatening project IRRs in the EU region.",
  kpiImpact: {
    landedCostChange: 12.4,
    otifChange: -15.2,
    carbonFootprintChange: 4.1,
    inventoryRisk: 'High',
    financialRisk: 65,
    operationalRisk: 78
  },
  recommendations: [
    "Hedge silver exposure immediately for Q3 contracts.",
    "Prioritize rail freight for European distribution to bypass port congestion.",
    "Renegotiate delivery timelines with Tier 1 EPCs."
  ],
  qualitativeRisk: "High dependency on single-source suppliers in volatile regions.",
  quantitativeRiskScore: 72
};

export const runSimulationAnalysis = async (
  nodes: SupplyNode[],
  routes: Route[],
  params: SimulationParams
): Promise<SimulationResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, routes, params })
    });

    if (!response.ok) {
      console.warn(`AI analysis unavailable (${response.status}). Using fallback data.`);
      return MOCK_RESULT;
    }

    return await response.json() as SimulationResult;
  } catch (error) {
    console.error("Simulation analysis request failed:", error);
    return MOCK_RESULT;
  }
};
