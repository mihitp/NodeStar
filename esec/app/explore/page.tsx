'use client';

import { useState } from 'react';
import GraphViz from '@/components/GraphViz';

interface SelectedNode {
  id: string;
  label: string;
  name: string;
  group: string;
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface DetailPanelProps {
  node: SelectedNode;
  onClose: () => void;
}

function DetailPanel({ node, onClose }: DetailPanelProps) {
  const color = getNodeColor(node.group);

  return (
    <div
      className="fixed right-0 bottom-0 z-20 flex flex-col"
      style={{
        top: 57,
        width: 360,
        background: 'rgba(15,23,42,0.95)',
        borderLeft: `1px solid ${hexToRgba(color, 0.35)}`,
        borderTop: `1px solid rgba(148,163,184,0.08)`,
        backdropFilter: 'blur(16px)',
        boxShadow: `-8px 0 40px ${hexToRgba(color, 0.08)}, inset 1px 0 0 ${hexToRgba(color, 0.1)}`,
        transform: 'translateX(0)',
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          height: 2,
          background: `linear-gradient(90deg, ${color} 0%, transparent 100%)`,
          opacity: 0.7,
        }}
      />

      {/* Header */}
      <div
        className="flex items-start justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}
      >
        <div className="flex-1 min-w-0 pr-3">
          {/* Type badge */}
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wider mb-2"
            style={{
              background: hexToRgba(color, 0.15),
              border: `1px solid ${hexToRgba(color, 0.4)}`,
              color: color,
            }}
          >
            {node.group.toUpperCase()}
          </span>

          {/* Node name */}
          <h2
            className="text-lg font-semibold leading-tight break-words"
            style={{
              color: '#e2e8f0',
              fontFamily: '"Rajdhani", "Inter", sans-serif',
              letterSpacing: '0.03em',
            }}
          >
            {node.name || node.id}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded transition-all mt-0.5"
          style={{
            background: 'rgba(148,163,184,0.06)',
            border: '1px solid rgba(148,163,184,0.1)',
            color: '#64748b',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(148,163,184,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(148,163,184,0.06)';
            (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
          }}
          aria-label="Close panel"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Node ID */}
        <div>
          <p
            className="text-xs tracking-widest mb-1.5"
            style={{ color: '#64748b' }}
          >
            NODE ID
          </p>
          <p
            className="text-sm font-mono break-all px-3 py-2 rounded"
            style={{
              color: '#00d4ff',
              background: 'rgba(0,212,255,0.05)',
              border: '1px solid rgba(0,212,255,0.1)',
            }}
          >
            {node.id}
          </p>
        </div>

        {/* Label */}
        <div>
          <p
            className="text-xs tracking-widest mb-1.5"
            style={{ color: '#64748b' }}
          >
            LABEL
          </p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            {node.label || '—'}
          </p>
        </div>

        {/* Name */}
        {node.name && node.name !== node.id && (
          <div>
            <p
              className="text-xs tracking-widest mb-1.5"
              style={{ color: '#64748b' }}
            >
              NAME
            </p>
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              {node.name}
            </p>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(148,163,184,0.08)' }} />

        {/* Color swatch + type info */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md shrink-0"
            style={{
              background: hexToRgba(color, 0.2),
              border: `1px solid ${hexToRgba(color, 0.5)}`,
              boxShadow: `0 0 12px ${hexToRgba(color, 0.3)}`,
            }}
          />
          <div>
            <p className="text-xs" style={{ color: '#64748b' }}>Node type</p>
            <p className="text-sm font-medium" style={{ color: color }}>
              {node.group}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-5 py-4"
        style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}
      >
        <button
          className="w-full py-2.5 rounded text-sm font-semibold tracking-wider transition-all"
          style={{
            background: hexToRgba(color, 0.1),
            border: `1px solid ${hexToRgba(color, 0.35)}`,
            color: color,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = hexToRgba(color, 0.2);
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${hexToRgba(color, 0.2)}`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = hexToRgba(color, 0.1);
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          EXPLORE NEIGHBORS
        </button>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  return (
    <div
      className="flex-1 min-h-0 relative"
      style={{ background: '#0a0e17' }}
    >
      <GraphViz onNodeSelect={setSelectedNode} />

      {/* Detail panel — slides in from right when a node is selected */}
      <div
        style={{
          position: 'fixed',
          top: 57,
          right: 0,
          bottom: 0,
          width: 360,
          transform: selectedNode ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          zIndex: 20,
          pointerEvents: selectedNode ? 'auto' : 'none',
        }}
      >
        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
