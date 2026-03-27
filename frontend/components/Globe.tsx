import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { SupplyNode, NodeStatus, Route } from '../types';
import { reverseGeocode } from '../utils/geocoding';
import { Play, Pause, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface GlobeProps {
  nodes: SupplyNode[];
  routes: Route[];
  onNodeSelect: (node: SupplyNode) => void;
  selectedNodeId: string | null;
  onNodeDrop?: (nodeId: string, lat: number, lng: number, locationName: string) => void;
}

const Globe: React.FC<GlobeProps> = ({ nodes, routes, onNodeSelect, selectedNodeId, onNodeDrop }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const rotationRef = useRef([0, -30]);
  const isDragging = useRef(false);
  const [manualPaused, setManualPaused] = useState(false);
  const isAutoPaused = useRef(false);
  const targetZoom = useRef(1);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const projectionRef = useRef<d3.GeoProjection | null>(null);

  // Handle zooming to selected node
  useEffect(() => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node && node.coordinates.lat && node.coordinates.lng) {
        isAutoPaused.current = true;
        const targetRotation = [-node.coordinates.lng, -node.coordinates.lat];
        
        let frameId: number;
        const animate = () => {
          const dx = targetRotation[0] - rotationRef.current[0];
          const dy = targetRotation[1] - rotationRef.current[1];
          
          rotationRef.current[0] += dx * 0.05;
          rotationRef.current[1] += dy * 0.05;
          targetZoom.current = 2.5;

          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            frameId = requestAnimationFrame(animate);
          }
        };
        animate();
        return () => cancelAnimationFrame(frameId);
      }
    } else {
      isAutoPaused.current = false;
      targetZoom.current = 1;
    }
  }, [selectedNodeId, nodes]);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(topojson.feature(data, data.objects.countries));
      });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      
      rotationRef.current[0] += dx * 0.5;
      rotationRef.current[1] -= dy * 0.5;
      rotationRef.current[1] = Math.max(-90, Math.min(90, rotationRef.current[1]));
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!worldData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;

    const projection = d3.geoOrthographic()
      .scale(width / 2.2)
      .translate([width / 2, height / 2])
      .clipAngle(90);
      
    projectionRef.current = projection;

    const path = d3.geoPath(projection, context);

    let animationFrameId: number;

    const render = () => {
      context.clearRect(0, 0, width, height);

      // Interpolate zoom
      const currentScale = projection.scale();
      const targetScale = (width / 2.2) * targetZoom.current;
      projection.scale(currentScale + (targetScale - currentScale) * 0.05);

      // Auto-rotate only if not dragging and not paused
      if (!isDragging.current && !manualPaused && !isAutoPaused.current) {
        rotationRef.current[0] += 0.1;
      }
      
      projection.rotate([rotationRef.current[0], rotationRef.current[1]]);

      // Draw Sphere (Water)
      context.beginPath();
      context.arc(width / 2, height / 2, projection.scale(), 0, 2 * Math.PI);
      context.fillStyle = '#020617';
      context.fill();
      context.strokeStyle = '#1e293b';
      context.lineWidth = 1;
      context.stroke();

      // Draw Countries
      context.beginPath();
      path(worldData);
      context.fillStyle = '#0f172a';
      context.fill();
      context.strokeStyle = '#334155';
      context.lineWidth = 0.5;
      context.stroke();

      // Draw Graticule
      context.beginPath();
      path(d3.geoGraticule()());
      context.strokeStyle = '#1e293b';
      context.lineWidth = 0.2;
      context.stroke();

      // Draw Routes
      routes.forEach(route => {
        const fromNode = nodes.find(n => n.id === route.fromId);
        const toNode = nodes.find(n => n.id === route.toId);
        
        if (fromNode?.coordinates.lat && fromNode?.coordinates.lng && 
            toNode?.coordinates.lat && toNode?.coordinates.lng) {
          
          context.beginPath();
          path({
            type: 'LineString',
            coordinates: [
              [fromNode.coordinates.lng, fromNode.coordinates.lat],
              [toNode.coordinates.lng, toNode.coordinates.lat]
            ]
          });
          context.strokeStyle = '#3b82f6';
          context.lineWidth = 1;
          context.setLineDash([5, 5]);
          context.globalAlpha = 0.4;
          context.stroke();
          context.setLineDash([]);
          context.globalAlpha = 1.0;
        }
      });

      // Draw Nodes
      nodes.forEach(node => {
        if (!node.coordinates.lat || !node.coordinates.lng) return;
        
        const coords = projection([node.coordinates.lng, node.coordinates.lat]);
        if (!coords) return;

        const isVisible = d3.geoDistance([node.coordinates.lng, node.coordinates.lat], [-rotationRef.current[0], -rotationRef.current[1]]) < Math.PI / 2;
        
        if (isVisible) {
          const isSelected = selectedNodeId === node.id;
          const color = getNodeColor(node.status);

          if (isSelected || node.status === NodeStatus.CRITICAL) {
            context.beginPath();
            context.arc(coords[0], coords[1], isSelected ? 8 : 6, 0, 2 * Math.PI);
            context.fillStyle = color;
            context.globalAlpha = 0.3;
            context.fill();
            context.globalAlpha = 1.0;
          }

          context.beginPath();
          context.arc(coords[0], coords[1], isSelected ? 4 : 3, 0, 2 * Math.PI);
          context.fillStyle = color;
          context.fill();
          context.strokeStyle = '#fff';
          context.lineWidth = isSelected ? 1 : 0.5;
          context.stroke();

          if (isSelected) {
            context.fillStyle = '#fff';
            context.font = '10px Inter';
            context.textAlign = 'center';
            context.fillText(node.name, coords[0], coords[1] - 10);
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [worldData, nodes, routes, selectedNodeId, manualPaused]);

  const getNodeColor = (status: NodeStatus) => {
    switch (status) {
      case NodeStatus.OPTIMAL: return '#10b981';
      case NodeStatus.WARNING: return '#f59e0b';
      case NodeStatus.CRITICAL: return '#ef4444';
      case NodeStatus.OFFLINE: return '#64748b';
      default: return '#cbd5e1';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const nodeId = e.dataTransfer.getData('nodeId');
    if (!nodeId || !canvasRef.current || !projectionRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    const coords = projectionRef.current.invert?.([canvasX, canvasY]);
    
    if (coords && onNodeDrop) {
      const [lng, lat] = coords;
      const locationName = await reverseGeocode(lat, lng) || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
      onNodeDrop(nodeId, lat, lng, locationName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden group"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        className="w-full h-full max-w-full max-h-full cursor-grab active:cursor-grabbing"
      />

      {/* Globe Controls */}
      <div className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none">
        <h3 className="text-white font-medium tracking-tight">Global Network</h3>
        <p className="text-slate-500 text-xs">Live Telemetry Feed</p>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setManualPaused(!manualPaused)}
          className="p-2 hover:bg-white/10 rounded-lg text-white transition-all"
          title={manualPaused ? "Play Rotation" : "Pause Rotation"}
        >
          {manualPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button
          onClick={() => targetZoom.current = Math.min(targetZoom.current + 0.5, 5)}
          className="p-2 hover:bg-white/10 rounded-lg text-white transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => targetZoom.current = Math.max(targetZoom.current - 0.5, 0.5)}
          className="p-2 hover:bg-white/10 rounded-lg text-white transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            targetZoom.current = 1;
            rotationRef.current = [0, -30];
            setManualPaused(false);
          }}
          className="p-2 hover:bg-white/10 rounded-lg text-white transition-all"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          System Active
        </div>
      </div>
    </div>
  );
};

export default Globe;
