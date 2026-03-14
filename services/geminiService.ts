import { GoogleGenAI, Type } from "@google/genai";
import { SimulationParams, SimulationResult, SupplyNode, Route } from "../types";

// Mock result for fallback if no API key is present or error occurs
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
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API Key found. Returning mock simulation data.");
    return new Promise(resolve => setTimeout(() => resolve(MOCK_RESULT), 1500));
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Act as a Digital Twin Simulation Engine for a Global Supply Chain.
      Analyze the impact of the following configuration:
      
      Nodes: ${JSON.stringify(nodes)}
      Routes: ${JSON.stringify(routes)}
      Global Parameters: ${JSON.stringify(params)}

      Provide a structured JSON output containing:
      1. A detailed narrative describing the propagation of potential shocks.
      2. Quantitative impact estimates on KPIs.
      3. Strategic recommendations for mitigation.
      4. Qualitative risk assessment.
      5. Quantitative risk score (0-100).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            kpiImpact: {
              type: Type.OBJECT,
              properties: {
                landedCostChange: { type: Type.NUMBER },
                otifChange: { type: Type.NUMBER },
                carbonFootprintChange: { type: Type.NUMBER },
                inventoryRisk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                financialRisk: { type: Type.NUMBER },
                operationalRisk: { type: Type.NUMBER }
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            qualitativeRisk: { type: Type.STRING },
            quantitativeRiskScore: { type: Type.NUMBER }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as SimulationResult;
    }
    
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Simulation failed:", error);
    return MOCK_RESULT;
  }
};
