'use client';

import { useEffect, useState } from 'react';
import WorkflowCard from '@/components/WorkflowCard';

interface Workflow {
  workflowId: string;
  name: string;
  description: string;
  stepCount: number;
  category: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await fetch('/api/workflows');
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        const list: Workflow[] = data.workflows ?? data ?? [];
        setWorkflows(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workflows.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: '#0a0e17' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-12">

        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-4xl font-bold tracking-widest uppercase mb-2"
            style={{ color: '#e2e8f0' }}
          >
            Workflows
          </h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            Engineering process workflows from your knowledge graph
          </p>

          {/* Cyan gradient separator line */}
          <div className="mt-4 h-px w-full" style={{
            background: 'linear-gradient(to right, #00d4ff, rgba(59, 130, 246, 0.4), transparent)',
          }} />
        </div>

        {/* Stats bar + search */}
        {!loading && !error && (
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <span className="text-sm" style={{ color: '#64748b' }}>
              {filteredWorkflows.length === workflows.length
                ? `${workflows.length} workflow${workflows.length !== 1 ? 's' : ''} loaded`
                : `${filteredWorkflows.length} of ${workflows.length} workflows`}
            </span>

            {workflows.length > 0 && (
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ color: '#64748b' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Filter workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm rounded-lg outline-none transition-all duration-200 placeholder:text-[#64748b]"
                  style={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    color: '#e2e8f0',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 212, 255, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <svg
              className="animate-spin h-8 w-8"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              style={{ color: '#00d4ff' }}
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="text-sm" style={{ color: '#64748b' }}>
              Loading workflows...
            </span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            className="rounded-xl p-6 text-center"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <p className="font-medium text-red-400">Error loading workflows</p>
            <p className="text-sm mt-1 text-red-500/80">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && workflows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <p className="text-base font-medium" style={{ color: '#64748b' }}>
              No workflows found
            </p>
            <p className="text-sm" style={{ color: '#475569' }}>
              Add workflows to the graph to see them here.
            </p>
          </div>
        )}

        {/* Workflow grid */}
        {!loading && !error && filteredWorkflows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkflows.map((workflow, index) => (
              <div
                key={workflow.workflowId}
                className="opacity-0 animate-[fadeIn_0.4s_ease_forwards]"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <WorkflowCard workflow={workflow} />
              </div>
            ))}
          </div>
        )}

        {/* Filtered empty state */}
        {!loading && !error && workflows.length > 0 && filteredWorkflows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm" style={{ color: '#64748b' }}>
              No workflows match &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
