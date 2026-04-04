import { DisruptionEvent, AffectedRoute, Route, SupplyNode, EventSeverity, NodeStatus } from '../types';
import { pointToArcDistanceKm } from './geoUtils';

/** Severity → effect mapping per the plan */
const SEVERITY_EFFECTS: Record<EventSeverity, {
  disruptionProbModifier: number;
  leadTimeDelayDays: number;
  costMultiplier: number;
  nodeEffect: NodeStatus;
}> = {
  low:      { disruptionProbModifier: 0.05, leadTimeDelayDays: 1,  costMultiplier: 1.1, nodeEffect: NodeStatus.WARNING },
  medium:   { disruptionProbModifier: 0.15, leadTimeDelayDays: 3,  costMultiplier: 1.3, nodeEffect: NodeStatus.WARNING },
  high:     { disruptionProbModifier: 0.30, leadTimeDelayDays: 5,  costMultiplier: 1.5, nodeEffect: NodeStatus.CRITICAL },
  critical: { disruptionProbModifier: 0.50, leadTimeDelayDays: 10, costMultiplier: 2.0, nodeEffect: NodeStatus.OFFLINE },
};

export function getSeverityEffects(severity: EventSeverity) {
  return SEVERITY_EFFECTS[severity];
}

/** Build a DisruptionEvent with computed effect fields from severity */
export function buildEventFromSeverity(
  partial: Omit<DisruptionEvent, 'disruptionProbModifier' | 'leadTimeDelayDays' | 'costMultiplier'>
): DisruptionEvent {
  const effects = SEVERITY_EFFECTS[partial.severity];
  return {
    ...partial,
    disruptionProbModifier: effects.disruptionProbModifier,
    leadTimeDelayDays: effects.leadTimeDelayDays,
    costMultiplier: effects.costMultiplier,
  };
}

/**
 * Maps active events to affected routes using geographic proximity + tag matching.
 */
export function mapEventsToRoutes(
  events: DisruptionEvent[],
  routes: Route[],
  nodes: SupplyNode[]
): AffectedRoute[] {
  const activeEvents = events.filter(e => e.active);
  if (activeEvents.length === 0) return [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const affected: AffectedRoute[] = [];
  const seen = new Set<string>(); // routeId-eventId dedup

  for (const event of activeEvents) {
    for (const route of routes) {
      const key = `${route.id}-${event.id}`;
      if (seen.has(key)) continue;

      const fromNode = nodeMap.get(route.fromId);
      const toNode = nodeMap.get(route.toId);
      if (!fromNode || !toNode) continue;

      // Geographic match: event location vs route arc
      let geoMatch = false;
      let proximityKm = Infinity;
      if (fromNode.coordinates && toNode.coordinates) {
        proximityKm = pointToArcDistanceKm(
          event.location.lat, event.location.lng,
          fromNode.coordinates.lat, fromNode.coordinates.lng,
          toNode.coordinates.lat, toNode.coordinates.lng
        );
        geoMatch = proximityKm <= event.blastRadiusKm;
      }

      // Tag match: intersection of route.regionTags and event.affectedTags
      const tagMatch =
        route.regionTags &&
        route.regionTags.length > 0 &&
        event.affectedTags.length > 0 &&
        route.regionTags.some(t => event.affectedTags.includes(t));

      if (!geoMatch && !tagMatch) continue;

      seen.add(key);

      const matchType: AffectedRoute['matchType'] =
        geoMatch && tagMatch ? 'both' : geoMatch ? 'geographic' : 'tag';

      const effects = SEVERITY_EFFECTS[event.severity];

      affected.push({
        routeId: route.id,
        route,
        eventId: event.id,
        matchType,
        proximityKm: geoMatch ? Math.round(proximityKm) : -1,
        originalDisruptionProb: route.disruptionProb,
        modifiedDisruptionProb: Math.min(1, route.disruptionProb + effects.disruptionProbModifier),
        originalLeadTime: route.baseLeadTime,
        modifiedLeadTime: route.baseLeadTime + effects.leadTimeDelayDays,
      });
    }
  }

  return affected;
}

/**
 * Applies event effects to routes — returns a modified copy (never mutates originals).
 * Used by the simulation loop each tick.
 */
export function applyEventEffectsToRoutes(
  routes: Route[],
  activeEvents: DisruptionEvent[],
  nodes: SupplyNode[]
): Route[] {
  if (activeEvents.length === 0) return routes;

  const affectedMap = new Map<string, AffectedRoute[]>();
  const affected = mapEventsToRoutes(activeEvents, routes, nodes);
  for (const ar of affected) {
    const list = affectedMap.get(ar.routeId) || [];
    list.push(ar);
    affectedMap.set(ar.routeId, list);
  }

  return routes.map(route => {
    const impacts = affectedMap.get(route.id);
    if (!impacts || impacts.length === 0) return route;

    // Stack effects: take the worst across all events affecting this route
    let maxProbMod = 0;
    let maxLeadDelay = 0;
    let maxCostMult = 1;
    for (const impact of impacts) {
      const effects = SEVERITY_EFFECTS[
        activeEvents.find(e => e.id === impact.eventId)?.severity || 'low'
      ];
      maxProbMod = Math.max(maxProbMod, effects.disruptionProbModifier);
      maxLeadDelay = Math.max(maxLeadDelay, effects.leadTimeDelayDays);
      maxCostMult = Math.max(maxCostMult, effects.costMultiplier);
    }

    return {
      ...route,
      disruptionProb: Math.min(1, route.disruptionProb + maxProbMod),
      baseLeadTime: route.baseLeadTime + maxLeadDelay,
      costPerUnitDistance: route.costPerUnitDistance * maxCostMult,
    };
  });
}
