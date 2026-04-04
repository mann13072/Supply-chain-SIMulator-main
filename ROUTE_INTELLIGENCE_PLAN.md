# Route Intelligence Feature - Implementation Plan

## Context

The supply chain simulator currently has probabilistic disruptions (random rolls each day) but no way to model **real-world events** (Suez Canal blockage, port strikes, typhoons) and get **smart route suggestions** in response. This feature adds a "Route Intelligence" system that:

1. Accepts disruption events via manual input or Google News RSS feed
2. Maps events to affected routes using geographic proximity + tags
3. Suggests alternative routes ranked by cost/time/risk (rule-based, no AI cost)
4. Integrates event effects into the simulation (both pre-run and mid-simulation)

---

## New Files to Create

| File | Purpose |
|------|---------|
| `frontend/utils/geoUtils.ts` | Haversine distance, point-to-great-circle-arc distance, blast radius checks |
| `frontend/utils/eventRouteMapper.ts` | Maps events to affected routes (geo + tag matching) |
| `frontend/utils/routeSuggestionEngine.ts` | BFS path finder, scoring (40% cost, 30% time, 30% risk), ranking |
| `frontend/services/routeIntelligenceService.ts` | HTTP client for `/api/news/fetch` |
| `frontend/components/RouteIntelligenceView.tsx` | Main tab: events, news, affected routes, suggestions |
| `frontend/components/EventForm.tsx` | Manual event creation form |
| `frontend/components/NewsFeed.tsx` | RSS news items with "Convert to Event" button |
| `frontend/components/RouteSuggestionsPanel.tsx` | Ranked alternatives with Accept/Reject |
| `backend/news_fetcher.py` | Google News RSS fetch + keyword extraction + location mapping |

## Existing Files to Modify

| File | Changes |
|------|---------|
| `frontend/types.ts` | Add `DisruptionEvent`, `AffectedRoute`, `RouteAlternative`, `RouteSuggestion`, `NewsItem`, `RouteIntelligenceState` interfaces; add `regionTags?` to `Route` |
| `frontend/App.tsx` | Add `routeIntelState` + ref, add `'intelligence'` nav tab (Radar icon), add `case 'intelligence'` in `renderContent()`, wrap simulation loop to apply event effects to routes |
| `backend/server.py` | Add `/api/news/fetch` endpoint (~30 lines) |

---

## Architecture

### 1. Types (`frontend/types.ts`)

```typescript
type EventSeverity = 'low' | 'medium' | 'high' | 'critical';
type EventSource = 'manual' | 'news-rss';

interface DisruptionEvent {
  id, title, description,
  location: { lat, lng }, blastRadiusKm, severity,
  affectedTags: string[], source, active, timestamp,
  // Effects derived from severity:
  disruptionProbModifier, leadTimeDelayDays, costMultiplier
}

interface AffectedRoute {
  routeId, route, eventId, matchType: 'geographic'|'tag'|'both',
  proximityKm, originalDisruptionProb, modifiedDisruptionProb,
  originalLeadTime, modifiedLeadTime
}

interface RouteAlternative {
  id, path: string[], routes: Route[],
  totalDistance, totalLeadTime, totalCost,
  riskScore, compositeScore, isCurrentRoute
}

interface RouteSuggestion {
  affectedRoute, alternatives: RouteAlternative[],
  status: 'pending'|'accepted'|'rejected', acceptedAlternativeId?
}

interface NewsItem {
  id, title, description, link, publishedAt,
  extractedLocation?, extractedSeverity, keywords,
  convertedToEvent: boolean
}
```

Add `regionTags?: string[]` to existing `Route` interface.

### 2. Event-to-Route Mapping (`frontend/utils/eventRouteMapper.ts`)

**Geographic matching algorithm:**
- Each route approximated as great-circle arc between `fromNode.coordinates` and `toNode.coordinates`
- For each event, compute minimum distance from event location to the arc using cross-track distance formula
- If `distanceKm <= event.blastRadiusKm` → route is affected
- Runs in O(events * routes), trivial for typical networks (5 events x 20 routes = 100 calculations)

**Tag matching:** Intersection of `route.regionTags` and `event.affectedTags`.

**Severity-to-effect mapping:**

| Severity | disruptionProb+ | leadTime+ | costMultiplier | Node effect |
|----------|-----------------|-----------|----------------|-------------|
| low      | +0.05           | +1 day    | 1.1x           | WARNING     |
| medium   | +0.15           | +3 days   | 1.3x           | WARNING     |
| high     | +0.30           | +5 days   | 1.5x           | CRITICAL    |
| critical | +0.50           | +10 days  | 2.0x           | OFFLINE     |

### 3. Route Suggestion Engine (`frontend/utils/routeSuggestionEngine.ts`)

