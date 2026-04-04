import React, { useState } from 'react';
import { RouteSuggestion, RouteAlternative, SupplyNode } from '../types';
import { ChevronDown, ChevronUp, Check, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface RouteSuggestionsPanelProps {
  suggestions: RouteSuggestion[];
  nodes: SupplyNode[];
  onAccept: (suggestionIdx: number, alternativeId: string) => void;
  onReject: (suggestionIdx: number) => void;
  onApplyAll: () => void;
}

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/20 text-red-400 border-red-500/20',
};

const RouteSuggestionsPanel: React.FC<RouteSuggestionsPanelProps> = ({
  suggestions,
  nodes,
  onAccept,
  onReject,
  onApplyAll,
}) => {
  const theme = useTheme();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const getNodeName = (id: string) => nodes.find(n => n.id === id)?.name || id;

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  if (suggestions.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-white/10 mx-auto mb-2" />
        <p className="text-sm text-white/30">No affected routes detected.</p>
        <p className="text-xs text-white/15 mt-1">Add events to see route impact analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingCount > 1 && (
        <button
          onClick={onApplyAll}
          className="w-full py-2 rounded-xl text-sm font-bold text-black transition-all hover:brightness-110"
          style={{ backgroundColor: theme.accent }}
        >
          Apply All Best Alternatives ({pendingCount})
        </button>
      )}

      {suggestions.map((suggestion, idx) => {
        const ar = suggestion.affectedRoute;
        const isExpanded = expandedIdx === idx;

        return (
          <div
            key={`${ar.routeId}-${idx}`}
            className={`bg-white/5 border rounded-2xl overflow-hidden transition-all ${
              suggestion.status === 'accepted'
                ? 'border-emerald-500/30'
                : suggestion.status === 'rejected'
                ? 'border-white/5 opacity-50'
                : 'border-white/10'
            }`}
          >
            <button
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  {getNodeName(ar.route.fromId)}
                </span>
                <ArrowRight className="w-3 h-3 text-white/30 shrink-0" />
                <span className="text-xs font-bold text-white truncate">
                  {getNodeName(ar.route.toId)}
                </span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  SEVERITY_BADGE[ar.matchType === 'geographic' ? 'high' : 'medium']
                }`}>
                  {ar.matchType}
                </span>
                {suggestion.status !== 'pending' && (
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    suggestion.status === 'accepted'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/10 text-white/30'
                  }`}>
                    {suggestion.status}
                  </span>
                )}
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
            </button>

            {isExpanded && (
              <div className="border-t border-white/5 px-4 py-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[10px] text-white/40">
                  <div>
                    <span className="uppercase tracking-widest">Original Disruption Prob</span>
                    <p className="text-white font-bold text-sm">{(ar.originalDisruptionProb * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="uppercase tracking-widest">Modified</span>
                    <p className="text-red-400 font-bold text-sm">{(ar.modifiedDisruptionProb * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="uppercase tracking-widest">Original Lead Time</span>
                    <p className="text-white font-bold text-sm">{ar.originalLeadTime}d</p>
                  </div>
                  <div>
                    <span className="uppercase tracking-widest">Modified</span>
                    <p className="text-red-400 font-bold text-sm">{ar.modifiedLeadTime}d</p>
                  </div>
                  {ar.proximityKm >= 0 && (
                    <div className="col-span-2">
                      <span className="uppercase tracking-widest">Proximity</span>
                      <p className="text-white font-bold text-sm">{ar.proximityKm} km</p>
                    </div>
                  )}
                </div>

                {suggestion.alternatives.length === 0 ? (
                  <div className="text-center py-3 text-white/20 text-xs bg-white/5 rounded-xl">
                    No alternative routes available
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Alternatives</p>
                    {suggestion.alternatives.map((alt: RouteAlternative) => (
                      <div
                        key={alt.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          alt.isCurrentRoute
                            ? 'bg-red-500/5 border-red-500/20'
                            : suggestion.acceptedAlternativeId === alt.id
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            {alt.path.map((nodeId, pi) => (
                              <React.Fragment key={nodeId}>
                                <span className="text-[10px] text-white/70 font-medium">
                                  {getNodeName(nodeId)}
                                </span>
                                {pi < alt.path.length - 1 && (
                                  <ArrowRight className="w-2.5 h-2.5 text-white/20" />
                                )}
                              </React.Fragment>
                            ))}
                            {alt.isCurrentRoute && (
                              <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-red-500/20 text-red-400 ml-1">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3 mt-1 text-[10px] text-white/30">
                            <span>{alt.totalDistance.toLocaleString()} km</span>
                            <span>{alt.totalLeadTime}d</span>
                            <span>${alt.totalCost.toFixed(0)}</span>
                            <span>Score: {alt.compositeScore.toFixed(2)}</span>
                          </div>
                        </div>

                        {!alt.isCurrentRoute && suggestion.status === 'pending' && (
                          <button
                            onClick={() => onAccept(idx, alt.id)}
                            className="shrink-0 p-1.5 rounded-lg text-black transition-all hover:brightness-110"
                            style={{ backgroundColor: theme.accent }}
                            title="Accept this alternative"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {suggestion.status === 'pending' && (
                  <button
                    onClick={() => onReject(idx)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white/50 text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    <X className="w-3 h-3" /> Dismiss
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RouteSuggestionsPanel;
