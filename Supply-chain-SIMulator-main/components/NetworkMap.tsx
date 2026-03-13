import React, { useMemo } from 'react';
import { SupplyNode, NodeType, NodeStatus, Route } from '../types';

interface NetworkMapProps {
  nodes: SupplyNode[];
  routes: Route[];
  onNodeSelect: (node: SupplyNode) => void;
  selectedNodeId: string | null;
}

const NetworkMap: React.FC<NetworkMapProps> = ({ nodes, routes, onNodeSelect, selectedNodeId }) => {
  // Simple 2D World Map SVG path (simplified)
  const worldMapPath = "M150,150 L160,140 L170,145 L180,130 L200,135 L210,120 L230,125 L250,110 L270,115 L290,100 L310,105 L330,90 L350,95 L370,80 L390,85 L410,70 L430,75 L450,60 L470,65 L490,50 L510,55 L530,40 L550,45 L570,30 L590,35 L610,20 L630,25 L650,10 L670,15 L690,0 L710,5 L730,-10 L750,-5 L770,-20 L790,-15 L810,-30 L830,-25 L850,-40 L870,-35 L890,-50 L910,-45 L930,-60 L950,-55 L970,-70 L990,-65 L1010,-80 L1030,-75 L1050,-90 L1070,-85 L1090,-100 L1110,-95 L1130,-110 L1150,-105 L1170,-120 L1190,-115 L1210,-130 L1230,-125 L1250,-140 L1270,-135 L1290,-150 L1310,-145 L1330,-160 L1350,-155 L1370,-170 L1390,-165 L1410,-180 L1430,-175 L1450,-190 L1470,-185 L1490,-200"; // Placeholder

  // Better approach: use a real GeoJSON or a stylized background
  // For brevity and effectiveness, I'll use a stylized SVG background that looks like a map

  const connections = useMemo(() => {
    return routes.map(route => {
      const fromNode = nodes.find(n => n.id === route.fromId);
      const toNode = nodes.find(n => n.id === route.toId);
      if (!fromNode || !toNode) return null;

      // Project lat/lng to 2D space (simple linear projection for demo)
      const x1 = (fromNode.coordinates.lng + 180) * (800 / 360);
      const y1 = (90 - fromNode.coordinates.lat) * (400 / 180);
      const x2 = (toNode.coordinates.lng + 180) * (800 / 360);
      const y2 = (90 - toNode.coordinates.lat) * (400 / 180);

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 30;

      return (
        <path
          key={route.id}
          d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          className="opacity-40"
        />
      );
    });
  }, [nodes, routes]);

  return (
    <div className="relative w-full h-[500px] bg-[#020617] rounded-[2rem] border border-white/5 overflow-hidden group">
      <svg viewBox="0 0 800 400" className="w-full h-full">
        {/* Stylized World Map Background */}
        <rect width="800" height="400" fill="#020617" />
        <path 
          d="M100,100 Q150,50 200,100 T300,150 T400,100 T500,200 T600,150 T700,100" 
          fill="none" 
          stroke="#1e293b" 
          strokeWidth="2" 
          opacity="0.2" 
        />
        
        {/* Connections */}
        {connections}

        {/* Nodes */}
        {nodes.map(node => {
          const x = (node.coordinates.lng + 180) * (800 / 360);
          const y = (90 - node.coordinates.lat) * (400 / 180);
          const isSelected = selectedNodeId === node.id;

          return (
            <g 
              key={node.id} 
              className="cursor-pointer transition-all hover:scale-110"
              onClick={() => onNodeSelect(node)}
            >
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 6 : 4}
                fill={node.status === NodeStatus.OPTIMAL ? '#10b981' : node.status === NodeStatus.WARNING ? '#f59e0b' : '#ef4444'}
                className={isSelected ? 'animate-pulse' : ''}
              />
              {isSelected && (
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {node.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      
      <div className="absolute top-6 left-6 pointer-events-none">
        <h3 className="text-white font-medium tracking-tight">Geospatial Network Map</h3>
        <p className="text-slate-500 text-xs">2D Digital Twin Projection</p>
      </div>
    </div>
  );
};

export default NetworkMap;
