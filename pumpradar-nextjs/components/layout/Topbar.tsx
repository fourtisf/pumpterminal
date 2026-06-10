'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { useProStore } from '@/lib/pro-store';
import { SOCIAL } from '@/lib/social';

const BASE_NAV = [
  { href: '/live', label: 'Live' },
  { href: '/trending', label: 'Trending' },
  { href: '/narratives', label: 'Narratives' },
  { href: '/graduating', label: 'Graduating' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/roast', label: 'Roast' },
  { href: '/pricing', label: 'Pricing' },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
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
    ? [...BASE_NAV, { href: '/watchlist', label: 'Watchlist' } as const]
    : BASE_NAV;

  return (
    <header
      className="sticky top-0 z-[100] h-14 flex items-center gap-3 sm:gap-6 px-4 sm:px-5 border-b border-border backdrop-blur-xl"
      style={{ background: 'rgba(10, 11, 13, 0.85)' }}
    >
      <Link href="/" className="flex items-center gap-2.5 text-text no-underline">
        <Logo size={28} />
        <div className="flex flex-col leading-none">
          <span className="font-display text-base tracking-wider">PUMPRADAR</span>
          <span className="font-mono text-[8px] text-text-muted tracking-[0.2em] mt-0.5">
            v0.1 · MAINNET
          </span>
        </div>
      </Link>

      <nav className="hidden lg:flex gap-1 font-mono text-xs font-medium">
        {BASE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            className={`px-3 py-1.5 rounded uppercase tracking-wider transition-all duration-150 hover:text-text hover:bg-bg-elev ${
              isActive(pathname, item.href)
                ? 'text-green bg-green/10 before:content-[">"] before:mr-1 before:text-green'
                : 'text-text-dim'
            }`}
          >
            {item.label}
          </Link>
        ))}
        {mounted && isPro && (
          <Link
            href="/watchlist"
            aria-current={isActive(pathname, '/watchlist') ? 'page' : undefined}
            className={`px-3 py-1.5 rounded uppercase tracking-wider transition-all duration-150 hover:text-text hover:bg-bg-elev ${
              isActive(pathname, '/watchlist')
                ? 'text-green bg-green/10 before:content-[">"] before:mr-1 before:text-green'
                : 'text-text-dim'
            }`}
          >
            Watchlist
          </Link>
        )}
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

        <div className="hidden md:inline-flex items-center gap-1.5 font-mono text-[10px] text-text-dim px-2.5 py-1 border border-border rounded uppercase tracking-wider">
          <span className="status-dot" />
          <span>LIVE</span>
        </div>
        <a
          href={SOCIAL.x.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded border border-border text-text-dim hover:text-text hover:border-border-bright transition-colors"
          aria-label={`PumpRadar on X — ${SOCIAL.x.handle}`}
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
            className="bg-gradient-to-r from-amber to-green text-black px-4 py-2 rounded font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-150 hover:brightness-110 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,255,136,0.3)]"
          >
            UPGRADE
          </Link>
        )}
      </div>

      {menuOpen && (
        <div
          className="lg:hidden absolute top-14 left-0 right-0 border-b border-border backdrop-blur-xl shadow-lg"
          style={{ background: 'rgba(10, 11, 13, 0.95)' }}
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
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
