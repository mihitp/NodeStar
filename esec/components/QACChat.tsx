'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import PartCard from './PartCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
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
  skillId?: string;
  skillName?: string;
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

// ─── Skill Icon ───────────────────────────────────────────────────────────────

function SkillIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const s = size;
  switch (icon) {
    case 'circuit':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="10" rx="2" />
          <line x1="6" y1="7" x2="6" y2="17" />
          <line x1="10" y1="7" x2="10" y2="17" />
          <line x1="14" y1="7" x2="14" y2="17" />
          <line x1="18" y1="7" x2="18" y2="17" />
        </svg>
      );
    case 'thermal':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
      );
    case 'bracket':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="8 3 4 3 4 21 8 21" />
          <polyline points="16 3 20 3 20 21 16 21" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
  }
}

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
  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2"
      style={{ background: 'rgba(0, 212, 255, 0.04)', border: '1px solid rgba(0, 212, 255, 0.12)' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
        <line x1="12" y1="7" x2="5" y2="17" /><line x1="12" y1="7" x2="19" y2="17" />
      </svg>
      {metadata.skillName && (
        <>
          <span className="text-[10px] tracking-wider uppercase"
            style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-display), sans-serif' }}>
            /{metadata.skillName}
          </span>
          <span style={{ color: 'var(--border-subtle)' }}>·</span>
        </>
      )}
      <span className="text-[10px] tracking-wider uppercase"
        style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-display), sans-serif' }}>
        Graph:
      </span>
      <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        {parts.join(' · ')}
      </span>
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

// ─── Slash Command Picker ─────────────────────────────────────────────────────

function SlashPicker({
  skills,
  query,
  activeIndex,
  onSelect,
}: {
  skills: Skill[];
  query: string;
  activeIndex: number;
  onSelect: (skill: Skill) => void;
}) {
  const filtered = useMemo(
    () =>
      query
        ? skills.filter(
            (s) =>
              s.id.includes(query.toLowerCase()) ||
              s.name.toLowerCase().includes(query.toLowerCase()) ||
              s.tags.some((t) => t.includes(query.toLowerCase()))
          )
        : skills,
    [skills, query]
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
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-[10px] tracking-widest uppercase"
          style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-display), sans-serif' }}>
          Skills
        </span>
      </div>
      <div className="overflow-y-auto max-h-56">
        {filtered.map((skill, i) => (
          <button
            key={skill.id}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(skill); }}
            className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors duration-100"
            style={{
              background: i === activeIndex ? 'rgba(0,212,255,0.08)' : 'transparent',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <span style={{ color: 'var(--accent-cyan)', marginTop: 1, flexShrink: 0 }}>
              <SkillIcon icon={skill.icon} size={15} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display), sans-serif' }}>
                  /{skill.id}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{skill.name}</span>
              </div>
              <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                {skill.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Chat Component ──────────────────────────────────────────────────────

export default function QACChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [pickerIndex, setPickerIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load skills once on mount
  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then((d) => setSkills(d.skills ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const selectSkill = (skill: Skill) => {
    setActiveSkill(skill);
    setShowPicker(false);
    setSlashQuery('');
    // Strip the slash command prefix from input
    setInput((prev) => prev.replace(/^\/\S*\s?/, ''));
    textareaRef.current?.focus();
  };

  const clearSkill = () => {
    setActiveSkill(null);
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

      const skillSnapshot = activeSkill;

      try {
        const res = await fetch('/api/qac', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: text,
            skillId: skillSnapshot?.id,
          }),
        });

        if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);

        const data = await res.json();

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer ?? data.content ?? 'No response received.',
          metadata: {
            skillId: skillSnapshot?.id,
            skillName: skillSnapshot?.name,
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
    [input, loading, activeSkill]
  );

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;

    // Slash command detection
    const slashMatch = val.match(/^\/(\S*)$/);
    if (slashMatch) {
      setSlashQuery(slashMatch[1]);
      setShowPicker(true);
      setPickerIndex(0);
    } else {
      setShowPicker(false);
    }
  };

  const filteredSkills = useMemo(
    () =>
      slashQuery
        ? skills.filter(
            (s) =>
              s.id.includes(slashQuery.toLowerCase()) ||
              s.name.toLowerCase().includes(slashQuery.toLowerCase())
          )
        : skills,
    [skills, slashQuery]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPicker) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPickerIndex((i) => Math.min(i + 1, filteredSkills.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPickerIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredSkills[pickerIndex]) selectSkill(filteredSkills[pickerIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowPicker(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
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
              Every response is grounded in your Neo4j knowledge graph · type <span
                style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono), monospace' }}>
                /
              </span> to use a skill
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
            {skills.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] tracking-widest uppercase mb-3"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display), sans-serif' }}>
                  Available Skills
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {skills.map((skill) => (
                    <button key={skill.id} type="button"
                      onClick={() => { setActiveSkill(skill); textareaRef.current?.focus(); }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all duration-150"
                      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.color = 'var(--accent-cyan)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <SkillIcon icon={skill.icon} size={12} />
                      <span style={{ fontFamily: 'var(--font-mono), monospace' }}>/{skill.id}</span>
                    </button>
                  ))}
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

        {/* Active skill badge */}
        {activeSkill && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--accent-cyan)' }}>
              <SkillIcon icon={activeSkill.icon} size={12} />
              <span style={{ fontFamily: 'var(--font-mono), monospace' }}>/{activeSkill.id}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 2 }}>{activeSkill.name}</span>
            </div>
            <button type="button" onClick={clearSkill}
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
              skills={skills}
              query={slashQuery}
              activeIndex={pickerIndex}
              onSelect={selectSkill}
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
              placeholder={activeSkill ? `Ask ${activeSkill.name}...` : 'Ask about parts, compatibility, materials… or type / for skills'}
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
          Enter to send · Shift+Enter for newline · <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono), monospace' }}>/</span> for skills
        </p>
      </div>
    </div>
  );
}
