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


@app.post("/api/analyze")
async def analyze_supply_chain(req: AnalysisRequest):
    """Runs AI-powered supply chain analysis via Gemini. API key is kept server-side."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI analysis not configured. Set GEMINI_API_KEY environment variable.")

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        prompt = f"""Act as an advanced Digital Twin Simulation Engine for supply chain analysis.
Analyze the provided supply chain network using the following data:

Nodes: {json.dumps(req.nodes)}
Routes: {json.dumps(req.routes)}
Global Parameters: {json.dumps(req.params)}

In your analysis, consider:
- Inventory Policy: Reorder points, safety stock, holding costs, shelf life, and obsolescence risk.
- Supplier Reliability: Lead time variability, reliability %, disruption probabilities, and recovery time.
- Production Efficiency: Capacity utilization, yield rates, defect rates, and setup constraints.
- Warehouse Performance: Throughput capacity, automation level, and labor availability.
- Market Dynamics: Demand seasonality, variability, price elasticity, and customer lead time tolerance.

Return a JSON object with exactly these fields:
{{
  "narrative": "string - detailed analysis",
  "kpiImpact": {{
    "landedCostChange": number,
    "otifChange": number,
    "carbonFootprintChange": number,
    "inventoryRisk": "Low" | "Medium" | "High",
    "financialRisk": number (0-100),
    "operationalRisk": number (0-100)
  }},
  "recommendations": ["string array of 3-5 recommendations"],
  "qualitativeRisk": "string",
  "quantitativeRiskScore": number (0-100)
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
