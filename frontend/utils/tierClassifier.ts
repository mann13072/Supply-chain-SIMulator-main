import { SupplyNode, Route } from '../types';

/**
 * Supply Chain Tier Classification via BFS from the focal company node.
 *
 * Upstream (suppliers): tier 1, 2, 3, ...  (routes flow INTO focal)
 * Downstream (customers): tier -1, -2, -3  (routes flow FROM focal)
 * Focal company: tier 0
 *
 * Nodes with tierLocked=true keep their manually assigned supplyChainTier.
 * Unconnected nodes get supplyChainTier=undefined.
 */
export function classifySupplyChainTiers(
  nodes: SupplyNode[],
  routes: Route[],
): SupplyNode[] {
  const focalNode = nodes.find(n => n.isFocalCompany);
  if (!focalNode) {
    // No focal company designated — clear auto-assigned tiers only
    return nodes.map(n => n.tierLocked ? n : { ...n, supplyChainTier: undefined });
  }

  // Build adjacency maps from routes
  // upstreamOf[nodeId] = nodes that ship TO nodeId (route.fromId → route.toId)
  const upstreamOf: Record<string, string[]> = {};
  // downstreamOf[nodeId] = nodes that nodeId ships TO
  const downstreamOf: Record<string, string[]> = {};

  for (const route of routes) {
    if (!upstreamOf[route.toId]) upstreamOf[route.toId] = [];
    upstreamOf[route.toId].push(route.fromId);
    if (!downstreamOf[route.fromId]) downstreamOf[route.fromId] = [];
    downstreamOf[route.fromId].push(route.toId);
  }

  const tierMap: Record<string, number> = {};
  tierMap[focalNode.id] = 0;

  // BFS upstream: follow incoming routes backwards from focal
  const upQueue: string[] = [focalNode.id];
  const upVisited = new Set<string>([focalNode.id]);
  let currentTier = 0;

  while (upQueue.length > 0) {
    const nextQueue: string[] = [];
    currentTier++;
    for (const nodeId of upQueue) {
      for (const upId of (upstreamOf[nodeId] || [])) {
        if (upVisited.has(upId)) continue;
        upVisited.add(upId);
        tierMap[upId] = currentTier;
        nextQueue.push(upId);
      }
    }
    upQueue.length = 0;
    upQueue.push(...nextQueue);
  }

  // BFS downstream: follow outgoing routes forward from focal
  const downQueue: string[] = [focalNode.id];
  const downVisited = new Set<string>([focalNode.id]);
  let downTier = 0;

  while (downQueue.length > 0) {
    const nextQueue: string[] = [];
    downTier--;
    for (const nodeId of downQueue) {
      for (const downId of (downstreamOf[nodeId] || [])) {
        if (downVisited.has(downId)) continue;
        // If already classified as upstream, don't overwrite with downstream
        if (upVisited.has(downId)) continue;
        downVisited.add(downId);
        tierMap[downId] = downTier;
        nextQueue.push(downId);
      }
    }
    downQueue.length = 0;
    downQueue.push(...nextQueue);
  }

  // Apply tiers to nodes
  return nodes.map(n => {
    if (n.tierLocked && n.supplyChainTier !== undefined) return n;
    const tier = tierMap[n.id];
    return { ...n, supplyChainTier: tier };
  });
}

/**
 * Returns a human-readable label for a supply chain tier number.
 */
export function getTierLabel(tier: number | undefined): string {
  if (tier === undefined) return 'Unclassified';
  if (tier === 0) return 'OEM / Focal';
  if (tier > 0) return `Tier ${tier}`;
  return `Downstream ${Math.abs(tier)}`;
}

/**
 * Returns the display color for a supply chain tier.
 */
export function getTierColor(tier: number | undefined): string {
  if (tier === undefined) return '#9ca3af'; // gray
  if (tier === 0) return '#3b82f6';         // blue — focal
  if (tier === 1) return '#8b5cf6';         // purple
  if (tier === 2) return '#f59e0b';         // amber
  if (tier === 3) return '#f97316';         // orange
  if (tier >= 4) return '#ef4444';          // red
  // Downstream (negative tiers)
  return '#10b981';                          // green
}

/**
 * Computes the estimated impact delay (in days) from a disrupted node
 * to the focal company, by summing route lead times along the shortest path.
 */
export function estimateImpactDelay(
  disruptedNodeId: string,
  focalNodeId: string,
  routes: Route[],
): number {
  // BFS from disrupted node following downstream routes toward focal
  const downstreamOf: Record<string, { toId: string; leadTime: number }[]> = {};
  for (const r of routes) {
    if (!downstreamOf[r.fromId]) downstreamOf[r.fromId] = [];
    downstreamOf[r.fromId].push({ toId: r.toId, leadTime: r.baseLeadTime });
  }

  // Dijkstra-like BFS for shortest lead time path
  const dist: Record<string, number> = { [disruptedNodeId]: 0 };
  const queue: string[] = [disruptedNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    // Pick node with smallest distance
    queue.sort((a, b) => (dist[a] || Infinity) - (dist[b] || Infinity));
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current === focalNodeId) return dist[current];

    for (const edge of (downstreamOf[current] || [])) {
      const newDist = (dist[current] || 0) + edge.leadTime;
      if (newDist < (dist[edge.toId] ?? Infinity)) {
        dist[edge.toId] = newDist;
        queue.push(edge.toId);
      }
    }
  }

  return -1; // no path found
}
