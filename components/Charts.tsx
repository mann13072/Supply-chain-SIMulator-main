import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const data = [
  { name: 'Jan', cost: 4000, demand: 2400 },
  { name: 'Feb', cost: 3000, demand: 1398 },
  { name: 'Mar', cost: 2000, demand: 9800 },
  { name: 'Apr', cost: 2780, demand: 3908 },
  { name: 'May', cost: 1890, demand: 4800 },
  { name: 'Jun', cost: 2390, demand: 3800 },
  { name: 'Jul', cost: 3490, demand: 4300 },
];

export const CostTrendChart: React.FC = () => {
  return (
    <div className="h-64 w-full">
      <h4 className="text-slate-300 text-sm mb-4 font-semibold">Landed Cost Trend (Last 6 Months)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ color: '#bae6fd' }}
          />
          <Area type="monotone" dataKey="cost" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCost)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const InventoryChart: React.FC = () => {
  const inventoryData = [
    { name: 'Poly', stock: 85, safe: 80 },
    { name: 'Wafer', stock: 65, safe: 70 },
    { name: 'Cells', stock: 90, safe: 75 },
    { name: 'Mod', stock: 45, safe: 60 }, // Low stock alert
  ];

  return (
     <div className="h-64 w-full">
      <h4 className="text-slate-300 text-sm mb-4 font-semibold">Inventory Levels vs Safety Stock</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={inventoryData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip 
             cursor={{fill: '#334155', opacity: 0.4}}
             contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
          />
          <Legend />
          <Bar dataKey="stock" fill="#10b981" name="Current Stock" radius={[4, 4, 0, 0]} barSize={30} />
          <Bar dataKey="safe" fill="#64748b" name="Safety Level" radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}