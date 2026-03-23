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
      const response = await fetch(`/api/route?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&mode=${mode}`);
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
      const response = await fetch('/api/hubs');
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
      const response = await fetch(`/api/hubs/nearby?lat=${lat}&lon=${lon}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      return [];
    }
  },

  /**
   * Fetches the current simulation state from the backend.
   */
  async getState(): Promise<{ nodes: any[], routes: any[] }> {
    try {
      const response = await fetch('/api/state');
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
      await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node)
      });
    } catch (e) { console.error('Persist Node Error', e); }
  },

  /**
   * Persists a new route to the Python engine.
   */
  async persistRoute(u: string, v: string, mode: string) {
    try {
      await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ u, v, mode })
      });
    } catch (e) { console.error('Persist Route Error', e); }
  }
};
