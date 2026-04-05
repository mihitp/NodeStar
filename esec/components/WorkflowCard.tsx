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
  assembly: 'bg-blue-500/20 text-blue-400',
  inspection: 'bg-green-500/20 text-green-400',
  maintenance: 'bg-yellow-500/20 text-yellow-400',
  repair: 'bg-orange-500/20 text-orange-400',
  testing: 'bg-purple-500/20 text-purple-400',
  installation: 'bg-cyan-500/20 text-cyan-400',
  calibration: 'bg-teal-500/20 text-teal-400',
  disassembly: 'bg-red-500/20 text-red-400',
  cleaning: 'bg-indigo-500/20 text-indigo-400',
  diagnosis: 'bg-rose-500/20 text-rose-400',
};

const DEFAULT_CATEGORY_COLOR = 'bg-gray-500/20 text-gray-400';

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
    <div
      className="rounded-xl p-5 transition-all duration-300 group"
      style={{
        backgroundColor: '#111827',
        border: '1px solid rgba(148, 163, 184, 0.1)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'rgba(0, 212, 255, 0.3)';
        el.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.08), 0 0 40px rgba(0, 212, 255, 0.04)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'rgba(148, 163, 184, 0.1)';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3
          className="font-bold text-lg leading-tight"
          style={{ color: '#e2e8f0' }}
        >
          {workflow.name}
        </h3>
        <span
          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${categoryColor}`}
        >
          {workflow.category}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>
        {workflow.description}
      </p>

      {/* Step count + Explore link */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs flex items-center gap-1" style={{ color: '#64748b' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 10h16M4 14h10"
            />
          </svg>
          {workflow.stepCount} step{workflow.stepCount !== 1 ? 's' : ''}
        </span>
        <Link
          href={`/explore?nodeId=${workflow.workflowId}&nodeLabel=Workflow`}
          className="text-xs hover:underline transition-colors"
          style={{ color: '#00d4ff' }}
        >
          Explore in Graph →
        </Link>
      </div>

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className="w-full text-left text-sm font-medium transition-colors flex items-center gap-1"
        style={{ color: '#00d4ff' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span>{expanded ? 'Collapse steps' : 'View steps'}</span>
      </button>

      {/* Expanded steps */}
      {expanded && (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-sm py-2" style={{ color: '#64748b' }}>
              <svg
                className="animate-spin h-4 w-4"
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
              Loading steps…
            </div>
          ) : steps.length === 0 ? (
            <p className="text-sm italic" style={{ color: '#64748b' }}>
              No steps found.
            </p>
          ) : (
            <ol className="space-y-0">
              {steps.map((step, index) => (
                <li key={step.stepId} className="flex gap-3">
                  {/* Timeline left column */}
                  <div className="flex flex-col items-center">
                    {/* Step number circle */}
                    <div
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10"
                      style={{
                        border: '1.5px solid #00d4ff',
                        color: '#00d4ff',
                        backgroundColor: 'rgba(0, 212, 255, 0.08)',
                      }}
                    >
                      {step.order}
                    </div>
                    {/* Vertical connector line (not shown for last item) */}
                    {index < steps.length - 1 && (
                      <div
                        className="w-px flex-1 my-1"
                        style={{
                          borderLeft: '2px solid rgba(0, 212, 255, 0.2)',
                          minHeight: '1.5rem',
                        }}
                      />
                    )}
                  </div>

                  {/* Step content */}
                  <div className={`pb-4 ${index === steps.length - 1 ? 'pb-0' : ''}`}>
                    <span
                      className="font-semibold text-sm block"
                      style={{ color: '#e2e8f0' }}
                    >
                      {step.action}
                    </span>
                    {step.description && (
                      <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                        {step.description}
                      </p>
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
