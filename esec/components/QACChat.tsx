'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import PartCard from './PartCard';

interface ReferencedPart {
  partId: string;
  name: string;
  category: string;
  material: string;
  functionalDescription: string;
  relevanceScore?: number;
}

interface SimilarQAC {
  question: string;
  answerSummary: string;
  relevanceScore: number;
}

interface AssistantMetadata {
  referencedParts?: ReferencedPart[];
  suggestedActions?: string[];
  confidence?: number;
  similarQACs?: SimilarQAC[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: AssistantMetadata;
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const style =
    score > 0.7
      ? 'bg-green-100 text-green-800'
      : score >= 0.5
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {pct}% confidence
    </span>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-blue-600 text-white text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({ content, metadata }: { content: string; metadata?: AssistantMetadata }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-3">
        {/* Bubble */}
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100 text-gray-900 text-sm leading-relaxed">
          <div className="whitespace-pre-wrap">{content}</div>

          {metadata?.confidence !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <ConfidenceBadge score={metadata.confidence} />
            </div>
          )}
        </div>

        {/* Suggested actions */}
        {metadata?.suggestedActions && metadata.suggestedActions.length > 0 && (
          <div className="px-4 py-3 rounded-xl border border-blue-100 bg-blue-50">
            <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
              Suggested Actions
            </p>
            <ol className="space-y-1">
              {metadata.suggestedActions.map((action, i) => (
                <li key={i} className="flex gap-2 text-xs text-blue-900">
                  <span className="font-bold shrink-0">{i + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Referenced parts */}
        {metadata?.referencedParts && metadata.referencedParts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide px-1">
              Referenced Parts
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {metadata.referencedParts.map((part) => (
                <PartCard key={part.partId} part={part} />
              ))}
            </div>
          </div>
        )}

        {/* Similar past questions */}
        {metadata?.similarQACs && metadata.similarQACs.length > 0 && (
          <div className="px-4 py-3 rounded-xl border border-gray-200 bg-white">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Similar Past Questions
            </p>
            <div className="space-y-3">
              {metadata.similarQACs.map((qac, i) => (
                <div key={i} className="text-xs border-l-2 border-gray-200 pl-3">
                  <p className="font-medium text-gray-700">{qac.question}</p>
                  <p className="text-gray-500 mt-0.5 line-clamp-2">{qac.answerSummary}</p>
                  <p className="text-gray-400 mt-1">{Math.round(qac.relevanceScore * 100)}% similar</p>
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
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
        </div>
      </div>
    </div>
  );
}

export default function QACChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const submit = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;

    const userMessage: Message = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/qac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer ?? data.content ?? 'No response received.',
        metadata: {
          referencedParts: data.referencedParts,
          suggestedActions: data.suggestedActions,
          confidence: data.confidence,
          similarQACs: data.similarQACs,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        role: 'assistant',
        content: err instanceof Error ? `Error: ${err.message}` : 'An unexpected error occurred.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 select-none py-16">
            <svg
              className="w-10 h-10 mb-3 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm font-medium">Ask a question about your parts</p>
            <p className="text-xs mt-1 opacity-70">
              Queries are answered using your Neo4j parts graph and AI analysis
            </p>
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
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about parts, compatibility, materials… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none leading-relaxed min-h-[24px] max-h-40 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim() || loading}
            className="shrink-0 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-400 text-center">
          Enter to send &middot; Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
