import os
import json
import uvicorn
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
from models import Base, User, UserNetwork, SimulationRun
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

# Auto-migrate: add any missing columns to existing tables (safe, idempotent)
from sqlalchemy import inspect as _sa_inspect, text as _sa_text
def _auto_migrate():
    """Add missing columns to existing tables without dropping data."""
    _insp = _sa_inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not _insp.has_table(table.name):
                continue
            existing = {c["name"] for c in _insp.get_columns(table.name)}
            for col in table.columns:
                if col.name not in existing:
                    col_type = col.type.compile(dialect=engine.dialect)
                    sql = f'ALTER TABLE {table.name} ADD COLUMN "{col.name}" {col_type}'
                    print(f"[migrate] {sql}")
                    conn.execute(_sa_text(sql))
try:
    _auto_migrate()
except Exception as e:
    print(f"[migrate] warning: {e}")

ALLOWED_ORIGINS = [
    o.strip() for o in
    os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
]
print(f"[CORS] Allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
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
    industryName: Optional[str] = None       # preferred — just the name string
    industryConfig: Optional[Dict[str, Any]] = None  # legacy fallback


# Columnar node format — (field_name, abbreviation). Drops UI/runtime-only fields.
_NODE_COLS = [
    ("id", "id"), ("name", "name"), ("type", "type"), ("status", "st"),
    ("inventoryLevel", "inv"), ("maxCapacity", "cap"), ("reorderPoint", "rop"),
    ("safetyStock", "ss"), ("holdingCost", "hc"),
    ("supplierLeadTime", "slt"), ("supplierReliability", "srel"), ("supplierCostPerUnit", "scost"),
    ("yieldRate", "yr"), ("throughputCapacity", "tcp"),
    ("demandVolume", "dv"), ("demandVariability", "dvar"), ("priceElasticity", "pe"),
]
_NODE_HDR = ",".join(a for _, a in _NODE_COLS)

# Columnar route format — (field_name, abbreviation)
_ROUTE_COLS = [
    ("fromId", "from"), ("toId", "to"), ("mode", "mode"), ("distance", "dist"),
    ("baseLeadTime", "lt"), ("leadTimeVariability", "ltv"),
    ("costPerUnitDistance", "cost"), ("vehicleCapacity", "cap"),
    ("customsTime", "cust"), ("disruptionProb", "dp"),
]
_ROUTE_HDR = ",".join(a for _, a in _ROUTE_COLS)

# Params that are zero/false by default and uninteresting when unchanged
PARAM_SKIP_IF_ZERO_OR_FALSE = {
    "naturalDisasterProb", "laborStrikeProb", "cyberRisk", "qualityRecallProb",
    "demandShockProb", "pandemicFactor", "demandSurge", "subsidyLevel",
    "interestRateChange", "tariffImposition", "weatherEvent",
    "geopoliticalTension", "postponementEnabled", "inventoryPooling",
    "nearshoring", "dynamicPricing", "logisticDisruption",
    "seasonalityAmplitude", "tariffRate",
}


def _compact_nodes(nodes: List[Any]) -> tuple:
    """Returns (csv_string, row_count) — one header row + one row per node."""
    rows = []
    for n in nodes:
        if not isinstance(n, dict):
            continue
        row = [str(n.get(f, "") if n.get(f) is not None else "") for f, _ in _NODE_COLS]
        rows.append(",".join(row))
    csv = (_NODE_HDR + "\n" + "\n".join(rows)) if rows else _NODE_HDR
    return csv, len(rows)


def _compact_routes(routes: List[Any]) -> tuple:
    """Returns (csv_string, row_count) — one header row + one row per route."""
    rows = []
    for r in routes:
        if not isinstance(r, dict):
            continue
        row = [str(r.get(f, "") if r.get(f) is not None else "") for f, _ in _ROUTE_COLS]
        rows.append(",".join(row))
    csv = (_ROUTE_HDR + "\n" + "\n".join(rows)) if rows else _ROUTE_HDR
    return csv, len(rows)


def _compact_params(params: Dict[str, Any]) -> Dict[str, Any]:
    result = {}
    for k, v in params.items():
        if k == "commodityPriceChanges":
            # Only include commodities with non-zero price changes
            if isinstance(v, dict):
                nonzero = {ck: cv for ck, cv in v.items() if cv}
                if nonzero:
                    result[k] = nonzero
            continue
        if k in PARAM_SKIP_IF_ZERO_OR_FALSE:
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
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="google-generativeai package is not installed. Run: pip install google-generativeai"
        )

    try:
        genai.configure(api_key=api_key)

        # Compact the payload to reduce token usage
        node_csv, node_count = _compact_nodes(req.nodes)
        route_csv, route_count = _compact_routes(req.routes)
        compact_params = _compact_params(req.params)

        # industryName preferred; fall back to legacy industryConfig.name
        industry_name = req.industryName or (req.industryConfig or {}).get("name", "General")

        history_block = ""
        if req.historySummary:
            h = req.historySummary
            history_block = (
                f"\nHistory ({h.get('totalDays',0)}d): "
                f"stockouts={h.get('stockoutCount',0)}, "
                f"avg_inv_util={h.get('avgInventoryUtilization',0)}%, "
                f"critical={json.dumps(h.get('worstNodeId',{}))}\n"
            )

        prompt = f"""Supply chain digital-twin AI — {industry_name} network.{history_block}
Nodes ({node_count}) [id,name,type,st,inv,cap,rop,ss,hc,slt,srel,scost,yr,tcp,dv,dvar,pe]:
{node_csv}
Routes ({route_count}) [from,to,mode,dist,lt,ltv,cost,cap,cust,dp]:
{route_csv}
Params: {json.dumps(compact_params)}

Return JSON:
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

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text)

    except Exception as e:
        print(f"Gemini analysis error: {e}")
        err_str = str(e)
        if "429" in err_str or "quota" in err_str.lower():
            raise HTTPException(status_code=429, detail="Gemini API quota exceeded. Your free-tier daily limit has been reached. Wait for it to reset or enable billing at https://ai.google.dev/gemini-api/docs/rate-limits")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {err_str}")


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


# ─────────────────────────────────────────────
#  SIMULATION HISTORY ENDPOINTS
# ─────────────────────────────────────────────

import gzip as _gzip

class SimRunSaveRequest(BaseModel):
    name: str
    description: Optional[str] = None
    network_id: Optional[str] = None
    nodes_snapshot: List[Any]
    routes_snapshot: List[Any]
    params_snapshot: Dict[str, Any]
    industry_config: Optional[Dict[str, Any]] = None
    bom_snapshot: Optional[Dict[str, Any]] = None  # BOM at time of run
    history: Optional[List[Dict[str, Any]]] = None
    history_gz_b64: Optional[str] = None  # gzip-compressed, base64-encoded history
    tags: Optional[List[str]] = None


class SimRunUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


def _compute_run_summary(history: List[Dict]) -> Dict:
    """Extract denormalized KPI summary from history snapshots."""
    total_days = len(history)
    total_revenue = sum(h.get("revenue", 0) or 0 for h in history)
    total_cogs = sum(h.get("cogs", 0) or 0 for h in history)
    # Operating costs (non-COGS overhead — production/transport/tariff are already in COGS via accumulatedUnitCost)
    total_operating = sum(
        (h.get("holdingCost", 0) or 0)
        + (h.get("stockoutCost", 0) or 0)
        + (h.get("warehousingCost", 0) or 0)
        + (h.get("workingCapitalCost", 0) or 0)
        + (h.get("expeditingCost", 0) or 0)
        for h in history
    )
    # Total cost includes all categories (for breakdown display)
    total_cost = sum(
        (h.get("holdingCost", 0) or 0)
        + (h.get("stockoutCost", 0) or 0)
        + (h.get("transportCost", 0) or 0)
        + (h.get("productionCost", 0) or 0)
        + (h.get("warehousingCost", 0) or 0)
        + (h.get("tariffCost", 0) or 0)
        + (h.get("expeditingCost", 0) or 0)
        for h in history
    )
    demand_total = sum(h.get("demandTotal", 0) or 0 for h in history)
    demand_fulfilled = sum(h.get("demandFulfilled", 0) or 0 for h in history)
    avg_fill_rate = (demand_fulfilled / demand_total * 100) if demand_total > 0 else 0
    total_disruptions = sum(
        sum((h.get("disruptionCounts") or {}).values())
        for h in history
    )
    total_carbon = sum(h.get("carbonEmissions", 0) or 0 for h in history)
    return {
        "total_days": total_days,
        "total_revenue": round(total_revenue, 2),
        "total_cogs": round(total_cogs, 2),
        "total_cost": round(total_cost, 2),
        "total_operating_cost": round(total_operating, 2),
        "avg_fill_rate": round(avg_fill_rate, 2),
        "total_disruptions": total_disruptions,
        "total_carbon_kg": round(total_carbon, 2),
    }


@app.post("/api/simulation-runs")
def save_simulation_run(
    req: SimRunSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a completed simulation run with gzip-compressed history."""
    import base64

    # Accept either pre-compressed base64 (from production) or raw history (legacy/local)
    if req.history_gz_b64:
        try:
            compressed = base64.b64decode(req.history_gz_b64)
            raw_json = _gzip.decompress(compressed)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid compressed history data.")
        if len(raw_json) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="History data too large (>10 MB).")
        history = json.loads(raw_json.decode("utf-8"))
    elif req.history:
        raw_json = json.dumps(req.history).encode("utf-8")
        if len(raw_json) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="History data too large (>10 MB).")
        compressed = _gzip.compress(raw_json, compresslevel=6)
        history = req.history
    else:
        raise HTTPException(status_code=400, detail="No history data provided.")

    summary = _compute_run_summary(history)

    run = SimulationRun(
        owner_id=current_user.id,
        network_id=req.network_id,
        name=req.name,
        description=req.description,
        nodes_snapshot=req.nodes_snapshot,
        routes_snapshot=req.routes_snapshot,
        params_snapshot=req.params_snapshot,
        industry_config=req.industry_config,
        bom_snapshot=req.bom_snapshot,
        history_data=compressed,
        total_days=summary["total_days"],
        total_revenue=summary["total_revenue"],
        total_cogs=summary["total_cogs"],
        total_cost=summary["total_cost"],
        total_operating_cost=summary["total_operating_cost"],
        avg_fill_rate=summary["avg_fill_rate"],
        total_disruptions=summary["total_disruptions"],
        total_carbon_kg=summary["total_carbon_kg"],
        tags=req.tags or [],
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return {"id": run.id, "name": run.name}


@app.get("/api/simulation-runs")
def list_simulation_runs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all simulation runs for the current user (summaries only, no history)."""
    runs = (
        db.query(SimulationRun)
        .filter(SimulationRun.owner_id == current_user.id)
        .order_by(SimulationRun.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "total_days": r.total_days,
            "total_revenue": r.total_revenue,
            "total_cogs": r.total_cogs,
            "total_cost": r.total_cost,
            "total_operating_cost": r.total_operating_cost,
            "avg_fill_rate": r.avg_fill_rate,
            "total_disruptions": r.total_disruptions,
            "total_carbon_kg": r.total_carbon_kg,
            "tags": r.tags or [],
            "is_shared": r.is_shared,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "node_count": len(r.nodes_snapshot or []),
            "route_count": len(r.routes_snapshot or []),
        }
        for r in runs
    ]


@app.get("/api/simulation-runs/{run_id}")
def load_simulation_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Load a full simulation run including decompressed history."""
    run = db.query(SimulationRun).filter(
        SimulationRun.id == run_id,
        SimulationRun.owner_id == current_user.id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Simulation run not found.")

    history = json.loads(_gzip.decompress(run.history_data).decode("utf-8"))
    return {
        "id": run.id,
        "name": run.name,
        "description": run.description,
        "nodes_snapshot": run.nodes_snapshot,
        "routes_snapshot": run.routes_snapshot,
        "params_snapshot": run.params_snapshot,
        "industry_config": run.industry_config,
        "bom_snapshot": run.bom_snapshot,
        "history": history,
        "tags": run.tags or [],
        "is_shared": run.is_shared,
        "share_token": run.share_token,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "total_days": run.total_days,
        "total_revenue": run.total_revenue,
        "total_cogs": run.total_cogs,
        "total_cost": run.total_cost,
        "total_operating_cost": run.total_operating_cost,
        "avg_fill_rate": run.avg_fill_rate,
        "total_disruptions": run.total_disruptions,
        "total_carbon_kg": run.total_carbon_kg,
    }


@app.patch("/api/simulation-runs/{run_id}")
def update_simulation_run(
    run_id: str,
    req: SimRunUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update name, description, or tags of a simulation run."""
    run = db.query(SimulationRun).filter(
        SimulationRun.id == run_id,
        SimulationRun.owner_id == current_user.id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Simulation run not found.")

    if req.name is not None:
        run.name = req.name
    if req.description is not None:
        run.description = req.description
    if req.tags is not None:
        run.tags = req.tags
    db.commit()
    return {"id": run.id, "name": run.name}


@app.delete("/api/simulation-runs/{run_id}")
def delete_simulation_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a simulation run."""
    run = db.query(SimulationRun).filter(
        SimulationRun.id == run_id,
        SimulationRun.owner_id == current_user.id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Simulation run not found.")
    db.delete(run)
    db.commit()
    return {"status": "deleted"}


@app.post("/api/simulation-runs/{run_id}/share")
def toggle_share_simulation_run(
    run_id: str,
    body: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enable or disable public sharing for a simulation run."""
    run = db.query(SimulationRun).filter(
        SimulationRun.id == run_id,
        SimulationRun.owner_id == current_user.id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Simulation run not found.")

    enabled = body.get("enabled", False)
    if enabled:
        if not run.share_token:
            import uuid as _uuid
            run.share_token = str(_uuid.uuid4())
        run.is_shared = True
    else:
        run.is_shared = False
        run.share_token = None
    db.commit()
    return {
        "is_shared": run.is_shared,
        "share_token": run.share_token,
    }


@app.get("/api/shared/runs/{share_token}")
def load_shared_run(share_token: str, db: Session = Depends(get_db)):
    """Public endpoint — load a shared simulation run (no auth required)."""
    run = db.query(SimulationRun).filter(
        SimulationRun.share_token == share_token,
        SimulationRun.is_shared == True,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Shared run not found or sharing disabled.")

    history = json.loads(_gzip.decompress(run.history_data).decode("utf-8"))
    return {
        "id": run.id,
        "name": run.name,
        "description": run.description,
        "nodes_snapshot": run.nodes_snapshot,
        "routes_snapshot": run.routes_snapshot,
        "params_snapshot": run.params_snapshot,
        "industry_config": run.industry_config,
        "history": history,
        "tags": run.tags or [],
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "total_days": run.total_days,
        "total_revenue": run.total_revenue,
        "total_cogs": run.total_cogs,
        "total_cost": run.total_cost,
        "total_operating_cost": run.total_operating_cost,
        "avg_fill_rate": run.avg_fill_rate,
        "total_disruptions": run.total_disruptions,
        "total_carbon_kg": run.total_carbon_kg,
    }


@app.post("/api/simulation-runs/compare")
def compare_simulation_runs(
    body: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compare summaries of up to 5 simulation runs side by side."""
    run_ids = body.get("run_ids", [])
    if not run_ids or len(run_ids) > 5:
        raise HTTPException(status_code=400, detail="Provide 1-5 run IDs.")

    runs = (
        db.query(SimulationRun)
        .filter(SimulationRun.id.in_(run_ids), SimulationRun.owner_id == current_user.id)
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name,
            "total_days": r.total_days,
            "total_revenue": r.total_revenue,
            "total_cogs": r.total_cogs,
            "total_cost": r.total_cost,
            "total_operating_cost": r.total_operating_cost,
            "avg_fill_rate": r.avg_fill_rate,
            "total_disruptions": r.total_disruptions,
            "total_carbon_kg": r.total_carbon_kg,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in runs
    ]


# ─────────────────────────────────────────────
#  FILE IMPORT ENDPOINT (Excel / PDF)
# ─────────────────────────────────────────────

import tempfile
from importer.import_supply_chain import import_file as _import_file


@app.post("/api/networks/import")
async def import_network_file(file: UploadFile = File(...)):
    """
    Upload an .xlsx or .pdf file and get back parsed nodes, routes, commodities.
    No auth required — the data is returned to the client which then sets it in state.
    """
    allowed_ext = (".xlsx", ".xls", ".pdf")
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(allowed_ext)}",
        )

    # Write to temp file
    suffix = ext
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        result = _import_file(tmp_path)
    finally:
        os.unlink(tmp_path)

    if result["errors"]:
        return {
            "status": "error",
            "errors": result["errors"],
            "warnings": result["warnings"],
            "summary": result["summary"],
            "nodes": [],
            "routes": [],
            "commodities": [],
        }

    return {
        "status": "success",
        "nodes": result["nodes"],
        "routes": result["routes"],
        "commodities": result["commodities"],
        "warnings": result["warnings"],
        "summary": result["summary"],
    }


from fastapi.responses import StreamingResponse
import io


@app.get("/api/networks/import/template")
def download_import_template():
    """
    Generate a blank Excel template with separate sheets per node type.
    Each sheet only shows the columns relevant to that type — no chance of
    filling the wrong fields.
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = openpyxl.Workbook()
    hdr_font = Font(bold=True, color="FFFFFF", size=11)
    min_fill = PatternFill(start_color="D32F2F", end_color="D32F2F", fill_type="solid")
    opt_fill = PatternFill(start_color="2B579A", end_color="2B579A", fill_type="solid")
    type_fill = PatternFill(start_color="1B5E20", end_color="1B5E20", fill_type="solid")
    border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin"),
    )

    def _write_headers(ws, headers, minimum_cols, type_specific_start=None):
        for c, h in enumerate(headers, 1):
            cell = ws.cell(row=1, column=c, value=h)
            cell.font = hdr_font
            cell.border = border
            cell.alignment = Alignment(horizontal="center", wrap_text=True)
            if h in minimum_cols:
                cell.fill = min_fill
            elif type_specific_start and c >= type_specific_start:
                cell.fill = type_fill
            else:
                cell.fill = opt_fill
        # Legend row
        ws.cell(row=2, column=1, value="RED = required").font = Font(italic=True, color="D32F2F", size=9)
        ws.cell(row=2, column=3, value="BLUE = optional (defaults applied)").font = Font(italic=True, color="2B579A", size=9)
        if type_specific_start:
            ws.cell(row=2, column=type_specific_start, value="GREEN = type-specific").font = Font(italic=True, color="1B5E20", size=9)
        # Auto-width
        for c in range(1, len(headers) + 1):
            ws.column_dimensions[get_column_letter(c)].width = max(len(headers[c - 1]) + 4, 14)
        # Freeze header row
        ws.freeze_panes = "A3"

    # ── Common columns for all node types ──
    common_cols = ["name", "location", "lat", "lng",
                   "inventoryLevel", "maxCapacity", "reorderPoint", "orderQuantity",
                   "safetyStock", "holdingCost", "shelfLife",
                   "supplyChainTier", "isFocalCompany", "tierLocked"]
    min_cols = {"name"}

    # ── Per-type specific columns ──
    type_sheets = {
        "Suppliers": {
            "tab_color": "E65100",
            "type_value": "SUPPLIER",
            "specific": ["supplierLeadTime", "supplierLeadTimeVariability",
                         "supplierCapacity", "supplierReliability",
                         "supplierCostPerUnit", "supplierMinOrderQuantity",
                         "supplierDisruptionProb", "supplierRecoveryTime"],
        },
        "Factories": {
            "tab_color": "1565C0",
            "type_value": "FACTORY",
            "specific": ["productionCapacity", "yieldRate", "defectRate",
                         "batchSize", "setupTime", "setupCost",
                         "cycleTime", "reworkRate", "schedulingRule",
                         "overtimeCapacity"],
        },
        "Warehouses": {
            "tab_color": "2E7D32",
            "type_value": "WAREHOUSE",
            "specific": ["storageCapacity", "throughputCapacity",
                         "pickingRate", "packingRate", "handlingCost",
                         "laborAvailability", "crossDocking",
                         "processingTime", "automationLevel",
                         "fulfillmentAccuracy"],
        },
        "Distribution Centers": {
            "tab_color": "6A1B9A",
            "type_value": "DISTRIBUTION_CENTER",
            "specific": ["storageCapacity", "throughputCapacity",
                         "pickingRate", "packingRate", "handlingCost",
                         "laborAvailability", "crossDocking",
                         "processingTime", "automationLevel",
                         "fulfillmentAccuracy"],
        },
        "Retail": {
            "tab_color": "C62828",
            "type_value": "RETAIL",
            "specific": ["demandVolume", "demandVariability",
                         "demandSeasonality", "demandGrowthRate",
                         "orderFrequency", "leadTimeTolerance",
                         "backorderRate", "priceElasticity"],
        },
    }

    # Create one sheet per node type
    first = True
    for sheet_name, cfg in type_sheets.items():
        if first:
            ws = wb.active
            ws.title = sheet_name
            first = False
        else:
            ws = wb.create_sheet(sheet_name)
        ws.sheet_properties.tabColor = cfg["tab_color"]

        headers = common_cols + cfg["specific"]
        type_specific_start = len(common_cols) + 1
        _write_headers(ws, headers, min_cols, type_specific_start)

        # Pre-fill the 'type' as a note so import script knows the type
        # Actually: we auto-detect type from sheet name in the reader.
        # But also add a small note in row 3 as a hint.
        ws.cell(row=3, column=1, value=f"(Add your {cfg['type_value']} nodes below — type is auto-set from sheet name)").font = Font(
            italic=True, color="888888", size=9
        )

    # ── Routes sheet ──
    ws_routes = wb.create_sheet("Routes")
    ws_routes.sheet_properties.tabColor = "FF8F00"
    _write_headers(ws_routes, [
        "from", "to", "mode",
        "costPerUnitDistance", "baseLeadTime", "leadTimeVariability",
        "vehicleCapacity", "shipmentFrequency", "fuelPrice",
        "customsTime", "disruptionProb",
    ], {"from", "to"})

    # ── Commodities sheet ──
    ws_comm = wb.create_sheet("Commodities")
    _write_headers(ws_comm, ["name", "unit", "basePrice", "color"], {"name", "unit", "basePrice"})

    # ── Instructions sheet ──
    ws_help = wb.create_sheet("Instructions")
    ws_help.sheet_properties.tabColor = "FF6600"
    instructions = [
        ("SUPPLY CHAIN NETWORK IMPORT TEMPLATE", ""),
        ("", ""),
        ("HOW TO USE:", ""),
        ("1.", "Each node type has its own sheet — Suppliers, Factories, Warehouses, Distribution Centers, Retail"),
        ("2.", "Only fill the sheet(s) for the node types you need"),
        ("3.", "Each sheet only shows columns relevant to that type — no wrong fields possible"),
        ("4.", "The node type is auto-detected from the sheet name"),
        ("5.", "Fill in the Routes sheet to connect your nodes"),
        ("6.", "Upload this file using the Import File button in Network Builder"),
        ("", ""),
        ("MINIMUM INPUT:", ""),
        ("Per node:", "Just the 'name' column (location & coords auto-resolved from name)"),
        ("Per route:", "Just 'from' + 'to' columns (mode & distance auto-detected)"),
        ("", ""),
        ("COLUMN COLORS:", ""),
        ("RED", "Required — import fails without these"),
        ("BLUE", "Optional universal fields — defaults applied if blank"),
        ("GREEN", "Optional type-specific fields — defaults applied if blank"),
        ("", ""),
        ("SMART DEFAULTS:", ""),
        ("Missing location/coords:", "Geocoded from node name (e.g. 'Shanghai Factory' -> Shanghai)"),
        ("Missing transport mode:", "Auto-detected from distance & geography"),
        ("Missing distance:", "Calculated via Haversine from coordinates"),
        ("Missing fields:", "UI defaults applied (inventory=50, capacity=100, etc.)"),
        ("", ""),
        ("ROUTE 'from'/'to':", "Must match a node name from any of the node sheets"),
        ("Transport modes:", "Sea, Air, Road, Rail (or leave blank for auto-detection)"),
        ("", ""),
        ("SUPPLY CHAIN TIERS:", ""),
        ("supplyChainTier:", "0=OEM/Focal, 1/2/3+=upstream suppliers, -1/-2/-3=downstream customers (leave blank for auto-detect from routes)"),
        ("isFocalCompany:", "TRUE for the one OEM/manufacturer node (Tier 0). Only one node should be TRUE."),
        ("tierLocked:", "TRUE to lock a manually-set tier and prevent auto-recalculation"),
    ]
    for r, (a, b) in enumerate(instructions, 1):
        ca = ws_help.cell(row=r, column=1, value=a)
        cb = ws_help.cell(row=r, column=2, value=b)
        if r == 1:
            ca.font = Font(bold=True, size=14, color="2B579A")
        elif a.endswith(":"):
            ca.font = Font(bold=True, size=10)
    ws_help.column_dimensions["A"].width = 35
    ws_help.column_dimensions["B"].width = 70

    # Stream the file
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=supply_chain_template.xlsx"},
    )


# ─────────────────────────────────────────────
#  NEWS / ROUTE INTELLIGENCE
# ─────────────────────────────────────────────
from news_fetcher import fetch_supply_chain_news

@app.get("/api/news/fetch")
async def get_supply_chain_news():
    """Fetches supply chain disruption news from Google News RSS."""
    items = fetch_supply_chain_news()
    return {"items": items, "count": len(items)}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
