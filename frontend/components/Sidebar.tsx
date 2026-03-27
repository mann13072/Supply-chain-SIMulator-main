import React from 'react';
import { LayoutDashboard, Network, PlayCircle, BarChart3, Settings, Layers, Zap, ShieldAlert, LogOut } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'builder', label: 'Network Builder', icon: Network },
    { id: 'simulation', label: 'Simulation', icon: PlayCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'scenarios', label: 'Scenarios', icon: Layers },
    { id: 'optimization', label: 'Optimization', icon: Zap },
    { id: 'risk', label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#050505] border-r border-white/5 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <Zap className="w-6 h-6 text-black fill-black" />
        </div>
        <div>
          <h1 className="text-white font-bold tracking-tighter text-xl">SOLAR<span className="text-white/40 font-light">TWIN</span></h1>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium">Supply Chain OS</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-black" : "group-hover:scale-110 transition-transform")} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-black" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="text-white/30 hover:text-white transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
