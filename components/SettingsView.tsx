import React from 'react';
import { Settings, Database, Bell, Cpu, Save, RotateCcw } from 'lucide-react';

const SettingsView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      
      <div>
        <h2 className="text-4xl font-bold text-white tracking-tight">System Configuration</h2>
        <p className="text-white/40 text-sm mt-2">Manage digital twin parameters, API connections, and user preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 rounded-3xl border border-white/5 p-8">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-3">
            <Cpu className="w-5 h-5 text-white/40" />
            Model Parameters
          </h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <div>
                 <div className="text-sm font-medium text-white">Simulation Resolution</div>
                 <div className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Time step granularity</div>
               </div>
               <select className="bg-white/5 border border-white/10 rounded-xl text-white text-xs p-3 focus:outline-none focus:border-white/30">
                 <option className="bg-black">Daily</option>
                 <option className="bg-black">Weekly</option>
                 <option className="bg-black">Monthly</option>
               </select>
            </div>
            <div className="flex justify-between items-center">
               <div>
                 <div className="text-sm font-medium text-white">Confidence Interval</div>
                 <div className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Statistical threshold</div>
               </div>
               <select className="bg-white/5 border border-white/10 rounded-xl text-white text-xs p-3 focus:outline-none focus:border-white/30">
                 <option className="bg-black">90%</option>
                 <option className="bg-black">95%</option>
                 <option className="bg-black">99%</option>
               </select>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-3xl border border-white/5 p-8">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-3">
            <Database className="w-5 h-5 text-white/40" />
            Data Integrations
          </h3>
          <div className="space-y-3">
            {[
              { name: 'SAP S/4HANA', status: 'connected' },
              { name: 'Bloomberg Terminal', status: 'connected' },
              { name: 'MarineTraffic AIS', status: 'error' },
            ].map((api, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${api.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-xs text-white font-medium">{api.name}</span>
                </div>
                <button className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest font-bold">Configure</button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-3xl border border-white/5 p-8 col-span-1 md:col-span-2">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-3">
            <Bell className="w-5 h-5 text-white/40" />
            Alert Thresholds
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2">
               <label className="text-[10px] text-white/40 uppercase tracking-widest block">Inventory Low Warning (%)</label>
               <input type="range" defaultValue={20} className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white" />
               <div className="flex justify-between text-[10px] text-white/20 font-mono">
                 <span>0%</span>
                 <span>20%</span>
                 <span>100%</span>
               </div>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] text-white/40 uppercase tracking-widest block">Cost Variance Critical (%)</label>
               <input type="range" defaultValue={15} className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white" />
               <div className="flex justify-between text-[10px] text-white/20 font-mono">
                 <span>0%</span>
                 <span>15%</span>
                 <span>100%</span>
               </div>
             </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-4 pt-8 border-t border-white/5">
        <button className="flex items-center gap-2 px-6 py-3 text-white/40 hover:text-white transition-all text-sm font-medium">
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
        <button className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-2xl font-bold hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

    </div>
  );
};

export default SettingsView;