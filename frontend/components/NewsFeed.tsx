import React, { useState } from 'react';
import { NewsItem, DisruptionEvent } from '../types';
import { buildEventFromSeverity } from '../utils/eventRouteMapper';
import { Rss, ChevronDown, ChevronUp, ExternalLink, MapPin, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface NewsFeedProps {
  newsItems: NewsItem[];
  loading: boolean;
  onFetchNews: () => void;
  onConvertToEvent: (event: DisruptionEvent, newsId: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

const NewsFeed: React.FC<NewsFeedProps> = ({ newsItems, loading, onFetchNews, onConvertToEvent }) => {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(true);

  const handleConvert = (item: NewsItem) => {
    if (!item.extractedLocation) return;
    const event = buildEventFromSeverity({
      id: `evt-news-${item.id}`,
      title: item.title,
      description: item.description,
      location: item.extractedLocation,
      blastRadiusKm: item.extractedSeverity === 'critical' ? 2000 : item.extractedSeverity === 'high' ? 1000 : 500,
      severity: item.extractedSeverity,
      affectedTags: item.keywords,
      source: 'news-rss',
      active: true,
      timestamp: item.publishedAt || new Date().toISOString(),
    });
    onConvertToEvent(event, item.id);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => { setCollapsed(c => !c); if (collapsed && newsItems.length === 0) onFetchNews(); }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Rss className="w-4 h-4" style={{ color: theme.accent }} />
          <span className="text-sm font-bold text-white">News Feed</span>
          {newsItems.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">
              {newsItems.length}
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronUp className="w-4 h-4 text-white/30" />}
      </button>

      {!collapsed && (
        <div className="border-t border-white/5">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Google News RSS</span>
            <button
              onClick={onFetchNews}
              disabled={loading}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all disabled:opacity-50"
              style={{ color: theme.accent }}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {loading && newsItems.length === 0 && (
              <div className="flex items-center justify-center py-8 text-white/30">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Fetching news...
              </div>
            )}

            {!loading && newsItems.length === 0 && (
              <div className="text-center py-8 text-white/20 text-sm">
                No news items. Click Refresh to fetch.
              </div>
            )}

            {newsItems.map(item => (
              <div key={item.id} className="px-4 py-3 border-t border-white/5 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${SEVERITY_COLORS[item.extractedSeverity]}`}>
                        {item.extractedSeverity}
                      </span>
                      {item.extractedLocation && (
                        <span className="text-[9px] text-white/30 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {item.extractedLocation.lat.toFixed(1)}, {item.extractedLocation.lng.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/80 font-medium leading-snug line-clamp-2">{item.title}</p>
                    {item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.keywords.slice(0, 3).map(kw => (
                          <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {item.extractedLocation && !item.convertedToEvent && (
                      <button
                        onClick={() => handleConvert(item)}
                        className="text-[9px] font-bold px-2 py-1 rounded-lg transition-all text-black"
                        style={{ backgroundColor: theme.accent }}
                      >
                        Convert
                      </button>
                    )}
                    {item.convertedToEvent && (
                      <span className="text-[9px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold">
                        Added
                      </span>
                    )}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/20 hover:text-white/50 transition-colors flex items-center justify-center"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
