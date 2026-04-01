'use client';

import { useState } from 'react';
import GraphViz from '@/components/GraphViz';

interface SelectedNode {
  id: string;
  label: string;
  name: string;
  group: string;
}

const GROUP_COLORS: Record<string, string> = {
  Part: 'bg-blue-500',
  QAC: 'bg-green-500',
  Workflow: 'bg-orange-500',
  WorkflowStep: 'bg-orange-400',
  Assembly: 'bg-purple-500',
  DesignDoc: 'bg-pink-500',
  Engineer: 'bg-cyan-500',
  Vendor: 'bg-yellow-500',
  Constraint: 'bg-red-500',
};

export default function ExplorePage() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 overflow-hidden">
      <div className="flex-1 min-w-0 h-full">
        <GraphViz onNodeSelect={setSelectedNode} />
      </div>

      <aside className="w-80 shrink-0 border-l border-gray-800 bg-gray-900 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Node Inspector</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {selectedNode === null ? (
            <p className="text-gray-500 text-sm">Click a node to inspect</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-3 h-3 rounded-full shrink-0 ${GROUP_COLORS[selectedNode.group] ?? 'bg-gray-500'}`}
                />
                <span className="text-base font-semibold text-gray-100 truncate">{selectedNode.name || selectedNode.id}</span>
              </div>

              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">ID</dt>
                  <dd className="text-sm text-gray-200 font-mono break-all">{selectedNode.id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Label</dt>
                  <dd className="text-sm text-gray-200">{selectedNode.label}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Name</dt>
                  <dd className="text-sm text-gray-200">{selectedNode.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">Group</dt>
                  <dd className="text-sm">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white ${GROUP_COLORS[selectedNode.group] ?? 'bg-gray-600'}`}
                    >
                      {selectedNode.group}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
