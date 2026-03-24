import { IndustryConfig } from '../types';

export const CURRENCIES: Record<string, { symbol: string; name: string }> = {
  USD: { symbol: '$',  name: 'US Dollar' },
  EUR: { symbol: '€',  name: 'Euro' },
  GBP: { symbol: '£',  name: 'British Pound' },
  JPY: { symbol: '¥',  name: 'Japanese Yen' },
  CNY: { symbol: '¥',  name: 'Chinese Yuan' },
  INR: { symbol: '₹',  name: 'Indian Rupee' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  BRL: { symbol: 'R$', name: 'Brazilian Real' },
};

export const PRESET_INDUSTRIES: IndustryConfig[] = [
  {
    id: 'solar',
    name: 'Solar Manufacturing',
    baseCurrency: 'USD',
    currencySymbol: '$',
    exchangeRates: { EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.24, INR: 83.2 },
    commodities: [
      { id: 'polysilicon',  name: 'Polysilicon',  unit: 'kg',      basePrice: 8.5,   color: '#3b82f6' },
      { id: 'silver',       name: 'Silver',        unit: 'oz',      basePrice: 24.0,  color: '#94a3b8' },
      { id: 'aluminum',     name: 'Aluminum',      unit: 'ton',     basePrice: 2200,  color: '#64748b' },
      { id: 'glass',        name: 'Solar Glass',   unit: 'm²',      basePrice: 4.5,   color: '#0ea5e9' },
    ],
  },
  {
    id: 'automotive',
    name: 'Automotive',
    baseCurrency: 'USD',
    currencySymbol: '$',
    exchangeRates: { EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.24 },
    commodities: [
      { id: 'steel',          name: 'Steel',          unit: 'ton',  basePrice: 780,   color: '#64748b' },
      { id: 'aluminum',       name: 'Aluminum',       unit: 'ton',  basePrice: 2200,  color: '#94a3b8' },
      { id: 'semiconductors', name: 'Semiconductors', unit: 'unit', basePrice: 12.5,  color: '#8b5cf6' },
      { id: 'rubber',         name: 'Rubber',         unit: 'kg',   basePrice: 1.8,   color: '#78350f' },
    ],
  },
  {
    id: 'pharma',
    name: 'Pharmaceuticals',
    baseCurrency: 'EUR',
    currencySymbol: '€',
    exchangeRates: { USD: 1.09, GBP: 0.86, JPY: 162.5, CHF: 0.95 },
    commodities: [
      { id: 'apis',       name: 'Active Ingredients', unit: 'kg',       basePrice: 450,  color: '#10b981' },
      { id: 'excipients', name: 'Excipients',          unit: 'kg',       basePrice: 12,   color: '#34d399' },
      { id: 'packaging',  name: 'Packaging',           unit: 'unit',     basePrice: 0.08, color: '#6ee7b7' },
      { id: 'cold_chain', name: 'Cold Chain',          unit: 'shipment', basePrice: 850,  color: '#0d9488' },
    ],
  },
  {
    id: 'fmcg',
    name: 'Retail / FMCG',
    baseCurrency: 'GBP',
    currencySymbol: '£',
    exchangeRates: { USD: 1.27, EUR: 1.16, JPY: 189 },
    commodities: [
      { id: 'wheat',        name: 'Wheat',     unit: 'bushel', basePrice: 5.8,  color: '#f59e0b' },
      { id: 'packaging_m',  name: 'Packaging', unit: 'unit',   basePrice: 0.05, color: '#fbbf24' },
      { id: 'fuel',         name: 'Fuel',      unit: 'litre',  basePrice: 1.55, color: '#d97706' },
      { id: 'labor',        name: 'Labor',     unit: 'hour',   basePrice: 12.5, color: '#92400e' },
    ],
  },
  {
    id: 'tech',
    name: 'Tech / Electronics',
    baseCurrency: 'USD',
    currencySymbol: '$',
    exchangeRates: { EUR: 0.92, GBP: 0.79, JPY: 149.5, TWD: 31.5 },
    commodities: [
      { id: 'semiconductors', name: 'Semiconductors',    unit: 'wafer', basePrice: 3200, color: '#6366f1' },
      { id: 'rare_earth',     name: 'Rare Earth Metals', unit: 'kg',    basePrice: 68,   color: '#8b5cf6' },
      { id: 'pcb',            name: 'PCBs',              unit: 'unit',  basePrice: 24,   color: '#a78bfa' },
      { id: 'copper',         name: 'Copper',            unit: 'ton',   basePrice: 8500, color: '#c4841d' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Industry',
    baseCurrency: 'USD',
    currencySymbol: '$',
    exchangeRates: {},
    commodities: [],
  },
];
