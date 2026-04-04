import React, { useState, useCallback } from 'react';
import {
  DisruptionEvent, NewsItem, AffectedRoute, RouteSuggestion,
  RouteIntelligenceState, Route, SupplyNode,
} from '../types';
import { mapEventsToRoutes } from '../utils/eventRouteMapper';
import { generateRouteSuggestions } from '../utils/routeSuggestionEngine';
import { routeIntelligenceService } from '../services/routeIntelligenceService';
import EventForm from './EventForm';
import NewsFeed from './NewsFeed';
import RouteSuggestionsPanel from './RouteSuggestionsPanel';
import { Radar, Trash2, Power, PowerOff, Shield, AlertTriangle, MapPin } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface RouteIntelligenceViewProps {
  state: RouteIntelligenceState;
  setState: React.Dispatch<React.SetStateAction<RouteIntelligenceState>>;
  routes: Route[];
  nodes: SupplyNode[];
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>;
  onPauseSimulation: () => void;
  addLog: (msg: string) => void;
  day: number;
}

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  low:      { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  medium:   { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  high:     { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
};

const RouteIntelligenceView: React.FC<RouteIntelligenceViewProps> = ({
  state,
  setState,
  routes,
  nodes,
  setRoutes,
  onPauseSimulation,
  addLog,
  day,
}) => {
  const theme = useTheme();
  const [newsLoading, setNewsLoading] = useState(false);

  // Recompute affected routes and suggestions whenever events change
  const recompute = useCallback(
    (events: DisruptionEvent[]) => {
      const activeEvents = events.filter(e => e.active);
      const affected = mapEventsToRoutes(activeEvents, routes, nodes);
      const suggestions = generateRouteSuggestions(affected, routes, nodes, activeEvents);
      return { affectedRoutes: affected, suggestions };
    },
    [routes, nodes]
  );

  const handleAddEvent = useCallback((event: DisruptionEvent) => {
    setState(prev => {
      const newEvents = [...prev.events, event];
      const { affectedRoutes, suggestions } = recompute(newEvents);
      addLog(`Day ${day}: EVENT '${event.title}' added (${event.severity}).`);
      return { ...prev, events: newEvents, affectedRoutes, suggestions };
    });
  }, [setState, recompute, addLog, day]);

  const handleToggleEvent = useCallback((eventId: string) => {
    setState(prev => {
      const newEvents = prev.events.map(e =>
        e.id === eventId ? { ...e, active: !e.active } : e
      );
      const { affectedRoutes, suggestions } = recompute(newEvents);
      return { ...prev, events: newEvents, affectedRoutes, suggestions };
    });
  }, [setState, recompute]);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setState(prev => {
      const newEvents = prev.events.filter(e => e.id !== eventId);
      const { affectedRoutes, suggestions } = recompute(newEvents);
      return { ...prev, events: newEvents, affectedRoutes, suggestions };
    });
  }, [setState, recompute]);

  const handleFetchNews = useCallback(async () => {
    setNewsLoading(true);
    const items = await routeIntelligenceService.fetchNews();
    setState(prev => ({ ...prev, newsItems: items }));
    setNewsLoading(false);
  }, [setState]);

  const handleConvertNewsToEvent = useCallback((event: DisruptionEvent, newsId: string) => {
    setState(prev => {
      const newNewsItems = prev.newsItems.map(n =>
        n.id === newsId ? { ...n, convertedToEvent: true } : n
      );
      const newEvents = [...prev.events, event];
      const { affectedRoutes, suggestions } = recompute(newEvents);
      addLog(`Day ${day}: NEWS EVENT '${event.title}' converted (${event.severity}).`);
      return { ...prev, events: newEvents, newsItems: newNewsItems, affectedRoutes, suggestions };
    });
  }, [setState, recompute, addLog, day]);

  const handleAcceptSuggestion = useCallback((suggestionIdx: number, alternativeId: string) => {
    setState(prev => {
      const newSuggestions = [...prev.suggestions];
      const suggestion = newSuggestions[suggestionIdx];
      if (!suggestion || suggestion.status !== 'pending') return prev;

      const alt = suggestion.alternatives.find(a => a.id === alternativeId);
      if (!alt) return prev;

      newSuggestions[suggestionIdx] = { ...suggestion, status: 'accepted', acceptedAlternativeId: alternativeId };

      // Apply reroute: remove old route, add new route segments
      const oldRouteId = suggestion.affectedRoute.routeId;
      const pathStr = alt.path.map(id => nodes.find(n => n.id === id)?.name || id).join(' → ');
      addLog(`Day ${day}: REROUTE accepted — ${pathStr}`);

      setRoutes(prevRoutes => {
        const filtered = prevRoutes.filter(r => r.id !== oldRouteId);
        // Add the alternative route segments (skip if they already exist)
        const existingIds = new Set(filtered.map(r => r.id));
        const newRouteSegments = alt.routes.filter(r => !existingIds.has(r.id));
        return [...filtered, ...newRouteSegments];
      });

      return { ...prev, suggestions: newSuggestions };
    });
  }, [setState, setRoutes, addLog, day, nodes]);

  const handleRejectSuggestion = useCallback((suggestionIdx: number) => {
    setState(prev => {
      const newSuggestions = [...prev.suggestions];
      if (newSuggestions[suggestionIdx]) {
        newSuggestions[suggestionIdx] = { ...newSuggestions[suggestionIdx], status: 'rejected' };
      }
      return { ...prev, suggestions: newSuggestions };
    });
  }, [setState]);

  const handleApplyAll = useCallback(() => {
    setState(prev => {
      const newSuggestions = prev.suggestions.map(s => {
        if (s.status !== 'pending') return s;
        const bestAlt = s.alternatives.find(a => !a.isCurrentRoute);
        if (!bestAlt) return s;
        return { ...s, status: 'accepted' as const, acceptedAlternativeId: bestAlt.id };
      });

      // Collect all route changes
      const removedIds = new Set<string>();
      const addedRoutes: Route[] = [];
      for (const s of newSuggestions) {
        if (s.status === 'accepted' && s.acceptedAlternativeId) {
          removedIds.add(s.affectedRoute.routeId);
          const alt = s.alternatives.find(a => a.id === s.acceptedAlternativeId);
          if (alt) addedRoutes.push(...alt.routes);
        }
      }

      if (removedIds.size > 0) {
        addLog(`Day ${day}: BULK REROUTE — ${removedIds.size} routes updated.`);
        setRoutes(prevRoutes => {
          const filtered = prevRoutes.filter(r => !removedIds.has(r.id));
          const existingIds = new Set(filtered.map(r => r.id));
          const newRouteSegments = addedRoutes.filter(r => !existingIds.has(r.id));
          return [...filtered, ...newRouteSegments];
        });
      }

      return { ...prev, suggestions: newSuggestions };
    });
  }, [setState, setRoutes, addLog, day]);

  const activeEvents = state.events.filter(e => e.active);
  const criticalCount = activeEvents.filter(e => e.severity === 'critical').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${theme.accent}22` }}>
            <Radar className="w-5 h-5" style={{ color: theme.accent }} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Route Intelligence</h2>
            <p className="text-xs text-white/40">Real-world event monitoring & smart route suggestions</p>
          </div>
        </div>
        {criticalCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-red-400">{criticalCount} Critical</span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Events + News */}
        <div className="space-y-4">
          <EventForm onAddEvent={handleAddEvent} />

          {/* Active Events */}
          {state.events.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
                Active Events ({activeEvents.length}/{state.events.length})
              </h3>
              {state.events.map(event => {
                const colors = SEVERITY_COLORS[event.severity];
                return (
                  <div
                    key={event.id}
                    className={`${colors.bg} border ${colors.border} rounded-xl p-3 transition-all ${!event.active ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-bold uppercase ${colors.text}`}>{event.severity}</span>
                          <span className="text-[9px] text-white/30">{event.source}</span>
                        </div>
                        <p className="text-sm font-bold text-white truncate">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-white/30">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {event.location.lat.toFixed(1)}, {event.location.lng.toFixed(1)}
                          </span>
                          <span>{event.blastRadiusKm} km radius</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleEvent(event.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          title={event.active ? 'Deactivate' : 'Activate'}
                        >
                          {event.active
                            ? <Power className="w-3.5 h-3.5 text-emerald-400" />
                            : <PowerOff className="w-3.5 h-3.5 text-white/30" />}
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors text-white/30 hover:text-red-400"
                          title="Delete event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <NewsFeed
            newsItems={state.newsItems}
            loading={newsLoading}
            onFetchNews={handleFetchNews}
            onConvertToEvent={handleConvertNewsToEvent}
          />
        </div>

        {/* Right column: Affected Routes + Suggestions */}
        <div className="space-y-4">
          {/* Affected Routes Summary */}
          {state.affectedRoutes.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-3">
                Affected Routes ({state.affectedRoutes.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {state.affectedRoutes.map((ar, i) => {
                  const fromName = nodes.find(n => n.id === ar.route.fromId)?.name || ar.route.fromId;
                  const toName = nodes.find(n => n.id === ar.route.toId)?.name || ar.route.toId;
                  return (
                    <div key={`${ar.routeId}-${i}`} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5">
                      <span className="text-xs text-white/70 truncate">{fromName} → {toName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] text-white/30">{ar.matchType}</span>
                        <span className="text-[9px] font-bold text-red-400">+{((ar.modifiedDisruptionProb - ar.originalDisruptionProb) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Route Suggestions */}
          <div>
            <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-3">
              Route Suggestions
            </h3>
            <RouteSuggestionsPanel
              suggestions={state.suggestions}
              nodes={nodes}
              onAccept={handleAcceptSuggestion}
              onReject={handleRejectSuggestion}
              onApplyAll={handleApplyAll}
            />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-3 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Intelligence Settings
        </h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.autoPauseOnCritical}
              onChange={() => setState(prev => ({ ...prev, autoPauseOnCritical: !prev.autoPauseOnCritical }))}
              className="accent-red-500 w-4 h-4"
            />
            <span className="text-sm text-white/60">Auto-pause on critical events</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.autoApplyMinor}
              onChange={() => setState(prev => ({ ...prev, autoApplyMinor: !prev.autoApplyMinor }))}
              className="accent-amber-500 w-4 h-4"
            />
            <span className="text-sm text-white/60">Auto-apply minor events silently</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default RouteIntelligenceView;
