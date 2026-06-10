'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { useConnectionStore } from '@/lib/connection-store';
import { useProStore } from '@/lib/pro-store';
import { SOCIAL } from '@/lib/social';

const BASE_NAV = [
  { href: '/live', label: 'Live', fkey: 'F1' },
  { href: '/trending', label: 'Trending', fkey: 'F2' },
  { href: '/narratives', label: 'Narratives', fkey: 'F3' },
  { href: '/graduating', label: 'Graduating', fkey: 'F4' },
  { href: '/wallet', label: 'Wallet', fkey: 'F5' },
  { href: '/roast', label: 'Roast', fkey: 'F6' },
  { href: '/pricing', label: 'Pricing', fkey: 'F7' },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Honest connection indicator — reflects the actual WebSocket state. */
function ConnectionPill(): JSX.Element {
  const status = useConnectionStore((s) => s.status);
  const cfg = {
    live: { label: 'LIVE', dot: 'bg-green', cls: 'text-text-dim border-border' },
    reconnecting: {
      label: 'RECONNECT',
      dot: 'bg-amber animate-pulse-dot',
      cls: 'text-amber border-amber/40',
    },
    demo: { label: 'DEMO', dot: 'bg-text-muted', cls: 'text-text-muted border-border' },
  }[status];

  return (
    <div
      className={`hidden md:inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 border rounded uppercase tracking-wider ${cfg.cls}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'live' ? 'animate-pulse-dot shadow-[0_0_8px_#00ff66]' : ''}`}
      />
      <span>{cfg.label}</span>
    </div>
  );
}

export function Topbar(): JSX.Element {
  const pathname = usePathname();
  const isPro = useProStore((s) => s.isPro);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navItems = mounted && isPro
    ? [...BASE_NAV, { href: '/watchlist', label: 'Watchlist', fkey: 'F8' } as const]
    : BASE_NAV;

  return (
    <header
      className="sticky top-0 z-[100] h-14 flex items-center gap-3 sm:gap-6 px-4 sm:px-5 border-b border-border backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,255,102,0.07),0_12px_32px_-16px_rgba(0,255,102,0.18)]"
      style={{ background: 'rgba(5, 10, 7, 0.9)' }}
    >
      <Link href="/" className="flex items-center gap-2.5 text-text no-underline">
        <Logo size={28} />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-bold tracking-tight">
            PumpTerminal
          </span>
          <span className="font-sans text-[8px] text-text-muted tracking-[0.2em] uppercase mt-0.5">
            v0.1 · Mainnet
          </span>
        </div>
      </Link>

      <nav className="hidden lg:flex gap-1 font-mono text-xs font-medium">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            className={`px-2.5 py-1.5 uppercase tracking-wider transition-all duration-150 hover:text-text hover:bg-bg-elev ${
              isActive(pathname, item.href)
                ? 'text-green bg-green/10'
                : 'text-text-dim'
            }`}
          >
            <span
              className={`mr-1.5 inline-block border px-1 py-px text-[8px] leading-none align-[1px] ${
                isActive(pathname, item.href)
                  ? 'text-green/80 border-green/30'
                  : 'text-text-muted border-border'
              }`}
            >
              {item.fkey}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded border border-border text-text-dim hover:text-text hover:border-border-bright"
        >
          {menuOpen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>

        <ConnectionPill />
        <a
          href={SOCIAL.x.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded border border-border text-text-dim hover:text-text hover:border-border-bright transition-colors"
          aria-label={`Pump Terminal on X — ${SOCIAL.x.handle}`}
          title={SOCIAL.x.handle}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18.244 2H21l-6.52 7.45L22 22h-6.84l-4.78-6.27L4.8 22H2l7-8L1.5 2H8.5l4.32 5.71L18.244 2zm-2.4 18h1.74L7.24 4H5.36l10.484 16z" />
          </svg>
        </a>
        {mounted && isPro ? (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 bg-green/10 border border-green/50 text-green px-3 py-1.5 rounded font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-green/15"
          >
            ✓ PRO
          </Link>
        ) : (
          <Link
            href="/pricing"
            className="bg-green text-black px-4 py-2 rounded font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-150 hover:bg-green-dim hover:shadow-[0_0_16px_rgba(0,255,102,0.4)]"
          >
            UPGRADE
          </Link>
        )}
      </div>

      {menuOpen && (
        <div
          className="lg:hidden absolute top-14 left-0 right-0 border-b border-border backdrop-blur-xl shadow-lg"
          style={{ background: 'rgba(5, 10, 7, 0.95)' }}
        >
          <nav className="flex flex-col py-2 font-mono text-xs">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                className={`px-5 py-3 uppercase tracking-wider transition-colors ${
                  isActive(pathname, item.href)
                    ? 'text-green bg-green/10 border-l-2 border-green'
                    : 'text-text-dim border-l-2 border-transparent hover:text-text hover:bg-bg-elev'
                }`}
              >
                <span className="mr-2 text-[9px] text-text-muted">{item.fkey}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