**All client-side, no API calls, rule-based:**
- For each affected route (A → B), BFS over user's network graph to find all paths A → B (max 5 hops)
- Exclude paths through nodes inside any event's blast radius
- Score each alternative: `0.4 * normCost + 0.3 * normLeadTime + 0.3 * (1 - normRisk)` (lower = better)
- Return top 3 ranked alternatives + the current affected route for comparison
- If no alternatives exist, show "No alternative routes available"

### 4. Backend News API (`backend/news_fetcher.py` + `server.py`)

- `GET /api/news/fetch` — fetches Google News RSS: `https://news.google.com/rss/search?q=supply+chain+disruption`
- Parse XML with `xml.etree.ElementTree` (stdlib, no new dependency)
- Keyword scan: ~30 known supply chain chokepoints with hardcoded lat/lng (Suez Canal, Panama Canal, Strait of Malacca, Shanghai port, etc.)
- Severity from keywords: "blocked"/"closure"/"war" = critical, "congestion"/"delay" = medium, etc.
- 15-minute in-memory cache

### 5. UI — Route Intelligence Tab (`frontend/components/RouteIntelligenceView.tsx`)

New tab between "Optimize" and "Settings" in NAV_ITEMS. Icon: `Radar` from lucide-react.

**Layout (two-column on desktop, stacked on mobile):**

Left column:
- **EventForm** — Manual event creation: title, description, location picker, blast radius slider (50-5000km), severity dropdown, tags
- **Active Events** — Cards with severity badges (low=blue, medium=amber, high=orange, critical=red), toggle active/inactive, delete
- **News Feed** (collapsible) — Fetched items with "Convert to Event" button

Right column:
- **Affected Routes** — List of routes flagged by active events, color-coded by severity
- **Route Suggestions** — Expandable per affected route, ranked alternatives with Accept/Reject buttons
- **"Apply All" bulk action**

Settings at bottom:
- Toggle: "Auto-pause simulation on critical events"
- Toggle: "Auto-apply minor events silently"

### 6. Simulation Integration

**Pre-run** (in `App.tsx` simulation useEffect):
- Before first tick, call `applyEventEffectsToRoutes(routes, activeEvents, nodes)` to create a working copy with modified `disruptionProb`, `baseLeadTime`, `costPerUnitDistance`
- Original routes are NOT mutated — working copy passed to `computeNextSimulationState`

**Mid-simulation injection:**
- New events added to state are picked up on the next tick via `activeEventsRef`
- **Critical events** (if `autoPauseOnCritical` enabled): pause simulation, switch to Intelligence tab, show banner
- **Non-critical events**: apply silently, add log entry `"Day X: EVENT '[title]' affecting routes: [list]"`

**Accepted reroutes:**
- Original route removed from `routes[]`, alternative route segments added
- Takes effect on next tick
- Log: `"Day X: REROUTE accepted — [from]->[to] now via [path]"`

---

## Implementation Order

### Phase 1: Foundation
1. Add new types to `frontend/types.ts`
2. Create `frontend/utils/geoUtils.ts` (haversine, point-to-arc distance, blast radius check)

### Phase 2: Core Logic
3. Create `frontend/utils/eventRouteMapper.ts` (event-to-route mapping)
4. Create `frontend/utils/routeSuggestionEngine.ts` (BFS path finder, scoring, ranking)

### Phase 3: Backend
5. Create `backend/news_fetcher.py` (RSS fetch, keyword extraction, location mapping)
6. Add `/api/news/fetch` endpoint to `backend/server.py`
7. Create `frontend/services/routeIntelligenceService.ts` (HTTP client)

### Phase 4: UI Components
8. Create `frontend/components/EventForm.tsx`
9. Create `frontend/components/NewsFeed.tsx`
10. Create `frontend/components/RouteSuggestionsPanel.tsx`
11. Create `frontend/components/RouteIntelligenceView.tsx` (main tab)

### Phase 5: App Integration
12. Add state + ref + handlers to `App.tsx`
13. Add `'intelligence'` tab to `NAV_ITEMS` with Radar icon
14. Add `case 'intelligence'` to `renderContent()`
15. Wrap simulation loop: apply event effects to route working copy each tick
16. Add mid-sim pause logic for critical events

---

## Verification

1. **Geo math**: Test with Singapore→Rotterdam route + Suez Canal event (30.0, 32.3, 200km radius) — should flag as affected
2. **Route suggestions**: Using solar preset, block Singapore→Rotterdam, verify BFS finds alternatives (or reports none in a linear chain)
3. **News fetch**: Call `/api/news/fetch`, verify structured items returned
4. **Pre-run sim**: Add Suez event, run 30 days, verify increased delays/costs vs baseline
5. **Mid-sim**: Start sim, inject critical event, verify pause + tab switch
6. **Accept reroute**: Accept suggestion, verify routes array updated and next ticks use new route
7. **Visual**: Check tab renders correctly, severity badges show correct colors, mobile layout stacks
