import { NewsItem } from '../types';

const API_BASE = '';

export const routeIntelligenceService = {
  async fetchNews(): Promise<NewsItem[]> {
    try {
      const res = await fetch(`${API_BASE}/api/news/fetch`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.error('[routeIntelligence] Failed to fetch news:', err);
      return [];
    }
  },
};
