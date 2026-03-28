import React, { createContext, useContext, useMemo } from 'react';
import { INDUSTRY_THEMES, IndustryTheme } from '../utils/industries';

const DEFAULT_THEME: IndustryTheme = {
  accent: '#f59e0b',
  accentLight: '#f59e0b15',
  accentMuted: '#f59e0b80',
  icon: 'Sun',
  description: '',
  gradient: 'from-amber-500/20 to-orange-500/5',
};

const ThemeContext = createContext<IndustryTheme>(DEFAULT_THEME);

export function ThemeProvider({ industryId, children }: { industryId: string; children: React.ReactNode }) {
  const theme = useMemo(() => INDUSTRY_THEMES[industryId] || DEFAULT_THEME, [industryId]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): IndustryTheme {
  return useContext(ThemeContext);
}
