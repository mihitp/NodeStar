'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Workflow {
  workflowId: string;
  name: string;
  description: string;
  stepCount: number;
  category: string;
}

interface WorkflowStep {
  stepId: string;
  order: number;
  action: string;
  description: string;
}

interface WorkflowCardProps {
  workflow: Workflow;
}

const CATEGORY_COLORS: Record<string, string> = {
  assembly: 'bg-blue-100 text-blue-800',
  inspection: 'bg-green-100 text-green-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  repair: 'bg-orange-100 text-orange-800',
  testing: 'bg-purple-100 text-purple-800',
  installation: 'bg-cyan-100 text-cyan-800',
  calibration: 'bg-teal-100 text-teal-800',
  disassembly: 'bg-red-100 text-red-800',
  cleaning: 'bg-indigo-100 text-indigo-800',
  diagnosis: 'bg-rose-100 text-rose-800',
};

const DEFAULT_CATEGORY_COLOR = 'bg-gray-100 text-gray-800';

export default function WorkflowCard({ workflow }: WorkflowCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [stepsFetched, setStepsFetched] = useState(false);

  const categoryColor =
    CATEGORY_COLORS[workflow.category?.toLowerCase()] ?? DEFAULT_CATEGORY_COLOR;

  const handleToggle = async () => {
    if (!expanded && !stepsFetched) {
      setLoading(true);
      try {
        const res = await fetch(`/api/workflows?id=${workflow.workflowId}`);
        if (!res.ok) throw new Error('Failed to fetch steps');
        const data = await res.json();
        const fetched: WorkflowStep[] = data.steps ?? data ?? [];
        const sorted = [...fetched].sort((a, b) => a.order - b.order);
        setSteps(sorted);
        setStepsFetched(true);
      } catch {
        setSteps([]);
      } finally {
        setLoading(false);
      }
    }
    setExpanded((prev) => !prev);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-gray-900 text-lg leading-tight">
          {workflow.name}
        </h3>
        <span
          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${categoryColor}`}
        >
          {workflow.category}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-3">{workflow.description}</p>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
        <span>{workflow.stepCount} step{workflow.stepCount !== 1 ? 's' : ''}</span>
        <Link
          href={`/explore?nodeId=${workflow.workflowId}&nodeLabel=Workflow`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          Explore in Graph
        </Link>
      </div>

      <button
        onClick={handleToggle}
        className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
      >
        <span>{expanded ? '▲ Collapse steps' : '▼ View steps'}</span>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <svg
                className="animate-spin h-4 w-4 text-blue-500"
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
              Loading steps…
            </div>
          ) : steps.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No steps found.</p>
          ) : (
            <ol className="space-y-2">
              {steps.map((step) => (
                <li key={step.stepId} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {step.order}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-800">
                      {step.action}
                    </span>
                    {step.description && (
                      <p className="text-gray-500 mt-0.5">{step.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
