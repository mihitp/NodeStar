'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'QAC Console', href: '/qac' },
  { label: 'Graph Explorer', href: '/explore' },
  { label: 'Workflows', href: '/workflows' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
      className="px-6 py-3 flex items-center justify-between"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
        <span
          style={{
            fontFamily: 'var(--font-display), sans-serif',
            color: 'var(--accent-cyan)',
            textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
            fontSize: '1.125rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          ESEC
        </span>
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent-cyan)',
            boxShadow: '0 0 8px rgba(0, 212, 255, 0.8)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
      </Link>

      {/* Nav links */}
      <div className="flex gap-6">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              style={{
                fontFamily: 'var(--font-display), sans-serif',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                textDecoration: 'none',
                letterSpacing: '0.03em',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'color 0.2s ease',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Animated gradient line at bottom of nav */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--accent-cyan), transparent)',
          opacity: 0.4,
        }}
      />
    </nav>
  );
}
