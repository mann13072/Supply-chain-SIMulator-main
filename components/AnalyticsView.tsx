import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface AnalyticsViewProps {
  history: any[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ history }) => {
  // Map history to chart-friendly format
  const chartData = history.map(h => {
    const data: any = { name: `Day ${h.day}` };
    h.nodes.forEach((n: any) => {
      data[n.id] = n.inv;
    });
    return data;
  });

  // Calculate stockout incidents from history
  const stockoutData = history.map(h => ({
    name: `Day ${h.day}`,
    count: h.nodes.filter((n: any) => n.status === 'CRITICAL').length
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
         <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Supply Chain Telemetry</h2>
            <p className="text-white/40 text-sm mt-1">Real-time performance metrics derived from simulation history.</p>
         </div>
         <div className="flex gap-3">
             <button className="px-4 py-2 bg-white/5 text-sm text-white rounded-xl border border-white/10 hover:bg-white/10 transition-all">Export CSV</button>
             <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 transition-all">Generate Report</button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Inventory Levels Over Time */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-white font-semibold mb-8 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-500" />
             Inventory Levels (Units)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                {history[0]?.nodes.map((n: any, i: number) => (
                  <Area 
                    key={n.id}
                    type="monotone" 
                    dataKey={n.id} 
                    stroke={`hsl(${i * 60}, 70%, 60%)`} 
                    fill={`hsl(${i * 60}, 70%, 60%)`} 
                    fillOpacity={0.1}
                    strokeWidth={2} 
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stockout Incidents */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-white font-semibold mb-8 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-red-500" />
             Active Stockout Events
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockoutData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff" strokeOpacity={0.2} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
