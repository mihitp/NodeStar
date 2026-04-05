export default function Home() {
  const features = [
    {
      href: "/qac",
      title: "QAC Console",
      description:
        "AI-powered engineering Q&A with graph context",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      stagger: "stagger-1",
    },
    {
      href: "/explore",
      title: "Graph Explorer",
      description:
        "Interactive visualization of your entire parts graph",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <line x1="12" y1="7" x2="5" y2="17" />
          <line x1="12" y1="7" x2="19" y2="17" />
          <line x1="5" y1="19" x2="19" y2="19" />
        </svg>
      ),
      stagger: "stagger-2",
    },
    {
      href: "/workflows",
      title: "Workflows",
      description:
        "Browse and execute engineering workflows",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
      stagger: "stagger-3",
    },
  ];

  return (
    <main
      className="flex flex-col items-center justify-center flex-1 px-6 py-24"
      style={{ minHeight: "calc(100vh - 53px)" }}
    >
      {/* Hero */}
      <div className="text-center mb-16 animate-fade-in">
        <h1
          style={{
            fontFamily: "var(--font-display), sans-serif",
            fontSize: "clamp(3rem, 8vw, 6rem)",
            fontWeight: 700,
            color: "var(--accent-cyan)",
            textShadow:
              "0 0 40px rgba(0, 212, 255, 0.4), 0 0 80px rgba(0, 212, 255, 0.15)",
            letterSpacing: "0.12em",
            lineHeight: 1,
            marginBottom: "0.5rem",
          }}
        >
          ESEC
        </h1>

        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "1.125rem",
            fontWeight: 500,
            color: "var(--text-primary)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "1.25rem",
          }}
        >
          Engineering Knowledge Graph
        </p>

        <p
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "1rem",
            fontWeight: 300,
            color: "var(--text-secondary)",
            maxWidth: "520px",
            lineHeight: 1.7,
            margin: "0 auto",
          }}
        >
          Your mission control for mechanical design intelligence. Query parts,
          explore relationships, and manage workflows.
        </p>
      </div>

      {/* Feature cards */}
      <div
        className="grid gap-5 w-full"
        style={{
          maxWidth: "900px",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {features.map((feature) => (
          <a
            key={feature.href}
            href={feature.href}
            className={`glass-panel feature-card animate-fade-in ${feature.stagger}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              padding: "2rem 1.5rem",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            {/* Icon */}
            <div
              style={{
                color: "var(--accent-cyan)",
                marginBottom: "1rem",
                filter: "drop-shadow(0 0 8px rgba(0, 212, 255, 0.5))",
              }}
            >
              {feature.icon}
            </div>

            {/* Title */}
            <h2
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              {feature.title}
            </h2>

            {/* Description */}
            <p
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "0.875rem",
                fontWeight: 400,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {feature.description}
            </p>
          </a>
        ))}
      </div>
    </main>
  );
}
