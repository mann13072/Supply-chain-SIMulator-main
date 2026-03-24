import { IndustryConfig } from '../types';

export function formatCurrency(value: number, config: IndustryConfig): string {
  return `${config.currencySymbol}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatCurrencyCompact(value: number, config: IndustryConfig): string {
  if (value >= 1_000_000) return `${config.currencySymbol}${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${config.currencySymbol}${(value / 1_000).toFixed(1)}K`;
  return `${config.currencySymbol}${value.toFixed(0)}`;
}
