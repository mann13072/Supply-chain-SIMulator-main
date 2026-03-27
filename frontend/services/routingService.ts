export interface RouteResponse {
  status: 'success' | 'error';
  path: string[];
  distance_km: number;
  lead_time_days: number;
  message?: string;
}

export interface Hub {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lon: number;
  };
}

export interface HubsResponse {
  Air: Hub[];
  Sea: Hub[];
}

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Returns stored JWT token for authenticated requests. */
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sc_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

/**
 * Service to communicate with the Python Supply Chain Routing Engine.
 */
export const routingService = {
  /**
   * Fetches the optimal shortest path between two hubs.
   * @param start Origin Hub ID (e.g., 'SIN', 'CNSHA')
   * @param end Destination Hub ID
   * @param mode Transport Mode ('Air' | 'Sea')
   */
  async getShortestPath(start: string, end: string, mode: 'Air' | 'Sea'): Promise<RouteResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/route?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&mode=${mode}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          status: 'error',
          path: [],
          distance_km: 0,
          lead_time_days: 0,
          message: errorData.detail || `API error: ${response.status} ${response.statusText}`
        };
      }
      return await response.json();
    } catch (error) {
      console.error('Routing Service Error:', error);
      return {
        status: 'error',
        path: [],
        distance_km: 0,
        lead_time_days: 0,
        message: 'Network Error: Ensure the Python server is running (npm run dev).'
      };
    }
  },

  /**
   * Fetches the list of all available global hubs from the engine.
   */
  async getAvailableHubs(): Promise<HubsResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/hubs`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Hubs Service Error:', error);
      return { Air: [], Sea: [] };
    }
  },

  /**
   * Finds nearest global hubs to a coordinate.
   */
  async getNearbyHubs(lat: number, lon: number): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE}/api/hubs/nearby?lat=${lat}&lon=${lon}`);
      if (!response.ok) {
        console.error('getNearbyHubs failed:', response.status, response.statusText);
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error('getNearbyHubs error:', error);
      return [];
    }
  },

  /**
   * Fetches the current simulation state from the backend.
   */
  async getState(): Promise<{ nodes: any[], routes: any[] }> {
    try {
      const response = await fetch(`${API_BASE}/api/state`);
      if (!response.ok) return { nodes: [], routes: [] };
      return await response.json();
    } catch (error) {
      console.error('Get State Error:', error);
      return { nodes: [], routes: [] };
    }
  },

  /**
   * Persists a new node to the Python engine.
   */
  async persistNode(node: { id: string, name: string, lat: number, lon: number, type: string, is_hub?: boolean }) {
    try {
      await fetch(`${API_BASE}/api/nodes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(node)
      });
    } catch (e) { console.error('Persist Node Error', e); }
  },

  /**
   * Persists a new route to the Python engine.
   */
  async persistRoute(u: string, v: string, mode: string) {
    try {
      await fetch(`${API_BASE}/api/routes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ u, v, mode })
      });
    } catch (e) { console.error('Persist Route Error', e); }
  },

  // ── User network save / load ──────────────────────────────────────

  async listNetworks(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/api/networks`, { headers: authHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  },

  async saveNetwork(name: string, nodes: any[], routes: any[], params?: any): Promise<{ id: string; name: string } | null> {
    try {
      const res = await fetch(`${API_BASE}/api/networks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, nodes, routes, params }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async loadNetwork(networkId: string): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE}/api/networks/${networkId}`, { headers: authHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async updateNetwork(networkId: string, name: string, nodes: any[], routes: any[], params?: any): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/networks/${networkId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name, nodes, routes, params }),
      });
      return res.ok;
    } catch { return false; }
  },

  async deleteNetwork(networkId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/networks/${networkId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      return res.ok;
    } catch { return false; }
  },
};
