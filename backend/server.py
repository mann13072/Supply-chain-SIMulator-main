import os
import json
import uvicorn
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from dataclasses import asdict
from sqlalchemy.orm import Session

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv optional; env vars can be set directly

# Auth + DB imports
from database import engine, get_db
from models import Base, User, UserNetwork
from auth import hash_password, verify_password, create_access_token, get_current_user

# Import our optimized engine
from supply_chain_engine import TransitNetwork, seed_prototype_data

app = FastAPI(
    title="Supply Chain Routing API",
    description="Secure, high-performance logistics routing engine.",
    version="1.0.0"
)

# Create DB tables on startup (safe — never drops existing data)
Base.metadata.create_all(bind=engine)

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=True,
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


# ─────────────────────────────────────────────
#  GLOBAL PORTS ATLAS (14K+ UNLOCODE ports)
# ─────────────────────────────────────────────
import math as _math

_PORTS_ATLAS: List[Dict] = []
_atlas_path = os.path.join(os.path.dirname(__file__), "ports_atlas.json")
if os.path.exists(_atlas_path):
    with open(_atlas_path, "r", encoding="utf-8") as _f:
        _PORTS_ATLAS = json.load(_f)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    p1, p2 = _math.radians(lat1), _math.radians(lat2)
    dp, dl = _math.radians(lat2 - lat1), _math.radians(lon2 - lon1)
    a = _math.sin(dp / 2) ** 2 + _math.cos(p1) * _math.cos(p2) * _math.sin(dl / 2) ** 2
    return R * 2 * _math.atan2(_math.sqrt(a), _math.sqrt(1 - a))


@app.get("/api/ports/search")
async def search_ports(
    q: Optional[str] = Query(None, min_length=2, max_length=100, description="Search by name or UNLOCODE"),
    lat: Optional[float] = Query(None, description="Latitude for proximity search"),
    lon: Optional[float] = Query(None, description="Longitude for proximity search"),
    type: Optional[str] = Query(None, pattern="^(sea|air|both)$", description="Filter by port type"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
):
    """Search the 14K+ UNLOCODE port atlas by name or proximity."""
    if not _PORTS_ATLAS:
        raise HTTPException(status_code=503, detail="Port atlas not loaded.")

    results = _PORTS_ATLAS

    # Filter by type
    if type:
        results = [p for p in results if p["type"] == type or p["type"] == "both"]

    # Text search (name or code)
    if q:
        q_lower = q.lower()
        results = [
            p for p in results
            if q_lower in p["name"].lower() or q_lower in p["id"].lower()
        ]
        return results[:limit]

    # Proximity search
    if lat is not None and lon is not None:
        scored = [(p, _haversine_km(lat, lon, p["lat"], p["lon"])) for p in results]
        scored.sort(key=lambda x: x[1])
        return [
            {**p, "distance_km": round(d, 1)}
            for p, d in scored[:limit]
        ]

    # No filters — return first N (alphabetical)
    return results[:limit]


@app.get("/api/ports/stats")
async def port_stats():
    """Returns summary stats of the port atlas."""
    return {
        "total": len(_PORTS_ATLAS),
        "sea": sum(1 for p in _PORTS_ATLAS if p["type"] == "sea"),
        "air": sum(1 for p in _PORTS_ATLAS if p["type"] == "air"),
        "both": sum(1 for p in _PORTS_ATLAS if p["type"] == "both"),
    }


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


# ─────────────────────────────────────────────
#  AUTH ENDPOINTS
# ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


@app.post("/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if db.query(User).filter(User.email == req.email.lower()).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        email=req.email.lower(),
        hashed_password=hash_password(req.password),
        name=req.name or req.email.split("@")[0],
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "name": user.name},
    }


@app.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")

    token = create_access_token(user.id, user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "name": user.name},
    }


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name}


# ─────────────────────────────────────────────
#  USER NETWORK SAVE / LOAD ENDPOINTS
# ─────────────────────────────────────────────

class NetworkSaveRequest(BaseModel):
    name: str
    nodes: List[Any]
    routes: List[Any]
    params: Optional[Dict[str, Any]] = None


class NetworkSummary(BaseModel):
    id: str
    name: str
    node_count: int
    route_count: int
    updated_at: str


@app.get("/api/networks")
def list_networks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    networks = db.query(UserNetwork).filter(UserNetwork.owner_id == current_user.id).all()
    return [
        {
            "id": n.id,
            "name": n.name,
            "node_count": len(n.nodes or []),
            "route_count": len(n.routes or []),
            "updated_at": n.updated_at.isoformat() if n.updated_at else None,
        }
        for n in networks
    ]


@app.post("/api/networks")
def save_network(
    req: NetworkSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    network = UserNetwork(
        owner_id=current_user.id,
        name=req.name,
        nodes=req.nodes,
        routes=req.routes,
        params=req.params or {},
    )
    db.add(network)
    db.commit()
    db.refresh(network)
    return {"id": network.id, "name": network.name}


@app.get("/api/networks/{network_id}")
def load_network(
    network_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    network = db.query(UserNetwork).filter(
        UserNetwork.id == network_id,
        UserNetwork.owner_id == current_user.id,
    ).first()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found.")
    return {
        "id": network.id,
        "name": network.name,
        "nodes": network.nodes,
        "routes": network.routes,
        "params": network.params,
    }


@app.put("/api/networks/{network_id}")
def update_network(
    network_id: str,
    req: NetworkSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    network = db.query(UserNetwork).filter(
        UserNetwork.id == network_id,
        UserNetwork.owner_id == current_user.id,
    ).first()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found.")

    network.name = req.name
    network.nodes = req.nodes
    network.routes = req.routes
    network.params = req.params or {}
    network.updated_at = datetime.utcnow()
    db.commit()
    return {"id": network.id, "name": network.name}


@app.delete("/api/networks/{network_id}")
def delete_network(
    network_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    network = db.query(UserNetwork).filter(
        UserNetwork.id == network_id,
        UserNetwork.owner_id == current_user.id,
    ).first()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found.")
    db.delete(network)
    db.commit()
    return {"status": "deleted"}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
