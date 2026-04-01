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

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Workflows</h1>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
          <span className="ml-3 text-gray-500 text-lg">Loading workflows…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 font-medium">Error loading workflows</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && workflows.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-gray-500 text-lg font-medium">No workflows found</p>
          <p className="text-gray-400 text-sm mt-1">
            Add workflows to the graph to see them here.
          </p>
        </div>
      )}

      {!loading && !error && workflows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.workflowId} workflow={workflow} />
          ))}
        </div>
      )}
    </main>
  );
}
