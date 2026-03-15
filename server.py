import uvicorn
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import re

# Import our optimized engine
from supply_chain_engine import TransitNetwork, seed_prototype_data

app = FastAPI(
    title="Supply Chain Routing API",
    description="Secure, high-performance logistics routing engine.",
    version="1.0.0"
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

class RouteCreate(BaseModel):
    u: str
    v: str
    mode: str

@app.post("/api/nodes")
async def add_node(node: NodeCreate):
    engine.add_node(node.id, node.name, node.lat, node.lon, node.type)
    return {"status": "success"}

@app.post("/api/routes")
async def add_route(route: RouteCreate):
    engine.add_route(route.u, route.v, route.mode)
    return {"status": "success"}

@app.get("/api/route", response_model=RouteResponse)
async def get_shortest_path(
    start: str = Query(..., min_length=2, max_length=50),
    end: str = Query(..., min_length=2, max_length=50),
    mode: str = Query(..., pattern="^(Air|Sea)$")
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

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
