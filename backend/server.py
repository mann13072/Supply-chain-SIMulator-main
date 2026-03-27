import os
import json
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from dataclasses import asdict

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv optional; env vars can be set directly

# Import our optimized engine
from supply_chain_engine import TransitNetwork, seed_prototype_data

app = FastAPI(
    title="Supply Chain Routing API",
    description="Secure, high-performance logistics routing engine.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Initialize and seed the engine globally
engine = TransitNetwork()
seed_prototype_data(engine)


class RouteResponse(BaseModel):
    status: str
    path: List[str]
    distance_km: float
    lead_time_days: float
    message: Optional[str] = None


@app.get("/health")
async def health_check():
    return {"status": "healthy", "engine": "ready"}


@app.get("/api/hubs", response_model=Dict[str, List[Dict]])
async def list_hubs():
    hubs = {"Air": [], "Sea": []}
    for node_id, node in engine._nodes.items():
        if not node.is_hub:
            continue
        hubs[node.type].append({
            "id": node_id,
            "name": node.name,
            "coordinates": {"lat": node.lat, "lon": node.lon}
        })
    return hubs


@app.get("/api/hubs/nearby")
async def get_nearby_hubs(lat: float, lon: float):
    """Finds nearest logistics hubs to a custom location for UI suggestions."""
    return engine.get_nearby_hubs(lat, lon)


class NodeCreate(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    type: str
    is_hub: bool = False


class RouteCreate(BaseModel):
    u: str
    v: str
    mode: str


@app.post("/api/nodes")
async def add_node(node: NodeCreate):
    engine.add_node(node.id, node.name, node.lat, node.lon, node.type, is_hub=node.is_hub)
    return {"status": "success"}


@app.post("/api/routes")
async def add_route(route: RouteCreate):
    if route.u.upper() not in engine._nodes or route.v.upper() not in engine._nodes:
        raise HTTPException(status_code=404, detail=f"One or both nodes not found: {route.u}, {route.v}")
    engine.add_route(route.u, route.v, route.mode)
    return {"status": "success"}


@app.get("/api/route", response_model=RouteResponse)
async def get_shortest_path(
    start: str = Query(..., min_length=2, max_length=50),
    end: str = Query(..., min_length=2, max_length=50),
    mode: str = Query(..., pattern="^(Air|Sea|Road|Rail)$")
):
    try:
        path, distance, time_days = engine.find_shortest_path(start, end, mode)

        if distance == -1.0:
            return {
                "status": "error",
                "path": [],
                "distance_km": 0.0,
                "lead_time_days": 0.0,
                "message": f"No valid {mode} route found between {start} and {end}."
            }

        return {
            "status": "success",
            "path": path,
            "distance_km": distance,
            "lead_time_days": time_days
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal routing engine error.")


@app.get("/api/state")
async def get_state():
    """Returns the current simulation state (nodes and routes)."""
    nodes = []
    for node in engine._nodes.values():
        if not node.is_hub:
            nodes.append(asdict(node))

    routes = []
    processed_routes = set()
    for u, edges in engine._adj.items():
        for edge in edges:
            route_key = tuple(sorted([u, edge.to_node]) + [edge.mode])
            if route_key not in processed_routes:
                routes.append({"fromId": u, "toId": edge.to_node, "mode": edge.mode, "distance": edge.distance})
                processed_routes.add(route_key)

    return {"nodes": nodes, "routes": routes}


class AnalysisRequest(BaseModel):
    nodes: List[Any]
    routes: List[Any]
    params: Dict[str, Any]
    historySummary: Optional[Dict[str, Any]] = None
    industryConfig: Optional[Dict[str, Any]] = None


# Fields kept per node for AI analysis — drops UI-only and redundant fields
NODE_ANALYSIS_FIELDS = {
    "id", "name", "type", "status",
    "inventoryLevel", "maxCapacity", "reorderPoint", "safetyStock",
    "holdingCost", "obsolescenceRate", "shelfLife",
    "supplierLeadTime", "supplierReliability", "supplierCostPerUnit",
    "yieldRate", "throughputCapacity", "automationLevel",
    "demandVolume", "demandVariability", "priceElasticity",
}

# Fields kept per route for AI analysis
ROUTE_ANALYSIS_FIELDS = {
    "fromId", "toId", "mode", "distance", "baseLeadTime",
    "leadTimeVariability", "costPerUnitDistance", "vehicleCapacity",
    "customsTime", "disruptionProb",
}

# Params that are zero/false by default and boring when unchanged
PARAM_SKIP_IF_ZERO_OR_FALSE = {
    "naturalDisasterProb", "laborStrikeProb", "cyberRisk", "qualityRecallProb",
    "demandShockProb", "pandemicFactor", "demandSurge", "subsidyLevel",
    "interestRateChange", "tariffImposition", "weatherEvent",
    "geopoliticalTension", "postponementEnabled", "inventoryPooling",
    "nearshoring", "dynamicPricing", "logisticDisruption",
}


def _compact_nodes(nodes: List[Any]) -> List[Dict]:
    result = []
    for n in nodes:
        if isinstance(n, dict):
            result.append({k: v for k, v in n.items() if k in NODE_ANALYSIS_FIELDS})
    return result


def _compact_routes(routes: List[Any]) -> List[Dict]:
    result = []
    for r in routes:
        if isinstance(r, dict):
            result.append({k: v for k, v in r.items() if k in ROUTE_ANALYSIS_FIELDS})
    return result


def _compact_params(params: Dict[str, Any]) -> Dict[str, Any]:
    result = {}
    for k, v in params.items():
        if k in PARAM_SKIP_IF_ZERO_OR_FALSE:
            # Only include if non-zero / true
            if v:
                result[k] = v
        else:
            result[k] = v
    return result


@app.post("/api/analyze")
async def analyze_supply_chain(req: AnalysisRequest):
    """Runs AI-powered supply chain analysis via Gemini. API key is kept server-side."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI analysis not configured. Set GEMINI_API_KEY environment variable.")

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        # Compact the payload to reduce token usage
        compact_nodes = _compact_nodes(req.nodes)
        compact_routes = _compact_routes(req.routes)
        compact_params = _compact_params(req.params)

        industry_name = (req.industryConfig or {}).get("name", "General")
        history_block = ""
        if req.historySummary:
            h = req.historySummary
            history_block = f"""
Simulation History ({h.get('totalDays', 0)} days):
- Stockout events: {h.get('stockoutCount', 0)}
- Avg inventory utilization: {h.get('avgInventoryUtilization', 0)}%
- Most critical nodes: {json.dumps(h.get('worstNodeId', {}))}
"""

        prompt = f"""You are a supply chain digital-twin AI for a {industry_name} network.
Analyze the network and return strategic insights.
{history_block}
Nodes ({len(compact_nodes)}): {json.dumps(compact_nodes)}
Routes ({len(compact_routes)}): {json.dumps(compact_routes)}
Active params: {json.dumps(compact_params)}

Analyze:
- Inventory: reorder points, safety stock, holding cost, shelf life, obsolescence risk
- Suppliers: lead time variability, reliability %, disruption probability, recovery time
- Production: capacity utilization, yield rates, throughput vs demand
- Logistics: route costs, lead times, disruption exposure, modal mix
- Market: demand variability, price elasticity, demand surges

Return JSON with exactly:
{{
  "narrative": "string",
  "kpiImpact": {{
    "landedCostChange": number,
    "otifChange": number,
    "carbonFootprintChange": number,
    "inventoryRisk": "Low"|"Medium"|"High",
    "financialRisk": number,
    "operationalRisk": number
  }},
  "recommendations": ["3-5 strings"],
  "qualitativeRisk": "string",
  "quantitativeRiskScore": number
}}"""

        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text)

    except Exception as e:
        print(f"Gemini analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
