import math
import heapq
import json
import os
from typing import Dict, List, Optional, Tuple, NamedTuple
from dataclasses import dataclass, asdict

@dataclass(frozen=True)
class Node:
    id: str
    name: str
    lat: float
    lon: float
    type: str
    stay_time_hours: float
    is_hub: bool = False
    metadata: Dict = None

class Edge(NamedTuple):
    to_node: str
    distance: float
    mode: str

class TransitNetwork:
    def __init__(self, state_file: str = "network_state.json") -> None:
        self._adj: Dict[str, List[Edge]] = {}
        self._nodes: Dict[str, Node] = {}
        self._EARTH_RADIUS_KM = 6371.0
        self.SPEEDS = {"Air": 850.0, "Sea": 40.0}
        self.state_file = state_file

    def save_state(self) -> None:
        """Persists the current network topology to disk."""
        data = {
            "nodes": [asdict(n) for n in self._nodes.values()],
            "routes": []
        }
        # Serialize the adjacency list into a list of routes
        processed_routes = set()
        for u, edges in self._adj.items():
            for edge in edges:
                route_key = tuple(sorted([u, edge.to_node]) + [edge.mode])
                if route_key not in processed_routes:
                    data["routes"].append({"u": u, "v": edge.to_node, "mode": edge.mode})
                    processed_routes.add(route_key)
        
        with open(self.state_file, 'w') as f:
            json.dump(data, f, indent=2)

    def load_state(self) -> None:
        """Loads the network topology from disk if it exists."""
        if not os.path.exists(self.state_file):
            return
        try:
            with open(self.state_file, 'r') as f:
                data = json.load(f)
                # Clear current state before loading
                self._nodes = {}
                self._adj = {}
                for n in data.get("nodes", []):
                    self.add_node(
                        n["id"], n["name"], n["lat"], n["lon"], n["type"], 
                        is_hub=n.get("is_hub", False), metadata=n.get("metadata"), persist=False
                    )
                for r in data.get("routes", []):
                    self.add_route(r["u"], r["v"], r["mode"], persist=False)
        except Exception as e:
            print(f"Load Error: {e}")

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi, dlambda = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
        a = (math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2)
        return self._EARTH_RADIUS_KM * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

    def add_node(self, node_id: str, name: str, lat: float, lon: float, node_type: str, is_hub: bool = False, metadata: Dict = None, persist: bool = True) -> None:
        clean_id = str(node_id).strip().upper()
        stay_time = 48.0 if node_type == "Sea" else 6.0
        self._nodes[clean_id] = Node(
            id=clean_id, name=name, lat=lat, lon=lon, 
            type=node_type, stay_time_hours=stay_time, is_hub=is_hub, metadata=metadata or {}
        )
        if clean_id not in self._adj: self._adj[clean_id] = []
        if persist: self.save_state()

    def add_route(self, u: str, v: str, mode: str, persist: bool = True) -> None:
        u, v = u.upper(), v.upper()
        if u in self._nodes and v in self._nodes:
            dist = self._haversine(self._nodes[u].lat, self._nodes[u].lon, self._nodes[v].lat, self._nodes[v].lon)
            self._adj[u].append(Edge(v, dist, mode))
            self._adj[v].append(Edge(u, dist, mode))
            if persist: self.save_state()

    def get_nearby_hubs(self, lat: float, lon: float, limit: int = 5) -> List[Dict]:
        nearby = []
        for node in self._nodes.values():
            if not node.is_hub: continue
            dist = self._haversine(lat, lon, node.lat, node.lon)
            nearby.append({"id": node.id, "name": node.name, "type": node.type, "lat": node.lat, "lon": node.lon, "dist": round(dist, 1)})
        return sorted(nearby, key=lambda x: x["dist"])[:limit]


    def _find_node(self, query: str) -> Optional[str]:
        query = query.upper().strip()
        if query in self._nodes: return query
        for k, v in self._nodes.items():
            if query in k or query in v.name.upper(): return k
        return None

    def find_nearest_hub_by_type(self, query: str, mode: str) -> Optional[str]:
        target_id = self._find_node(query)
        if not target_id: return None
        target_node = self._nodes[target_id]
        if target_node.type == mode: return target_id
        nearby = self.get_nearby_hubs(target_node.lat, target_node.lon, limit=50)
        for hub in nearby:
            if hub["type"] == mode: return hub["id"]
        return None

    def find_shortest_path(self, start_id: str, end_id: str, mode: str) -> Tuple[List[str], float, float]:
        u_id = self.find_nearest_hub_by_type(start_id, mode)
        v_id = self.find_nearest_hub_by_type(end_id, mode)
        if not u_id or not v_id: return [], -1.0, -1.0
        times, distances = {node: float('inf') for node in self._nodes}, {node: 0.0 for node in self._nodes}
        times[u_id], predecessors, pq = 0.0, {node: None for node in self._nodes}, [(0.0, u_id)]
        while pq:
            curr_time, u = heapq.heappop(pq)
            if curr_time > times[u]: continue
            if u == v_id: break
            for edge in self._adj.get(u, []):
                if edge.mode == mode:
                    t = curr_time + (edge.distance / self.SPEEDS[mode]) + (self._nodes[edge.to_node].stay_time_hours if edge.to_node != v_id else 0)
                    if t < times[edge.to_node]:
                        times[edge.to_node], distances[edge.to_node], predecessors[edge.to_node] = t, distances[u] + edge.distance, u
                        heapq.heappush(pq, (t, edge.to_node))
        path, curr = [], v_id
        if times[v_id] == float('inf'): return [], -1.0, -1.0
        while curr: path.append(curr); curr = predecessors[curr]
        return path[::-1], round(distances[v_id], 2), round(times[v_id] / 24, 2)

    def auto_mesh_network(self) -> None:
        """Automatic meshing is disabled to allow for manual routing only."""
        pass

