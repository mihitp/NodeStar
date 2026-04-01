'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
  id: string;
  label: string;
  name: string;
  group: string;
  [key: string]: unknown;
}

interface GraphLink {
  source: string;
  target: string;
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

function getNodeColor(group: string): string {
  return NODE_COLORS[group] ?? NODE_COLORS.default;
}

const DEFAULT_NODE_ID = 'PART-001';
const DEFAULT_NODE_LABEL = 'Part';

export default function GraphViz({ onNodeSelect }: GraphVizProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState(DEFAULT_NODE_ID);
  const [searchLabel, setSearchLabel] = useState(DEFAULT_NODE_LABEL);
  const [inputId, setInputId] = useState(DEFAULT_NODE_ID);
  const [inputLabel, setInputLabel] = useState(DEFAULT_NODE_LABEL);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const fetchGraph = useCallback(async (nodeId: string, nodeLabel: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/graph/neighbors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, nodeLabel, depth: 2 }),
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
    fetchGraph(searchId, searchLabel);
  }, [fetchGraph, searchId, searchLabel]);

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
      onNodeSelect?.({ id: n.id, label: n.label, name: n.name, group: n.group });
    },
    [onNodeSelect]
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearchId(inputId.trim());
      setSearchLabel(inputLabel.trim());
    },
    [inputId, inputLabel]
  );

  const paintNode = useCallback((node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode & { x?: number; y?: number };
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    const radius = 6;
    const color = getNodeColor(n.group);
    const fontSize = Math.max(10 / globalScale, 2);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1 / globalScale;
    ctx.stroke();

    const label = n.name || n.id;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y + radius + 2 / globalScale);
  }, []);

  return (
    <div className="flex flex-col w-full h-full">
      <form onSubmit={handleSearch} className="flex gap-2 p-2 bg-gray-900 border-b border-gray-700 shrink-0">
        <input
          type="text"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          placeholder="Node ID (e.g. PART-001)"
          className="flex-1 px-3 py-1.5 rounded bg-gray-800 text-gray-100 border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={inputLabel}
          onChange={(e) => setInputLabel(e.target.value)}
          placeholder="Label (e.g. Part)"
          className="w-36 px-3 py-1.5 rounded bg-gray-800 text-gray-100 border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
        >
          Explore
        </button>
      </form>

      <div ref={containerRef} className="flex-1 relative w-full bg-gray-950 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-950/70">
            <span className="text-gray-300 text-sm">Loading graph...</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-red-900/80 border border-red-600 rounded-lg px-6 py-4 max-w-sm text-center">
              <p className="text-red-300 text-sm font-medium">Error loading graph</p>
              <p className="text-red-400 text-xs mt-1">{error}</p>
              <button
                onClick={() => fetchGraph(searchId, searchLabel)}
                className="mt-3 px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {!loading && !error && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No nodes found for the given query.</p>
          </div>
        )}
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => 'replace'}
          onNodeClick={handleNodeClick}
          linkColor={() => 'rgba(156,163,175,0.4)'}
          linkWidth={1}
          backgroundColor="#030712"
          nodeRelSize={6}
        />
      </div>
    </div>
  );
}
