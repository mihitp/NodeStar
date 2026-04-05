'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import PartCard from './PartCard';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ReferencedPart {
  partId: string;
  name: string;
  category: string;
  material: string;
  functionalDescription: string;
  relevanceScore?: number;
}

interface RelatedDoc {
  docId: string;
  title: string;
  docType: string;
  contentSnippet: string;
}

interface SimilarQAC {
  question: string;
  answerSummary: string;
  relevanceScore: number;
}

interface AssistantMetadata {
  workflowId?: string;
  workflowName?: string;
  workflowSteps?: WorkflowStep[];
  referencedParts?: ReferencedPart[];
  relatedDocs?: RelatedDoc[];
  suggestedActions?: string[];
  confidence?: number;
  similarQACs?: SimilarQAC[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: AssistantMetadata;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLE_QUESTIONS = [
  'How to mount a PCB to an aluminum panel?',
  'What bracket fits a 100mm enclosure?',
  'Show me heat sink compatibility',
];

const PART_ID_REGEX = /\b([A-Z]{2,6}-\d{3,6})\b/g;

const CATEGORY_COLORS: Record<string, string> = {
  assembly: '#3b82f6',
  inspection: '#10b981',
  maintenance: '#f59e0b',
  repair: '#f97316',
  testing: '#a855f7',
  installation: '#00d4ff',
  calibration: '#14b8a6',
  disassembly: '#ef4444',
  cleaning: '#6366f1',
  diagnosis: '#f43f5e',
};

// ─── Part ID Linking ──────────────────────────────────────────────────────────

function parsePartReferences(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(PART_ID_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const partId = match[1];
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(
      <Link
        key={`${partId}-${match.index}`}
        href={`/explore?nodeId=${encodeURIComponent(partId)}&label=Part`}
        className="part-ref-link"
        style={{
          color: 'var(--accent-cyan)',
          textDecoration: 'none',
          fontFamily: 'var(--font-mono), monospace',
          fontWeight: 600,
          fontSize: '0.8em',
          padding: '1px 5px',
          borderRadius: '4px',
          background: 'rgba(0, 212, 255, 0.08)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
        }}
      >
        {partId}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : [text];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score > 0.7
      ? { bar: 'var(--accent-emerald)', glow: 'rgba(16,185,129,0.3)', text: 'var(--accent-emerald)' }
      : score >= 0.5
      ? { bar: 'var(--accent-amber)', glow: 'rgba(245,158,11,0.3)', text: 'var(--accent-amber)' }
      : { bar: 'var(--accent-rose)', glow: 'rgba(244,63,94,0.3)', text: 'var(--accent-rose)' };

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
        Confidence
      </span>
      <div className="flex-1 h-1 rounded-full overflow-hidden max-w-[80px]"
        style={{ background: 'var(--bg-elevated)', boxShadow: `0 0 4px ${color.glow}` }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color.bar }} />
      </div>
      <span className="text-[10px] font-semibold"
        style={{ fontFamily: 'var(--font-mono), monospace', color: color.text }}>
        {pct}%
      </span>
    </div>
  );
}

function GraphSourcesIndicator({ metadata }: { metadata: AssistantMetadata }) {
  const parts: string[] = [];
  if ((metadata.referencedParts?.length ?? 0) > 0)
    parts.push(`${metadata.referencedParts!.length} part${metadata.referencedParts!.length > 1 ? 's' : ''}`);
  if ((metadata.relatedDocs?.length ?? 0) > 0)
    parts.push(`${metadata.relatedDocs!.length} doc${metadata.relatedDocs!.length > 1 ? 's' : ''}`);
  if ((metadata.similarQACs?.length ?? 0) > 0)
    parts.push(`${metadata.similarQACs!.length} past QAC${metadata.similarQACs!.length > 1 ? 's' : ''}`);
  if (parts.length === 0 && !metadata.workflowName) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 flex-wrap"
      style={{ background: 'rgba(0, 212, 255, 0.04)', border: '1px solid rgba(0, 212, 255, 0.12)' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
        <line x1="12" y1="7" x2="5" y2="17" /><line x1="12" y1="7" x2="19" y2="17" />
      </svg>
      {metadata.workflowName && metadata.workflowId && (
        <>
          <Link
            href={`/explore?nodeId=${encodeURIComponent(metadata.workflowId)}&nodeLabel=Workflow`}
            className="text-[10px] tracking-wider uppercase hover:underline"
            style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-display), sans-serif' }}
          >
            /{metadata.workflowName} →
          </Link>
          {parts.length > 0 && <span style={{ color: 'var(--border-subtle)' }}>·</span>}
        </>
      )}
      {parts.length > 0 && (
        <>
          <span className="text-[10px] tracking-wider uppercase"
            style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-display), sans-serif' }}>
            Graph:
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {parts.join(' · ')}
          </span>
        </>
      )}
    </div>
  );
}

function WorkflowStepsPanel({ workflowId, workflowName, steps }: {
  workflowId: string;
  workflowName: string;
  steps: WorkflowStep[];
}) {
  return (
    <div className="px-4 py-3 rounded-xl"
      style={{ background: 'var(--bg-surface)', border: '1px solid rgba(0,212,255,0.15)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display), sans-serif' }}>
          Workflow Steps Used
        </p>
        <Link
          href={`/explore?nodeId=${encodeURIComponent(workflowId)}&nodeLabel=Workflow`}
          className="text-[10px] hover:underline transition-colors"
          style={{ color: 'var(--accent-cyan)' }}
        >
          View {workflowName} in Graph →
        </Link>
      </div>
      <ol className="space-y-0">
        {steps.map((step, index) => (
          <li key={step.stepId} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10"
                style={{
                  border: '1.5px solid var(--accent-cyan)',
                  color: 'var(--accent-cyan)',
                  background: 'rgba(0,212,255,0.08)',
                }}
              >
                {step.order}
              </div>
              {index < steps.length - 1 && (
                <div className="w-px flex-1 my-1"
                  style={{ borderLeft: '1px solid rgba(0,212,255,0.2)', minHeight: '1rem' }} />
              )}
            </div>
            <div className={`pb-3 ${index === steps.length - 1 ? 'pb-0' : ''}`}>
              <span className="text-xs font-semibold block" style={{ color: 'var(--text-primary)' }}>
                {step.action}
              </span>
              {step.description && (
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {step.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end animate-fade-in">
      <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed whitespace-pre-wrap"
        style={{ background: 'var(--accent-blue)', color: '#fff', boxShadow: 'var(--glow-blue)' }}>
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({ content, metadata }: { content: string; metadata?: AssistantMetadata }) {
  const parsed = useMemo(() => parsePartReferences(content), [content]);

  return (
    <div className="flex justify-start animate-slide-in">
      <div className="max-w-[85%] space-y-3">
        {metadata && <GraphSourcesIndicator metadata={metadata} />}

        <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
          <div className="whitespace-pre-wrap">{parsed}</div>
          {metadata?.confidence !== undefined && <ConfidenceBadge score={metadata.confidence} />}
        </div>

        {metadata?.suggestedActions && metadata.suggestedActions.length > 0 && (
          <div className="px-4 py-3 rounded-xl border-l-2"
            style={{ borderColor: 'var(--accent-cyan)', background: 'rgba(0, 212, 255, 0.05)' }}>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-display), sans-serif' }}>
              Suggested Actions
            </p>
            <ol className="space-y-1.5">
              {metadata.suggestedActions.map((action, i) => (
                <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-bold shrink-0" style={{ color: 'var(--accent-cyan)' }}>{i + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Workflow steps panel (secondary: links to graph) */}
        {metadata?.workflowId && metadata.workflowName && metadata.workflowSteps && metadata.workflowSteps.length > 0 && (
          <WorkflowStepsPanel
            workflowId={metadata.workflowId}
            workflowName={metadata.workflowName}
            steps={metadata.workflowSteps}
          />
        )}

        {metadata?.referencedParts && metadata.referencedParts.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-2 px-1"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display), sans-serif' }}>
              Referenced Parts
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {metadata.referencedParts.map((part) => (
                <PartCard key={part.partId} part={part} />
              ))}
            </div>
          </div>
        )}

        {metadata?.relatedDocs && metadata.relatedDocs.length > 0 && (
          <div className="px-4 py-3 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display), sans-serif' }}>
              Related Documents
            </p>
            <div className="space-y-2.5">
              {metadata.relatedDocs.map((doc) => (
                <div key={doc.docId} className="text-xs border-l-2 pl-3"
                  style={{ borderColor: 'rgba(59,130,246,0.4)' }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{doc.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{ fontFamily: 'var(--font-mono), monospace', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      {doc.docType}
                    </span>
                  </div>
                  <p className="line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{doc.contentSnippet}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {metadata?.similarQACs && metadata.similarQACs.length > 0 && (
          <div className="px-4 py-3 rounded-xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-[10px] font-semibold tracking-widest uppercase mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display), sans-serif' }}>
              Similar Past Questions
            </p>
            <div className="space-y-3">
              {metadata.similarQACs.map((qac, i) => (
                <div key={i} className="text-xs border-l-2 pl-3"
                  style={{ borderColor: 'rgba(0,212,255,0.3)' }}>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{qac.question}</p>
                  <p className="mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{qac.answerSummary}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px]"
                    style={{ fontFamily: 'var(--font-mono), monospace', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    {Math.round(qac.relevanceScore * 100)}% similar
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {['[animation-delay:-0.3s]', '[animation-delay:-0.15s]', ''].map((d, i) => (
              <span key={i} className={`w-2 h-2 rounded-full animate-bounce ${d}`}
                style={{ background: 'var(--accent-cyan)' }} />
            ))}
          </div>
          <span className="text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Querying knowledge graph...
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Workflow Slash Picker ────────────────────────────────────────────────────

function SlashPicker({
  workflows,
  query,
  activeIndex,
  onSelect,
}: {
  workflows: Workflow[];
  query: string;
  activeIndex: number;
  onSelect: (w: Workflow) => void;
}) {
  const filtered = useMemo(
    () =>
      query
        ? workflows.filter(
            (w) =>
              w.workflowId.toLowerCase().includes(query.toLowerCase()) ||
              w.name.toLowerCase().includes(query.toLowerCase()) ||
              w.category?.toLowerCase().includes(query.toLowerCase())
          )
        : workflows,
    [workflows, query]
  );

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden z-50"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-glow)',
        boxShadow: '0 0 20px rgba(0,212,255,0.15), 0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[10px] tracking-widest uppercase"
          style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-display), sans-serif' }}>
          Workflows
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} available
        </span>
      </div>
      <div className="overflow-y-auto max-h-56">
        {filtered.map((w, i) => {
          const accentColor = CATEGORY_COLORS[w.category?.toLowerCase()] ?? '#94a3b8';
          return (
            <button
              key={w.workflowId}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(w); }}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors duration-100"
              style={{
                background: i === activeIndex ? 'rgba(0,212,255,0.08)' : 'transparent',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              {/* Category dot */}
              <div className="mt-1 w-2 h-2 rounded-full shrink-0"
                style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}80` }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display), sans-serif' }}>
                    {w.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: accentColor, fontFamily: 'var(--font-mono), monospace' }}>
                    {w.category}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {w.stepCount} step{w.stepCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                  {w.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Chat Component ──────────────────────────────────────────────────────

export default function QACChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [pickerIndex, setPickerIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/workflows')
      .then((r) => r.json())
      .then((d) => setWorkflows(d.workflows ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const selectWorkflow = (w: Workflow) => {
    setActiveWorkflow(w);
    setShowPicker(false);
    setSlashQuery('');
    setInput((prev) => prev.replace(/^\/\S*\s?/, ''));
    textareaRef.current?.focus();
  };

  const clearWorkflow = () => {
    setActiveWorkflow(null);
    textareaRef.current?.focus();
  };

  const submit = useCallback(
    async (question?: string) => {
      const text = (question ?? input).trim();
      if (!text || loading) return;

      const userMessage: Message = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      setShowPicker(false);

      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      const workflowSnapshot = activeWorkflow;

      try {
        const res = await fetch('/api/qac', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: text,
            workflowId: workflowSnapshot?.workflowId,
          }),
        });

        if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);

        const data = await res.json();

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer ?? 'No response received.',
          metadata: {
            workflowId: data.workflowId,
            workflowName: data.workflowName,
            workflowSteps: data.workflowSteps,
            referencedParts: data.referencedParts,
            relatedDocs: data.relatedDocs,
            suggestedActions: data.suggestedActions,
            confidence: data.confidence,
            similarQACs: data.similarQACs,
          },
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: err instanceof Error ? `Error: ${err.message}` : 'An unexpected error occurred.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, activeWorkflow]
  );

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;

    const slashMatch = val.match(/^\/(\S*)$/);
    if (slashMatch) {
      setSlashQuery(slashMatch[1]);
      setShowPicker(true);
      setPickerIndex(0);
    } else {
      setShowPicker(false);
    }
  };

  const filteredWorkflows = useMemo(
    () =>
      slashQuery
        ? workflows.filter(
            (w) =>
              w.workflowId.toLowerCase().includes(slashQuery.toLowerCase()) ||
              w.name.toLowerCase().includes(slashQuery.toLowerCase()) ||
              w.category?.toLowerCase().includes(slashQuery.toLowerCase())
          )
        : workflows,
    [workflows, slashQuery]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPicker) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPickerIndex((i) => Math.min(i + 1, filteredWorkflows.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setPickerIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredWorkflows[pickerIndex]) selectWorkflow(filteredWorkflows[pickerIndex]);
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); setShowPicker(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const handleExampleClick = (q: string) => {
    setInput(q);
    setTimeout(() => submit(q), 0);
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-2 py-6 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center select-none py-16">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="var(--accent-cyan)" strokeWidth={1.25}
              viewBox="0 0 24 24" style={{ opacity: 0.7 }}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Ask a question about your parts
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {'Every response is grounded in your Neo4j knowledge graph · type '}
              <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono), monospace' }}>/</span>
              {' to scope a workflow'}
            </p>
            <div className="mt-5 flex flex-col gap-2 items-center">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button key={q} type="button" onClick={() => handleExampleClick(q)}
                  className="example-chip px-4 py-1.5 rounded-full text-xs tracking-wide transition-all duration-150"
                  style={{ color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.05)' }}>
                  {q}
                </button>
              ))}
            </div>
            {workflows.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] tracking-widest uppercase mb-3"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display), sans-serif' }}>
                  Workflows
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {workflows.slice(0, 6).map((w) => {
                    const accentColor = CATEGORY_COLORS[w.category?.toLowerCase()] ?? '#94a3b8';
                    return (
                      <button key={w.workflowId} type="button"
                        onClick={() => { setActiveWorkflow(w); textareaRef.current?.focus(); }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all duration-150"
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentColor + '60'; e.currentTarget.style.color = accentColor; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
                        <span>{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <UserMessage key={i} content={msg.content} />
          ) : (
            <AssistantMessage key={i} content={msg.content} metadata={msg.metadata} />
          )
        )}

        {loading && <LoadingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3"
        style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>

        {/* Active workflow badge */}
        {activeWorkflow && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--accent-cyan)' }}>
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ background: CATEGORY_COLORS[activeWorkflow.category?.toLowerCase()] ?? '#94a3b8' }} />
              <span style={{ fontFamily: 'var(--font-display), sans-serif' }}>{activeWorkflow.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7em' }}>
                {activeWorkflow.stepCount} steps
              </span>
            </div>
            <Link
              href={`/explore?nodeId=${encodeURIComponent(activeWorkflow.workflowId)}&nodeLabel=Workflow`}
              className="text-[10px] transition-colors hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              view in graph
            </Link>
            <button type="button" onClick={clearWorkflow}
              className="text-[10px] transition-colors duration-100"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-rose)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>
              ✕ clear
            </button>
          </div>
        )}

        {/* Slash picker (above input) */}
        <div className="relative">
          {showPicker && (
            <SlashPicker
              workflows={workflows}
              query={slashQuery}
              activeIndex={pickerIndex}
              onSelect={selectWorkflow}
            />
          )}

          <div className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all duration-200"
            style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setShowPicker(false), 100)}
              placeholder={
                activeWorkflow
                  ? `Ask about ${activeWorkflow.name}...`
                  : 'Ask about parts, compatibility, materials… or type / to scope a workflow'
              }
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed min-h-[24px] max-h-40 focus:outline-none disabled:opacity-50"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body), sans-serif' }}
            />
            <button type="button" onClick={() => submit()}
              disabled={!input.trim() || loading}
              className="shrink-0 p-1.5 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              style={{
                color: 'var(--bg-primary)',
                background: 'var(--accent-cyan)',
                boxShadow: input.trim() && !loading ? '0 0 10px rgba(0,212,255,0.4)' : 'none',
              }}
              aria-label="Send message">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-center tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {'Enter to send · Shift+Enter for newline · '}
          <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono), monospace' }}>/</span>
          {' to scope a workflow'}
        </p>
      </div>
    </div>
  );
}