def seed_default_scenario(network: TransitNetwork) -> None:
    """Injects the Global Solar Supply Chain scenario with unique node data."""
    # Nodes: (ID, Name, Lat, Lon, Type, Metadata)
    solar_nodes = [
        ("BAOTOU_SILICON", "Baotou Silicon", 40.65, 109.84, "Air", {
            "node_type": "SUPPLIER", "inventory": 15000, "capacity": 20000, "lead_time": 5, "reliability": 98, "cost": 45
        }),
        ("SHANGHAI_CELL", "Shanghai Cell Mfg", 31.23, 121.47, "Air", {
            "node_type": "FACTORY", "inventory": 5000, "capacity": 10000, "yield_rate": 96, "setup_time": 12, "batch_size": 500
        }),
        ("HAIPHONG_ASSY", "Haiphong Assembly", 20.84, 106.68, "Sea", {
            "node_type": "FACTORY", "inventory": 2000, "capacity": 8000, "yield_rate": 99, "setup_time": 8, "batch_size": 1000
        }),
        ("SINGAPORE_DC", "Singapore Nexus", 1.35, 103.82, "Sea", {
            "node_type": "DISTRIBUTION_CENTER", "inventory": 8000, "capacity": 25000, "throughput": 5000, "automation": 4
        }),
        ("ROTTERDAM_WH", "Rotterdam Gateway", 51.92, 4.48, "Sea", {
            "node_type": "WAREHOUSE", "inventory": 12000, "capacity": 30000, "throughput": 3000, "automation": 3
        }),
        ("BERLIN_RETAIL", "Berlin Solar Store", 52.52, 13.40, "Air", {
            "node_type": "RETAIL", "inventory": 500, "capacity": 1000, "demand": 200, "variability": 15, "elasticity": -1.5
        }),
        ("LONDON_RETAIL", "London Eco Hub", 51.50, -0.12, "Sea", {
            "node_type": "RETAIL", "inventory": 300, "capacity": 800, "demand": 150, "variability": 25, "elasticity": -1.2
        }),
    ]
    for id, name, lat, lon, t, meta in solar_nodes:
        network.add_node(id, name, lat, lon, t, is_hub=False, metadata=meta, persist=False)
    
    # Routes: (U, V, Mode)
    solar_routes = [
        ("BAOTOU_SILICON", "SHANGHAI_CELL", "Air"),
        ("SHANGHAI_CELL", "HAIPHONG_ASSY", "Sea"),
        ("HAIPHONG_ASSY", "SINGAPORE_DC", "Sea"),
        ("SINGAPORE_DC", "ROTTERDAM_WH", "Sea"),
        ("ROTTERDAM_WH", "BERLIN_RETAIL", "Air"),
        ("ROTTERDAM_WH", "LONDON_RETAIL", "Sea"),
    ]
    for u, v, m in solar_routes:
        network.add_route(u, v, m, persist=False)
    
    network.save_state()

