import type { Metadata } from 'next';
import QACChat from '@/components/QACChat';

export const metadata: Metadata = {
  title: 'QAC Console | ESEC',
};

export default function QACPage() {
  return (
    <div
      className="flex flex-col"
      style={{
        background: 'var(--bg-primary)',
        height: 'calc(100vh - 53px)',
      }}
    >
      {/* Header */}
      <div className="max-w-4xl mx-auto w-full px-6 pt-8 pb-0">
        <div className="mb-5 animate-fade-in">
          <h1
            style={{
              fontFamily: 'var(--font-display), sans-serif',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              letterSpacing: '0.08em',
              textShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
            }}
          >
            QAC CONSOLE
          </h1>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-body), sans-serif',
              fontSize: '0.875rem',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              letterSpacing: '0.02em',
            }}
          >
            AI-powered engineering Q&amp;A — every response is grounded in your knowledge graph
          </p>

          {/* Cyan gradient separator */}
          <div
            className="mt-4 h-px w-full"
            style={{
              background:
                'linear-gradient(to right, var(--accent-cyan), transparent)',
              opacity: 0.5,
            }}
          />
        </div>
      </div>

      {/* Chat fills remaining space */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 pb-4 flex flex-col min-h-0">
        <QACChat />
      </div>
    </div>
  );
}
