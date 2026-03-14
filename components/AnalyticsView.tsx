import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { BarChart3, TrendingUp, Zap, ShieldAlert } from 'lucide-react';

const AnalyticsView: React.FC = () => {
  const productionData = [
    { name: 'Week 1', poly: 4000, wafer: 2400, cells: 2400, modules: 2000 },
    { name: 'Week 2', poly: 3000, wafer: 1398, cells: 2210, modules: 2100 },
    { name: 'Week 3', poly: 2000, wafer: 9800, cells: 2290, modules: 2200 },
    { name: 'Week 4', poly: 2780, wafer: 3908, cells: 2000, modules: 1900 },
    { name: 'Week 5', poly: 1890, wafer: 4800, cells: 2181, modules: 2300 },
    { name: 'Week 6', poly: 2390, wafer: 3800, cells: 2500, modules: 2400 },
    { name: 'Week 7', poly: 3490, wafer: 4300, cells: 2100, modules: 2100 },
  ];

  const emissionsData = [
    { name: 'Jan', scope1: 120, scope2: 200, scope3: 450 },
    { name: 'Feb', scope1: 110, scope2: 190, scope3: 430 },
    { name: 'Mar', scope1: 130, scope2: 210, scope3: 460 },
    { name: 'Apr', scope1: 125, scope2: 195, scope3: 440 },
    { name: 'May', scope1: 115, scope2: 185, scope3: 420 },
    { name: 'Jun', scope1: 105, scope2: 180, scope3: 410 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
         <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Advanced Analytics</h2>
            <p className="text-white/40 text-sm mt-1">Deep dive into production, emissions, and risk metrics.</p>
         </div>
         <div className="flex gap-3">
             <button className="px-4 py-2 bg-white/5 text-sm text-white rounded-xl border border-white/10 hover:bg-white/10 transition-all">Export CSV</button>
             <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 transition-all">Generate Report</button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Production Balance */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-white font-semibold mb-8 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-white" />
             Value Chain Throughput
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={productionData}>
                <defs>
                  <linearGradient id="colorPoly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
                <Area type="monotone" dataKey="poly" fill="url(#colorPoly)" stroke="#ffffff" strokeWidth={2} />
                <Line type="monotone" dataKey="wafer" stroke="#ffffff" strokeOpacity={0.4} strokeWidth={1} dot={false} />
                <Bar dataKey="modules" barSize={12} fill="#ffffff" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ESG Metrics */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-white font-semibold mb-8 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-white" />
             Carbon Intensity Breakdown
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emissionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }} />
                <Bar dataKey="scope1" stackId="a" fill="#ffffff" radius={[0, 0, 0, 0]} />
                <Bar dataKey="scope2" stackId="a" fill="#ffffff" fillOpacity={0.4} />
                <Bar dataKey="scope3" stackId="a" fill="#ffffff" fillOpacity={0.1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Summary */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 col-span-1 lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Geopolitical Risk</p>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-1/3" />
                </div>
                <span className="text-white font-mono text-xs">34%</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Supply Disruption</p>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-2/3" />
                </div>
                <span className="text-white font-mono text-xs">67%</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Climate Exposure</p>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-1/4" />
                </div>
                <span className="text-white font-mono text-xs">25%</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsView;