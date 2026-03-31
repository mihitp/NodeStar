import QACChat from '@/components/QACChat';

export const metadata = {
  title: 'QAC Console | ESEC',
  description: 'Query and answer console for mechanical parts using AI and graph analysis',
};

export default function QACPage() {
  return (
    <main className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">QAC Console</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Query parts, compatibility, and engineering context using your graph knowledge base
          </p>
        </div>
      </header>

      {/* Chat fills remaining height */}
      <div className="flex flex-col flex-1 min-h-0 max-w-4xl mx-auto w-full">
        <QACChat />
      </div>
    </main>
  );
}
