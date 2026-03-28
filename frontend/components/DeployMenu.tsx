import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileJson, FileSpreadsheet, FileText, Globe, ChevronDown, Check, Loader2 } from 'lucide-react';
import { SupplyNode, Route, IndustryConfig, SimulationParams, HistorySnapshot } from '../types';
import { exportJSON, exportExcel, exportReport, exportReadOnlyDashboard, ExportData } from '../utils/exportUtils';
import { useTheme } from '../contexts/ThemeContext';

interface DeployMenuProps {
  nodes: SupplyNode[];
  routes: Route[];
  industryConfig: IndustryConfig;
  params: SimulationParams;
  history: HistorySnapshot[];
  day: number;
}

const EXPORT_OPTIONS = [
  {
    id: 'json',
    label: 'Export JSON',
    description: 'Full network config as .json',
    icon: FileJson,
    action: 'exportJSON' as const,
  },
  {
    id: 'excel',
    label: 'Export Excel',
    description: 'Nodes, routes & history as .xlsx',
    icon: FileSpreadsheet,
    action: 'exportExcel' as const,
  },
  {
    id: 'report',
    label: 'Generate Report',
    description: 'Print-ready PDF summary',
    icon: FileText,
    action: 'exportReport' as const,
  },
  {
    id: 'dashboard',
    label: 'Shareable Dashboard',
    description: 'Self-contained HTML file',
    icon: Globe,
    action: 'exportDashboard' as const,
  },
];

export default function DeployMenu({ nodes, routes, industryConfig, params, history, day }: DeployMenuProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeExport, setActiveExport] = useState<string | null>(null);
  const [doneExport, setDoneExport] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const data: ExportData = { nodes, routes, industryConfig, params, history, day };

  const handleExport = async (option: typeof EXPORT_OPTIONS[number]) => {
    setActiveExport(option.id);
    try {
      // Small delay so the loading state is visible
      await new Promise(r => setTimeout(r, 150));

      switch (option.action) {
        case 'exportJSON':
          exportJSON(data);
          break;
        case 'exportExcel':
          exportExcel(data);
          break;
        case 'exportReport':
          exportReport(data);
          break;
        case 'exportDashboard':
          exportReadOnlyDashboard(data);
          break;
      }

      setActiveExport(null);
      setDoneExport(option.id);
      setTimeout(() => setDoneExport(null), 2000);
    } catch (err) {
      console.error('Export failed:', err);
      setActiveExport(null);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-4 md:px-5 py-2 text-xs font-bold rounded-full min-h-[36px] text-black transition-all"
        style={{ backgroundColor: theme.accent }}
      >
        <Download className="w-3.5 h-3.5" />
        DEPLOY
        <ChevronDown
          className="w-3 h-3 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-72 bg-[#111] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Export & Share</p>
            </div>

            {/* Options */}
            <div className="px-2 pb-2 space-y-0.5">
              {EXPORT_OPTIONS.map(option => {
                const isLoading = activeExport === option.id;
                const isDone = doneExport === option.id;
                const Icon = option.icon;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleExport(option)}
                    disabled={isLoading || activeExport !== null}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all hover:bg-white/[0.05] disabled:opacity-50 group"
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: isDone ? `${theme.accent}20` : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                      ) : isDone ? (
                        <Check className="w-4 h-4" style={{ color: theme.accent }} />
                      ) : (
                        <Icon className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{option.label}</p>
                      <p className="text-[10px] text-white/30 leading-tight">
                        {isDone ? 'Done!' : option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-3 border-t border-white/5">
              <p className="text-[9px] text-white/20 text-center">
                {nodes.length} nodes · {routes.length} routes · Day {day}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