_GLOBAL_HUB_ATLAS = [
    # Air hubs
    ("DXB",  "Dubai Int'l Airport",       25.25,  55.36, "Air"),
    ("SIN",  "Singapore Changi Airport",   1.36,  103.99, "Air"),
    ("HKG",  "Hong Kong Int'l Airport",   22.31,  113.91, "Air"),
    ("PVG",  "Shanghai Pudong Airport",   31.14,  121.80, "Air"),
    ("LHR",  "London Heathrow Airport",   51.48,   -0.46, "Air"),
    ("FRA",  "Frankfurt Airport",         50.03,    8.57, "Air"),
    ("AMS",  "Amsterdam Schiphol",        52.31,    4.76, "Air"),
    ("JFK",  "New York JFK Airport",      40.64,  -73.78, "Air"),
    ("LAX",  "Los Angeles Airport",       33.94, -118.40, "Air"),
    ("NRT",  "Tokyo Narita Airport",      35.76,  140.39, "Air"),
    ("ICN",  "Seoul Incheon Airport",     37.46,  126.44, "Air"),
    ("ORD",  "Chicago O'Hare Airport",    41.97,  -87.91, "Air"),
    # Sea hubs
    ("CNSHA", "Port of Shanghai",         31.38,  121.62, "Sea"),
    ("SGSIN", "Port of Singapore",         1.27,  103.82, "Sea"),
    ("NLRTM", "Port of Rotterdam",        51.94,    4.06, "Sea"),
    ("CNSZX", "Port of Shenzhen",         22.53,  113.93, "Sea"),
    ("KRPUS", "Port of Busan",            35.10,  129.04, "Sea"),
    ("AEDXB", "Port of Jebel Ali",        24.98,   55.06, "Sea"),
    ("USLA",  "Port of Los Angeles",      33.73, -118.26, "Sea"),
    ("DEHAM", "Port of Hamburg",          53.54,    9.97, "Sea"),
    ("CNNGB", "Port of Ningbo",           29.87,  121.55, "Sea"),
    ("MYPKG", "Port Klang Malaysia",       3.00,  101.39, "Sea"),
]

def seed_hub_atlas(network: TransitNetwork) -> None:
    """Seeds the global logistics hub atlas. Hubs are marked is_hub=True
    so get_nearby_hubs() can surface them as suggestions without cluttering
    the user's simulation node list."""
    for hub_id, name, lat, lon, hub_type in _GLOBAL_HUB_ATLAS:
        if hub_id not in network._nodes:
            network.add_node(hub_id, name, lat, lon, hub_type, is_hub=True, persist=False)

def seed_prototype_data(network: TransitNetwork) -> None:
    # 1. Saved simulation state (user nodes/routes)
    state_exists = os.path.exists(network.state_file)
    if state_exists:
        network.load_state()

    # 2. Seed default scenario if state is new/empty
    if not state_exists or len(network._nodes) == 0:
        seed_default_scenario(network)

    # 3. Always seed the hub atlas so nearby-hub suggestions work
    seed_hub_atlas(network)

    # 4. Finalize
    network.auto_mesh_network()

