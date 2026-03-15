import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Globe from './components/Globe';
import NetworkBuilder from './components/NetworkBuilder';
import SimulationEngine from './components/SimulationEngine';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import ScenariosView from './components/ScenariosView';
import OptimizationView from './components/OptimizationView';
import RiskAnalysisView from './components/RiskAnalysisView';
import { SupplyNode, NodeType, NodeStatus, Route, TransportMode, KPI, SimulationParams } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Network, PlayCircle, BarChart3, Settings, Layers, Zap, ShieldAlert, Activity, Globe as GlobeIcon } from 'lucide-react';

const INITIAL_NODES: SupplyNode[] = [];
const INITIAL_ROUTES: Route[] = [];

const INITIAL_PARAMS: SimulationParams = {
  unitProductionCost: 100,
  procurementCost: 50,
  transportationCost: 20,
  inventoryCarryingCost: 5,
  stockoutPenalty: 200,
  expeditingCost: 150,
  warehousingCost: 10,
  workingCapitalCost: 8,
  currencyExchangeRate: 1,
  inflationRate: 2,
  supplierFailureProb: 0.01,
  naturalDisasterProb: 0.001,
  portCongestionProb: 0.05,
  transportDelayProb: 0.02,
  laborStrikeProb: 0.01,
  cyberRisk: 0.005,
  qualityRecallProb: 0.002,
  demandShockProb: 0.01,
  pandemicFactor: 0,
  recoveryTime: 14,
  mtsMtoRatio: 0.8,
  postponementEnabled: false,
  inventoryPooling: false,
  multiSourcing: true,
  nearshoring: false,
  dynamicPricing: false,
  forecastAccuracy: 85,
  forecastUpdateFrequency: 30,
  bullwhipFactor: 1.2,
  collaborationLevel: 50
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [nodes, setNodes] = useState<SupplyNode[]>(INITIAL_NODES);
  const [routes, setRoutes] = useState<Route[]>(INITIAL_ROUTES);
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const [selectedNode, setSelectedNode] = useState<SupplyNode | null>(null);

  // Dynamic KPI Calculations
  const networkHealth = Math.round(
    (nodes.filter(n => n.status === NodeStatus.OPTIMAL).length / nodes.length) * 100
  );
  const activeShipments = routes.length * 123; // Simulated dynamic count
  const riskLevel = nodes.some(n => n.status === NodeStatus.CRITICAL) ? 'HIGH' : 
                   nodes.some(n => n.status === NodeStatus.WARNING) ? 'MED' : 'LOW';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-12 gap-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Left Column: Stats & Globe */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 rounded-3xl border border-white/5 p-8 hover:border-white/10 transition-all group">
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Network Health</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-bold text-white tracking-tighter">{networkHealth}<span className="text-white/20 text-xl">%</span></h3>
                    <div className="mb-1 text-emerald-400 text-xs font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-emerald-400" />
                      {networkHealth > 90 ? '+2.4%' : '-1.2%'}
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-3xl border border-white/5 p-8 hover:border-white/10 transition-all group">
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Active Shipments</p>
                  <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-bold text-white tracking-tighter">{activeShipments.toLocaleString()}</h3>
                    <div className="mb-1 text-white/40 text-xs font-medium">In Transit</div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-3xl border border-white/5 p-8 hover:border-white/10 transition-all group">
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2">Risk Level</p>
                  <div className="flex items-end gap-2">
                    <h3 className={`text-4xl font-bold tracking-tighter ${riskLevel === 'HIGH' ? 'text-red-500' : riskLevel === 'MED' ? 'text-amber-500' : 'text-white'}`}>
                      {riskLevel}
                    </h3>
                    <div className={`mb-1 text-xs font-medium ${riskLevel === 'LOW' ? 'text-emerald-400' : 'text-white/40'}`}>
                      {riskLevel === 'LOW' ? 'Stable' : 'Unstable'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 flex-1">
                <div className="flex-1 min-h-[500px] relative">
                  <Globe 
                    nodes={nodes} 
                    routes={routes}
                    onNodeSelect={setSelectedNode} 
                    selectedNodeId={selectedNode?.id || null} 
                    onNodeDrop={(nodeId, lat, lng, locationName) => {
                      setNodes(prev => prev.map(n => 
                        n.id === nodeId 
                          ? { ...n, coordinates: { ...n.coordinates, lat, lng }, location: locationName }
                          : n
                      ));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Node Details & Activity */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
              <div className="bg-[#050505] rounded-3xl border border-white/5 p-8 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-white/40" />
                    System Telemetry
                  </h3>
                  <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] text-white/60 font-mono">
                    LIVE FEED
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {selectedNode ? (
                    <motion.div 
                      key={selectedNode.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                          <GlobeIcon className="w-8 h-8 text-black" />
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-white tracking-tight">{selectedNode.name}</h4>
                          <p className="text-white/40 text-sm">{selectedNode.location} • {selectedNode.type}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Inventory</p>
                          <p className="text-2xl font-bold text-white">{selectedNode.inventoryLevel.toLocaleString()}</p>
                          <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white transition-all duration-1000" 
                              style={{ width: `${(selectedNode.inventoryLevel / selectedNode.maxCapacity) * 100}%` }} 
                            />
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Utilization</p>
                          <p className="text-2xl font-bold text-white">
                            {Math.round((selectedNode.inventoryLevel / selectedNode.maxCapacity) * 100)}%
                          </p>
                          <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white transition-all duration-1000" 
                              style={{ width: `${(selectedNode.inventoryLevel / selectedNode.maxCapacity) * 100}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h5 className="text-[10px] text-white/40 uppercase tracking-widest">Performance Metrics</h5>
                        {[
                          { label: 'Safety Stock', value: selectedNode.safetyStock },
                          { label: 'Reorder Point', value: selectedNode.reorderPoint },
                          { label: 'Target Service', value: `${selectedNode.targetServiceLevel}%` },
                        ].map((stat, i) => (
                          <div key={i} className="flex items-center justify-between py-3 border-b border-white/5">
                            <span className="text-sm text-white/60">{stat.label}</span>
                            <span className="text-sm text-white font-mono">{stat.value}</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => setSelectedNode(null)}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all text-sm font-medium"
                      >
                        Deselect Node
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col"
                    >
                      <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-4">Select Node for Telemetry</p>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {nodes.map(node => (
                          <div 
                            key={node.id}
                            onClick={() => setSelectedNode(node)}
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-white truncate">{node.name}</span>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.status === 'OPTIMAL' ? '#10b981' : node.status === 'WARNING' ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <p className="text-xs text-white/40 truncate">{node.location} • {node.type}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );
      case 'builder':
        return <NetworkBuilder nodes={nodes} routes={routes} setNodes={setNodes} setRoutes={setRoutes} />;
      case 'simulation':
        return <SimulationEngine nodes={nodes} routes={routes} setNodes={setNodes} />;
      case 'analytics':
        return <AnalyticsView />;
      case 'scenarios':
        return <ScenariosView nodes={nodes} routes={routes} setNodes={setNodes} setRoutes={setRoutes} params={params} setParams={setParams} />;
      case 'optimization':
        return <OptimizationView nodes={nodes} routes={routes} />;
      case 'risk':
        return <RiskAnalysisView nodes={nodes} routes={routes} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <div className="text-white">Coming Soon</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-black selection:bg-white selection:text-black">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-12 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">Production Environment • v4.2.0</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-white/10" />
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center text-[10px] font-bold text-black">
                +12
              </div>
            </div>
            <button className="px-6 py-2 bg-white text-black text-xs font-bold rounded-full hover:scale-105 transition-transform">
              DEPLOY CHANGES
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
