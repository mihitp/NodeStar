'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Part {
  partId: string;
  name: string;
  category: string;
  material: string;
  functionalDescription: string;
  relevanceScore?: number;
}

interface PartCardProps {
  part: Part;
}

const CATEGORY_COLORS: Record<string, string> = {
  bracket:    'bg-yellow-500/20 text-yellow-400',
  standoff:   'bg-violet-500/20 text-violet-400',
  enclosure:  'bg-indigo-500/20 text-indigo-400',
  'heat-sink':'bg-orange-500/20 text-orange-400',
  'pcb-mount':'bg-green-500/20 text-green-400',
  fastener:   'bg-blue-500/20 text-blue-400',
  'sheet-metal':'bg-slate-400/20 text-slate-400',
  connector:  'bg-pink-500/20 text-pink-400',
  spacer:     'bg-teal-500/20 text-teal-400',
  clip:       'bg-rose-500/20 text-rose-400',
};

function getCategoryColor(category: string): string {
  const normalized = category.toLowerCase();
  return CATEGORY_COLORS[normalized] ?? 'bg-[rgba(148,163,184,0.1)] text-[#94a3b8]';
}

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.7
      ? { bar: '#10b981', glow: 'rgba(16,185,129,0.35)', text: '#10b981' }
      : score >= 0.5
      ? { bar: '#f59e0b', glow: 'rgba(245,158,11,0.35)', text: '#f59e0b' }
      : { bar: '#f43f5e', glow: 'rgba(244,63,94,0.35)', text: '#f43f5e' };

  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-[10px] tracking-widest uppercase text-[#64748b] w-16 shrink-0">
        Relevance
      </span>
      <div
        className="flex-1 h-1 rounded-full bg-[#0a0e17] overflow-hidden"
        style={{ boxShadow: `0 0 4px ${color.glow}` }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color.bar }}
        />
      </div>
      <span
        className="text-[10px] font-mono font-semibold w-8 text-right shrink-0"
        style={{ color: color.text }}
      >
        {pct}%
      </span>
    </div>
  );
}

export default function PartCard({ part }: PartCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border border-[rgba(148,163,184,0.1)] rounded-xl bg-[#111827] transition-all duration-200 group hover:border-[rgba(0,212,255,0.3)]"
      style={{
        boxShadow: expanded
          ? '0 0 16px rgba(0,212,255,0.08)'
          : undefined,
      }}
    >
      {/* Header content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#e2e8f0] text-sm leading-tight truncate">
              {part.name}
            </h3>
            <p className="text-[10px] text-[#00d4ff] mt-0.5 font-mono tracking-wider">
              {part.partId}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shrink-0 ${getCategoryColor(part.category)}`}
          >
            {part.category}
          </span>
        </div>

        <p className="mt-2 text-xs text-[#94a3b8] leading-relaxed line-clamp-2">
          {part.functionalDescription}
        </p>

        {part.relevanceScore !== undefined && (
          <RelevanceBar score={part.relevanceScore} />
        )}
      </div>

      {/* Expandable details */}
      <div className="border-t border-[rgba(148,163,184,0.07)]">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-2 text-[10px] tracking-widest uppercase text-[#00d4ff] hover:bg-[rgba(0,212,255,0.04)] transition-colors duration-150"
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Hide Details' : 'Details'}</span>
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-4 pt-2 space-y-2 bg-[#0a0e17] rounded-b-xl">
            <div className="flex gap-2 text-xs">
              <span className="text-[#64748b] w-20 shrink-0 tracking-wide">Material</span>
              <span className="text-[#e2e8f0] font-medium">{part.material}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-[#64748b] w-20 shrink-0 tracking-wide">Category</span>
              <span className="text-[#e2e8f0] font-medium">{part.category}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-[#64748b] w-20 shrink-0 tracking-wide">Part ID</span>
              <span className="text-[#00d4ff] font-mono text-[10px]">{part.partId}</span>
            </div>
            <div className="pt-1">
              <Link
                href={`/explore?nodeId=${encodeURIComponent(part.partId)}&label=Part`}
                className="inline-flex items-center gap-1.5 text-xs text-[#00d4ff] hover:text-white font-medium transition-colors duration-150 group/link"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Explore in Graph
                <span className="group-hover/link:translate-x-0.5 transition-transform duration-150">
                  →
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
