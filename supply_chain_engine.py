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
                    self.add_node(n["id"], n["name"], n["lat"], n["lon"], n["type"], persist=False)
                for r in data.get("routes", []):
                    self.add_route(r["u"], r["v"], r["mode"], persist=False)
        except Exception as e:
            print(f"Load Error: {e}")

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi, dlambda = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
        a = (math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2)
        return self._EARTH_RADIUS_KM * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

    def add_node(self, node_id: str, name: str, lat: float, lon: float, node_type: str, persist: bool = True) -> None:
        clean_id = str(node_id).strip().upper()
        stay_time = 48.0 if node_type == "Sea" else 6.0
        self._nodes[clean_id] = Node(id=clean_id, name=name, lat=lat, lon=lon, type=node_type, stay_time_hours=stay_time)
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
        nodes = list(self._nodes.values())
        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                u, v = nodes[i], nodes[j]
                if u.type != v.type: continue
                dist = self._haversine(u.lat, u.lon, v.lat, v.lon)
                if (u.type == "Air" and dist <= 12000) or (u.type == "Sea" and dist <= 10000):
                    self.add_route(u.id, v.id, u.type)

def seed_prototype_data(network: TransitNetwork) -> None:
    """
    ALWAYS seeds the global hub atlas (Reference) 
    AND loads saved simulation state (Persistence).
    """
    # 1. Global Hub Atlas (Foundational infrastructure)
    hubs = [
        ("SIN", "Singapore Changi", 1.35, 103.99, "Air"), ("SGSIN", "Singapore Port", 1.26, 103.83, "Sea"),
        ("BOM", "Mumbai Intl", 19.09, 72.87, "Air"), ("INBOM", "Mumbai Port", 18.95, 72.95, "Sea"),
        ("DXB", "Dubai Intl", 25.25, 55.37, "Air"), ("AEJEA", "Jebel Ali Port", 25.01, 55.06, "Sea"),
        ("PVG", "Shanghai Pudong", 31.14, 121.81, "Air"), ("CNSHA", "Shanghai Port", 30.62, 122.06, "Sea"),
        ("LHR", "London Heathrow", 51.47, -0.45, "Air"), ("GBLON", "Port of London", 51.50, 0.05, "Sea"),
        ("LAX", "Los Angeles Intl", 33.94, -118.41, "Air"), ("USLAX", "Port of LA", 33.73, -118.26, "Sea"),
        ("AMS", "Amsterdam Schiphol", 52.31, 4.77, "Air"), ("NLRTM", "Rotterdam Port", 51.95, 4.05, "Sea"),
        ("HKG", "Hong Kong Intl", 22.31, 113.91, "Air"), ("HKHKG", "Hong Kong Port", 22.33, 114.19, "Sea"),
        ("CDG", "Paris CDG", 49.01, 2.55, "Air"), ("FRMRS", "Marseille Port", 43.30, 5.37, "Sea"),
        ("HND", "Tokyo Haneda", 35.55, 139.78, "Air"), ("JPTOK", "Tokyo Port", 35.62, 139.77, "Sea"),
        ("SYD", "Sydney Intl", -33.94, 151.18, "Air"), ("AUSYD", "Sydney Port", -33.85, 151.21, "Sea"),
        ("FRA", "Frankfurt Airport", 50.04, 8.56, "Air"), ("DEHAM", "Hamburg Port", 53.54, 10.00, "Sea"),
    ]
    for id, name, lat, lon, t in hubs: 
        network.add_node(id, name, lat, lon, t, persist=False)
    
    # 2. Saved Simulation State (User nodes/routes)
    if os.path.exists(network.state_file):
        network.load_state()
    
    # 3. Finalize
    network.auto_mesh_network()
