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
  fastener: 'bg-blue-100 text-blue-800',
  bearing: 'bg-purple-100 text-purple-800',
  seal: 'bg-green-100 text-green-800',
  bracket: 'bg-yellow-100 text-yellow-800',
  shaft: 'bg-orange-100 text-orange-800',
  gear: 'bg-red-100 text-red-800',
  housing: 'bg-indigo-100 text-indigo-800',
  spring: 'bg-teal-100 text-teal-800',
  valve: 'bg-cyan-100 text-cyan-800',
  pump: 'bg-rose-100 text-rose-800',
};

function getCategoryColor(category: string): string {
  const normalized = category.toLowerCase();
  return CATEGORY_COLORS[normalized] ?? 'bg-gray-100 text-gray-800';
}

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? 'bg-green-500' : score >= 0.5 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">Relevance</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function PartCard({ part }: PartCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
              {part.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{part.partId}</p>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getCategoryColor(part.category)}`}
          >
            {part.category}
          </span>
        </div>

        <p className="mt-2 text-xs text-gray-600 leading-relaxed line-clamp-2">
          {part.functionalDescription}
        </p>

        {part.relevanceScore !== undefined && (
          <div className="mt-3">
            <RelevanceBar score={part.relevanceScore} />
          </div>
        )}
      </div>

      {/* Expandable details */}
      <div className="border-t border-gray-100">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors duration-150"
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Hide details' : 'Show details'}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-4 pt-1 space-y-2 bg-gray-50 rounded-b-lg">
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500 w-20 shrink-0">Material</span>
              <span className="text-gray-800 font-medium">{part.material}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500 w-20 shrink-0">Category</span>
              <span className="text-gray-800 font-medium">{part.category}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500 w-20 shrink-0">Part ID</span>
              <span className="text-gray-800 font-mono">{part.partId}</span>
            </div>
            <div className="pt-1">
              <Link
                href={`/explore?nodeId=${encodeURIComponent(part.partId)}&label=Part`}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Explore in Graph
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
