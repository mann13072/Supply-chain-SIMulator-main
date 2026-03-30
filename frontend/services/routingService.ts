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

  // ── Port atlas search (14K+ UNLOCODE ports) ────────────────────────

  async searchPorts(query: string, type?: string, limit: number = 20): Promise<any[]> {
    try {
      const params = new URLSearchParams({ q: query, limit: String(limit) });
      if (type) params.set('type', type);
      const res = await fetch(`${API_BASE}/api/ports/search?${params}`);
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  },

  async searchPortsNearby(lat: number, lon: number, type?: string, limit: number = 10): Promise<any[]> {
    try {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon), limit: String(limit) });
      if (type) params.set('type', type);
      const res = await fetch(`${API_BASE}/api/ports/search?${params}`);
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  },

  async getPortStats(): Promise<{ total: number; sea: number; air: number; both: number } | null> {
    try {
      const res = await fetch(`${API_BASE}/api/ports/stats`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
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

  // ── Simulation History ──────────────────────────────────────

  async saveSimulationRun(data: {
    name: string;
    description?: string;
    network_id?: string;
    nodes_snapshot: any[];
    routes_snapshot: any[];
    params_snapshot: any;
    industry_config?: any;
    history: any[];
    tags?: string[];
  }): Promise<{ id: string; name: string; error?: string } | null> {
    try {
      // Gzip-compress history on the client to stay under proxy body limits
      const historyJson = JSON.stringify(data.history);
      const historyBytes = new TextEncoder().encode(historyJson);
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(historyBytes);
      writer.close();
      const compressedBuf = await new Response(cs.readable).arrayBuffer();
      const bytes = new Uint8Array(compressedBuf);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      const compressedB64 = btoa(binary);

      const { history: _h, ...rest } = data;
      const payload = { ...rest, history_gz_b64: compressedB64 };

      const res = await fetch(`${API_BASE}/api/simulation-runs`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        console.error('Save simulation run failed:', res.status, err);
        return { id: '', name: '', error: err.detail || `Server error ${res.status}` };
      }
      return await res.json();
    } catch (e) {
      console.error('Save simulation run error:', e);
      return { id: '', name: '', error: 'Network error — check your connection.' };
    }
  },

  async listSimulationRuns(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/api/simulation-runs`, { headers: authHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  },

  async loadSimulationRun(runId: string): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE}/api/simulation-runs/${runId}`, { headers: authHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async updateSimulationRun(runId: string, data: { name?: string; description?: string; tags?: string[] }): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/simulation-runs/${runId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch { return false; }
  },

  async deleteSimulationRun(runId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/simulation-runs/${runId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      return res.ok;
    } catch { return false; }
  },

  async shareSimulationRun(runId: string, enabled: boolean): Promise<{ is_shared: boolean; share_token: string | null } | null> {
    try {
      const res = await fetch(`${API_BASE}/api/simulation-runs/${runId}/share`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async loadSharedRun(shareToken: string): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE}/api/shared/runs/${shareToken}`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async compareSimulationRuns(runIds: string[]): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/api/simulation-runs/compare`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ run_ids: runIds }),
      });
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  },
};
