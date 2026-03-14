import React, { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { SupplyNode, NodeStatus, Route } from '../types';

interface NetworkMapProps {
  nodes: SupplyNode[];
  routes: Route[];
  onNodeSelect: (node: SupplyNode) => void;
  selectedNodeId: string | null;
}

const NetworkMap: React.FC<NetworkMapProps> = ({ nodes, routes, onNodeSelect, selectedNodeId }) => {
  const [worldData, setWorldData] = useState<any>(null);
  const width = 800;
  const height = 400;

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(topojson.feature(data, data.objects.countries));
      });
  }, []);

  const projection = useMemo(() => {
    return d3.geoNaturalEarth1()
      .scale(width / 5.5)
      .translate([width / 2, height / 1.8]);
  }, []);

  const pathGenerator = d3.geoPath(projection);

  const countries = useMemo(() => {
    if (!worldData) return null;
    return (
      <path
        d={pathGenerator(worldData) || ''}
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="0.5"
      />
    );
  }, [worldData, pathGenerator]);

  const graticule = useMemo(() => {
    return (
      <path
        d={pathGenerator(d3.geoGraticule()()) || ''}
        fill="none"
        stroke="#1e293b"
        strokeWidth="0.2"
      />
    );
  }, [pathGenerator]);

  const connections = useMemo(() => {
    return routes.map(route => {
      const fromNode = nodes.find(n => n.id === route.fromId);
      const toNode = nodes.find(n => n.id === route.toId);
      if (!fromNode || !toNode) return null;

      const p1 = projection([fromNode.coordinates.lng, fromNode.coordinates.lat]);
      const p2 = projection([toNode.coordinates.lng, toNode.coordinates.lat]);
      if (!p1 || !p2) return null;

      const [x1, y1] = p1;
      const [x2, y2] = p2;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 20;

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
  }, [nodes, routes, projection]);

  const nodeElements = useMemo(() => {
    return nodes.map(node => {
      const coords = projection([node.coordinates.lng, node.coordinates.lat]);
      if (!coords) return null;
      const [x, y] = coords;
      const isSelected = selectedNodeId === node.id;

      return (
        <g 
          key={node.id} 
          className="cursor-pointer transition-all hover:scale-110"
          onClick={() => onNodeSelect(node)}
        >
          {isSelected && (
             <circle
               cx={x}
               cy={y}
               r={8}
               fill={node.status === NodeStatus.OPTIMAL ? '#10b981' : node.status === NodeStatus.WARNING ? '#f59e0b' : '#ef4444'}
               className="opacity-20 animate-pulse"
             />
          )}
          <circle
            cx={x}
            cy={y}
            r={isSelected ? 5 : 4}
            fill={node.status === NodeStatus.OPTIMAL ? '#10b981' : node.status === NodeStatus.WARNING ? '#f59e0b' : '#ef4444'}
            stroke="#fff"
            strokeWidth={isSelected ? 1 : 0.5}
          />
          {isSelected && (
            <text
              x={x}
              y={y - 12}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="bold"
              className="pointer-events-none drop-shadow-md"
            >
              {node.name}
            </text>
          )}
        </g>
      );
    });
  }, [nodes, projection, selectedNodeId, onNodeSelect]);

  return (
    <div className="relative w-full h-[500px] bg-[#020617] rounded-[2rem] border border-white/5 overflow-hidden group">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Graticule */}
        {graticule}
        
        {/* World Map Background */}
        {countries}
        
        {/* Connections */}
        {connections}

        {/* Nodes */}
        {nodeElements}
      </svg>
      
      <div className="absolute top-6 left-6 pointer-events-none">
        <h3 className="text-white font-medium tracking-tight">Geospatial Network Map</h3>
        <p className="text-slate-500 text-xs">2D Digital Twin Projection</p>
      </div>
    </div>
  );
};

export default NetworkMap;
