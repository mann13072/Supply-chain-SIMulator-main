import { Route, SupplyNode, AffectedRoute, RouteAlternative, RouteSuggestion, DisruptionEvent } from '../types';
import { isWithinBlastRadius } from './geoUtils';

const MAX_HOPS = 5;
const MAX_ALTERNATIVES = 3;

interface GraphEdge {
  toId: string;
  route: Route;
}

/**
 * BFS path finder: finds all paths from start → end with max hops,
 * excluding nodes inside any event blast radius.
 */
function findAllPaths(
  adjacency: Map<string, GraphEdge[]>,
  start: string,
  end: string,
  blockedNodeIds: Set<string>
): { path: string[]; routes: Route[] }[] {
  const results: { path: string[]; routes: Route[] }[] = [];

  const queue: { nodeId: string; path: string[]; routes: Route[] }[] = [
    { nodeId: start, path: [start], routes: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length > MAX_HOPS + 1) continue;

    const neighbors = adjacency.get(current.nodeId) || [];
    for (const edge of neighbors) {
      if (current.path.includes(edge.toId)) continue; // no cycles
      if (blockedNodeIds.has(edge.toId) && edge.toId !== end) continue; // skip blocked nodes (except destination)

      const newPath = [...current.path, edge.toId];
      const newRoutes = [...current.routes, edge.route];

      if (edge.toId === end) {
        results.push({ path: newPath, routes: newRoutes });
      } else if (newPath.length <= MAX_HOPS) {
        queue.push({ nodeId: edge.toId, path: newPath, routes: newRoutes });
      }
    }
  }

  return results;
}

/**
 * Computes a normalized score where lower = better.
 * Formula: 0.4 * normCost + 0.3 * normLeadTime + 0.3 * (1 - normRisk)
 * normRisk is inverted because lower risk is better.
 */
function scoreAlternative(
  alt: { totalCost: number; totalLeadTime: number; riskScore: number },
  maxCost: number,
  maxLeadTime: number
): number {
  const normCost = maxCost > 0 ? alt.totalCost / maxCost : 0;
  const normLeadTime = maxLeadTime > 0 ? alt.totalLeadTime / maxLeadTime : 0;
  // riskScore is 0-1, lower is better already, so we use it directly
  return 0.4 * normCost + 0.3 * normLeadTime + 0.3 * alt.riskScore;
}

/**
 * For each affected route (A → B), find alternative paths via BFS,
 * score them, and return ranked suggestions.
 */
export function generateRouteSuggestions(
  affectedRoutes: AffectedRoute[],
  allRoutes: Route[],
  nodes: SupplyNode[],
  activeEvents: DisruptionEvent[]
): RouteSuggestion[] {
  // Build adjacency list from all routes
  const adjacency = new Map<string, GraphEdge[]>();
  for (const route of allRoutes) {
    const edges = adjacency.get(route.fromId) || [];
    edges.push({ toId: route.toId, route });
    adjacency.set(route.fromId, edges);
  }

  // Collect nodes inside any event blast radius
  const blockedNodeIds = new Set<string>();
  for (const event of activeEvents.filter(e => e.active)) {
    for (const node of nodes) {
      if (node.coordinates && isWithinBlastRadius(
        event.location.lat, event.location.lng, event.blastRadiusKm,
        node.coordinates.lat, node.coordinates.lng
      )) {
        blockedNodeIds.add(node.id);
      }
    }
  }

  // Deduplicate affected routes by fromId-toId pair
  const seen = new Set<string>();
  const uniqueAffected: AffectedRoute[] = [];
  for (const ar of affectedRoutes) {
    const key = `${ar.route.fromId}-${ar.route.toId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueAffected.push(ar);
  }

  const suggestions: RouteSuggestion[] = [];

  for (const ar of uniqueAffected) {
    const fromId = ar.route.fromId;
    const toId = ar.route.toId;

    // Find all alternative paths
    const paths = findAllPaths(adjacency, fromId, toId, blockedNodeIds);

    // Build alternatives
    const alternatives: RouteAlternative[] = paths.map((p, idx) => {
      const totalDistance = p.routes.reduce((s, r) => s + r.distance, 0);
      const totalLeadTime = p.routes.reduce((s, r) => s + r.baseLeadTime, 0);
      const totalCost = p.routes.reduce((s, r) => s + r.costPerUnitDistance * r.distance, 0);
      // Risk = average disruption prob across route segments
      const riskScore = p.routes.length > 0
        ? p.routes.reduce((s, r) => s + r.disruptionProb, 0) / p.routes.length
        : 0;

      const isCurrentRoute = p.routes.length === 1 && p.routes[0].id === ar.routeId;

      return {
        id: `alt-${ar.routeId}-${idx}`,
        path: p.path,
        routes: p.routes,
        totalDistance,
        totalLeadTime,
        totalCost,
        riskScore,
        compositeScore: 0, // computed below
        isCurrentRoute,
      };
    });

    // Compute normalized scores
    const maxCost = Math.max(...alternatives.map(a => a.totalCost), 1);
    const maxLeadTime = Math.max(...alternatives.map(a => a.totalLeadTime), 1);
    for (const alt of alternatives) {
      alt.compositeScore = scoreAlternative(alt, maxCost, maxLeadTime);
    }

    // Sort by composite score (lower = better), non-current routes first
    alternatives.sort((a, b) => {
      if (a.isCurrentRoute !== b.isCurrentRoute) return a.isCurrentRoute ? 1 : -1;
      return a.compositeScore - b.compositeScore;
    });

    suggestions.push({
      affectedRoute: ar,
      alternatives: alternatives.slice(0, MAX_ALTERNATIVES + 1), // +1 for current route
      status: 'pending',
    });
  }

  return suggestions;
}
