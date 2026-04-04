import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { SupplyNode, NodeStatus, Route } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { getTierColor, getTierLabel } from '../utils/tierClassifier';

interface NetworkMapProps {
  nodes: SupplyNode[];
  routes: Route[];
  onNodeSelect: (node: SupplyNode) => void;
  selectedNodeId: string | null;
}

const NetworkMap: React.FC<NetworkMapProps> = ({ nodes, routes, onNodeSelect, selectedNodeId }) => {
  const theme = useTheme();
  const [worldData, setWorldData] = useState<any>(null);
  const width = 800;
  const height = 400;

  // Zoom & pan state
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 8;

  // Keep refs in sync so the wheel handler always has current values
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  // Convert screen coordinates to SVG viewBox coordinates (handles preserveAspectRatio)
  const screenToSVG = useCallback((svg: SVGSVGElement, clientX: number, clientY: number) => {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return point.matrixTransform(ctm.inverse());
  }, []);

  // Attach wheel listener with { passive: false } so preventDefault actually stops page scroll
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x: mouseX, y: mouseY } = screenToSVG(svg, e.clientX, e.clientY);

      const curZoom = zoomRef.current;
      const curPan = panRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, curZoom * zoomFactor));
      if (newZoom === curZoom) return;

      const scale = newZoom / curZoom;
      let newPan = {
        x: mouseX - scale * (mouseX - curPan.x),
        y: mouseY - scale * (mouseY - curPan.y),
      };

      if (newZoom <= 1) {
        newPan = { x: 0, y: 0 };
      }

      setZoom(newZoom);
      setPan(newPan);
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [screenToSVG]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - panStart.current.x) / rect.width) * width;
    const dy = ((e.clientY - panStart.current.y) / rect.height) * height;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

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
          stroke={theme.accent}
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

      const tierColor = getTierColor(node.supplyChainTier);
      const tierLabel = node.isFocalCompany ? 'OEM'
        : node.supplyChainTier !== undefined ? (node.supplyChainTier > 0 ? `T${node.supplyChainTier}` : node.supplyChainTier < 0 ? `D${Math.abs(node.supplyChainTier)}` : 'OEM')
        : null;

      return (
        <g
          key={node.id}
          className="cursor-pointer transition-all hover:scale-110"
          onClick={() => onNodeSelect(node)}
        >
          {/* Tier ring — outer ring colored by supply chain tier */}
          {tierLabel && (
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 8 : 6.5}
              fill="none"
              stroke={tierColor}
              strokeWidth={1.5}
              opacity={0.7}
            />
          )}
          {isSelected && (
            <circle
              cx={x}
              cy={y}
              r={11}
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
          {/* Tier badge label — always visible */}
          {tierLabel && (
            <text
              x={x + 7}
              y={y - 5}
              textAnchor="start"
              fill={tierColor}
              fontSize="5.5"
              fontWeight="bold"
              className="pointer-events-none"
              opacity={0.9}
            >
              {tierLabel}
            </text>
          )}
          {isSelected && (
            <text
              x={x}
              y={y - 14}
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
    <div className="relative w-full h-[250px] sm:h-[350px] md:h-[500px] bg-[#020617] rounded-[2rem] border border-white/5 overflow-hidden group">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: '0 0' }}>
          {/* Graticule */}
          {graticule}

          {/* World Map Background */}
          {countries}

          {/* Connections */}
          {connections}

          {/* Nodes */}
          {nodeElements}
        </g>
      </svg>

      <div className="absolute top-6 left-6 pointer-events-none">
        <h3 className="text-white font-medium tracking-tight">Geospatial Network Map</h3>
        <p className="text-slate-500 text-xs">2D Digital Twin Projection</p>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => {
            setZoom(prev => {
              const newZoom = Math.min(MAX_ZOOM, prev * 1.3);
              const scale = newZoom / prev;
              setPan(p => ({
                x: width / 2 - scale * (width / 2 - p.x),
                y: height / 2 - scale * (height / 2 - p.y),
              }));
              return newZoom;
            });
          }}
          className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center justify-center transition-colors"
          title="Zoom in"
        >+</button>
        <button
          onClick={() => {
            setZoom(prev => {
              const newZoom = Math.max(MIN_ZOOM, prev / 1.3);
              if (newZoom <= 1) { setPan({ x: 0, y: 0 }); return 1; }
              const scale = newZoom / prev;
              setPan(p => ({
                x: width / 2 - scale * (width / 2 - p.x),
                y: height / 2 - scale * (height / 2 - p.y),
              }));
              return newZoom;
            });
          }}
          className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center justify-center transition-colors"
          title="Zoom out"
        >−</button>
        {zoom > 1 && (
          <button
            onClick={resetZoom}
            className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-medium flex items-center justify-center transition-colors mt-0.5"
            title="Reset zoom"
          >1:1</button>
        )}
      </div>

      {zoom > 1 && (
        <div className="absolute bottom-4 left-6 text-[10px] text-slate-500 pointer-events-none">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
};

export default NetworkMap;
