'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
  id: string;
  label: string;
  name: string;
  group: string;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface GraphVizProps {
  onNodeSelect?: (node: { id: string; label: string; name: string; group: string }) => void;
}

const NODE_COLORS: Record<string, string> = {
  Part: '#3b82f6',
  QAC: '#22c55e',
  Workflow: '#f97316',
  WorkflowStep: '#fb923c',
  Assembly: '#8b5cf6',
  DesignDoc: '#ec4899',
  Engineer: '#06b6d4',
  Vendor: '#eab308',
  Constraint: '#ef4444',
  default: '#6b7280',
};

const LABEL_OPTIONS = [
  'Part', 'Assembly', 'DesignDoc', 'QAC',
  'Workflow', 'WorkflowStep', 'Engineer', 'Vendor', 'Constraint',
];

function getNodeColor(group: string): string {
  return NODE_COLORS[group] ?? NODE_COLORS.default;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function truncateLabel(text: string, max = 20): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

// Module-level label collision tracking
interface LabelBound {
  x: number;
  y: number;
  width: number;
  height: number;
}

let renderedLabelBounds: LabelBound[] = [];
let lastFrameTimestamp = 0;

function overlaps(a: LabelBound, b: LabelBound): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export default function GraphViz({ onNodeSelect }: GraphVizProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const fetchFullGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/graph/neighbors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullGraph: true }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request failed (${res.status}): ${text}`);
      }
      const data: GraphData = await res.json();
      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFullGraph();
  }, [fetchFullGraph]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleNodeClick = useCallback(
    (node: object) => {
      const n = node as GraphNode;
      setHighlightedId(n.id);
      onNodeSelect?.({ id: n.id, label: n.label, name: n.name, group: n.group });
    },
    [onNodeSelect]
  );

  const handleNodeHover = useCallback((node: object | null) => {
    setHoveredNode(node ? (node as GraphNode) : null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const term = searchTerm.trim().toLowerCase();
      if (!term) {
        setHighlightedId(null);
        return;
      }
      const found = graphData.nodes.find(
        (n) => n.id.toLowerCase() === term || n.name.toLowerCase().includes(term)
      );
      if (found) {
        setHighlightedId(found.id);
        onNodeSelect?.({ id: found.id, label: found.label, name: found.name, group: found.group });
      }
    },
    [searchTerm, graphData.nodes, onNodeSelect]
  );

  const displayData = filterLabel
    ? (() => {
        const filteredIds = new Set(
          graphData.nodes.filter((n) => n.group === filterLabel).map((n) => n.id)
        );
        return {
          nodes: graphData.nodes.filter((n) => n.group === filterLabel),
          links: graphData.links.filter((l) => {
            const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
            const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
            return filteredIds.has(src) && filteredIds.has(tgt);
          }),
        };
      })()
    : graphData;

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode;
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const isHighlighted = n.id === highlightedId;
      const isHovered = n.id === hoveredNode?.id;
      const isActive = isHighlighted || isHovered;

      const radius = isActive ? 10 : 6;
      const color = getNodeColor(n.group);

      // Per-frame reset of label collision bounds
      const now = Date.now();
      if (now - lastFrameTimestamp > 16) {
        renderedLabelBounds = [];
        lastFrameTimestamp = now;
      }

      // Outer glow
      const glowAlpha = isActive ? 0.3 : 0.15;
      const glowRadius = radius + 4;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, hexToRgba(color, glowAlpha));
      gradient.addColorStop(1, hexToRgba(color, 0));
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Inner highlight ("glass" effect)
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.15, radius * 0.3, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();

      // White stroke ring for active nodes
      if (isActive) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Smart label rendering
      const rawLabel = n.name || n.id;
      const label = truncateLabel(rawLabel);
      const fontSize = Math.max(11 / globalScale, 2);
      ctx.font = `${fontSize}px "Inter", "Rajdhani", sans-serif`;

      const textWidth = ctx.measureText(label).width;
      const labelX = x - textWidth / 2;
      const labelY = y + radius + 3 / globalScale;
      const labelH = fontSize + 2 / globalScale;

      const bound: LabelBound = {
        x: labelX - 2 / globalScale,
        y: labelY,
        width: textWidth + 4 / globalScale,
        height: labelH,
      };

      const hasOverlap = renderedLabelBounds.some((b) => overlaps(bound, b));
      const shouldRender = isActive || (!hasOverlap && globalScale > 1.5);

      if (shouldRender) {
        // Semi-transparent background pill for readability
        ctx.fillStyle = 'rgba(10,14,23,0.7)';
        ctx.beginPath();
        ctx.roundRect(
          bound.x, bound.y,
          bound.width, bound.height,
          2 / globalScale
        );
        ctx.fill();

        ctx.fillStyle = isActive ? '#ffffff' : hexToRgba(color, 0.9);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x, labelY + 1 / globalScale);

        if (!isActive) {
          renderedLabelBounds.push(bound);
        }
      }
    },
    [highlightedId, hoveredNode]
  );

  const nodeCounts = graphData.nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.group] = (acc[n.group] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #0f172a 0%, #0a0e17 70%)',
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Loading overlay */}
      {loading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-30"
          style={{ background: 'rgba(10,14,23,0.85)' }}
        >
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin mb-3"
            style={{
              borderColor: 'rgba(0,212,255,0.2)',
              borderTopColor: '#00d4ff',
            }}
          />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
            LOADING GRAPH DATA
          </span>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div
            className="rounded-lg px-6 py-5 max-w-sm text-center"
            style={{
              background: 'rgba(15,23,42,0.9)',
              border: '1px solid rgba(239,68,68,0.4)',
              boxShadow: '0 0 30px rgba(239,68,68,0.1)',
            }}
          >
            <p style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 600, marginBottom: 4 }}>
              CONNECTION ERROR
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: 12 }}>{error}</p>
            <button
              onClick={fetchFullGraph}
              className="px-4 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                color: '#ef4444',
              }}
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <p style={{ color: '#64748b', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
            NO NODES DETECTED
          </p>
        </div>
      )}

      {/* Force graph */}
      <ForceGraph2D
        graphData={displayData}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        linkColor={() => 'rgba(0,212,255,0.12)'}
        linkWidth={1.5}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => '#00d4ff'}
        linkDirectionalParticleSpeed={0.005}
        backgroundColor="transparent"
        nodeRelSize={6}
        cooldownTime={3000}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

      {/* Search — top left floating panel */}
      <div
        className="absolute top-4 left-4 z-20"
        style={{ width: 280 }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              className="w-full text-sm outline-none"
              style={{
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(148,163,184,0.1)',
                borderRadius: 6,
                padding: '7px 12px 7px 32px',
                color: '#e2e8f0',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 0 0 0 transparent',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0,212,255,0.5)';
                e.target.style.boxShadow = '0 0 12px rgba(0,212,255,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(148,163,184,0.1)';
                e.target.style.boxShadow = '0 0 0 0 transparent';
              }}
            />
            {/* Search icon */}
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth={2}
            >
              <circle cx={11} cy={11} r={8} />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded text-xs font-semibold tracking-wider transition-all"
            style={{
              background: 'rgba(0,212,255,0.12)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: '#00d4ff',
            }}
          >
            FIND
          </button>
          {highlightedId && (
            <button
              type="button"
              onClick={() => setHighlightedId(null)}
              className="px-2 py-1.5 rounded text-xs transition-all"
              style={{
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(148,163,184,0.1)',
                color: '#94a3b8',
              }}
            >
              ✕
            </button>
          )}
        </form>
      </div>

      {/* Filter chips — top right floating panel */}
      <div
        className="absolute top-4 right-4 z-20 flex flex-col gap-1.5"
        style={{ maxWidth: 200 }}
      >
        <div
          className="rounded-lg px-3 py-2.5"
          style={{
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(148,163,184,0.1)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <p
            className="text-xs mb-2 tracking-widest"
            style={{ color: '#64748b' }}
          >
            FILTER
          </p>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterLabel('')}
              className="px-2 py-0.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: !filterLabel ? 'rgba(0,212,255,0.15)' : 'rgba(148,163,184,0.08)',
                border: !filterLabel
                  ? '1px solid rgba(0,212,255,0.4)'
                  : '1px solid rgba(148,163,184,0.1)',
                color: !filterLabel ? '#00d4ff' : '#94a3b8',
              }}
            >
              All ({graphData.nodes.length})
            </button>
            {LABEL_OPTIONS.map((lbl) => (
              <button
                key={lbl}
                onClick={() => setFilterLabel(filterLabel === lbl ? '' : lbl)}
                className="px-2 py-0.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background:
                    filterLabel === lbl
                      ? hexToRgba(getNodeColor(lbl), 0.25)
                      : hexToRgba(getNodeColor(lbl), 0.1),
                  border:
                    filterLabel === lbl
                      ? `1px solid ${hexToRgba(getNodeColor(lbl), 0.7)}`
                      : `1px solid ${hexToRgba(getNodeColor(lbl), 0.25)}`,
                  color:
                    filterLabel && filterLabel !== lbl
                      ? '#64748b'
                      : getNodeColor(lbl),
                  opacity: filterLabel && filterLabel !== lbl ? 0.5 : 1,
                }}
              >
                {lbl} ({nodeCounts[lbl] ?? 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats — bottom left */}
      <div
        className="absolute bottom-4 left-4 z-20"
        style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(148,163,184,0.1)',
          borderRadius: 8,
          padding: '8px 14px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex gap-4">
          <div>
            <span
              className="block text-xs tracking-widest"
              style={{ color: '#64748b' }}
            >
              NODES
            </span>
            <span
              className="block text-base font-mono font-semibold"
              style={{ color: '#00d4ff' }}
            >
              {filterLabel ? displayData.nodes.length : graphData.nodes.length}
            </span>
          </div>
          <div
            style={{
              width: 1,
              background: 'rgba(148,163,184,0.1)',
              alignSelf: 'stretch',
            }}
          />
          <div>
            <span
              className="block text-xs tracking-widest"
              style={{ color: '#64748b' }}
            >
              LINKS
            </span>
            <span
              className="block text-base font-mono font-semibold"
              style={{ color: '#3b82f6' }}
            >
              {filterLabel ? displayData.links.length : graphData.links.length}
            </span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div
          className="pointer-events-none absolute z-30"
          style={{
            left: mousePos.x + 15,
            top: mousePos.y + 15,
            minWidth: 180,
            maxWidth: 240,
            background: 'rgba(15,23,42,0.92)',
            border: `1px solid ${hexToRgba(getNodeColor(hoveredNode.group), 0.4)}`,
            borderRadius: 8,
            padding: '10px 14px',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 24px ${hexToRgba(getNodeColor(hoveredNode.group), 0.15)}`,
            opacity: 1,
            transform: 'translateY(0)',
            transition: 'opacity 0.15s ease, transform 0.15s ease',
          }}
        >
          <p
            className="font-semibold text-sm leading-tight mb-1"
            style={{
              color: '#e2e8f0',
              fontFamily: '"Rajdhani", "Inter", sans-serif',
              letterSpacing: '0.02em',
            }}
          >
            {truncateLabel(hoveredNode.name || hoveredNode.id, 30)}
          </p>
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-2"
            style={{
              background: hexToRgba(getNodeColor(hoveredNode.group), 0.2),
              border: `1px solid ${hexToRgba(getNodeColor(hoveredNode.group), 0.4)}`,
              color: getNodeColor(hoveredNode.group),
            }}
          >
            {hoveredNode.group}
          </span>
          <p
            className="text-xs font-mono mt-1 break-all"
            style={{ color: '#00d4ff', opacity: 0.7 }}
          >
            {hoveredNode.id}
          </p>
        </div>
      )}
    </div>
  );
}
