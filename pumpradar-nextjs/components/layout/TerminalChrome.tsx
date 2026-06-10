'use client';

import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/CommandPalette';
import { useConnectionStore } from '@/lib/connection-store';
import { useTickerPrices } from '@/hooks/use-ticker-prices';

function utcClock(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

const MODE_STYLE = {
  live: 'bg-green text-black',
  reconnecting: 'bg-amber text-black animate-pulse-line',
  demo: 'bg-bg-elev-2 text-text-dim border-r border-border',
} as const;

const MODE_LABEL = {
  live: '▮ LIVE',
  reconnecting: '▮ RECONNECT',
  demo: '▮ DEMO',
} as const;

/**
 * Global terminal chrome: four HUD corner ticks framing the viewport, a
 * fixed tmux-style status bar along the bottom (honest connection mode,
 * network, SOL/USD, ticking UTC clock), and the Ctrl+K command palette.
 * Rendered once in the root layout; body reserves 28px of bottom padding
 * for the bar.
 */
export function TerminalChrome(): JSX.Element {
  const [now, setNow] = useState<Date | null>(null);
  const { solPrice } = useTickerPrices();
  const status = useConnectionStore((s) => s.status);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // before hydration, render the configured-mode default to avoid mismatch
  const mode = mounted ? status : (process.env.NEXT_PUBLIC_WS_URL ? 'live' : 'demo');

  const corner = 'fixed w-3.5 h-3.5 border-green/40 pointer-events-none z-[9997]';

  return (
    <>
      {/* HUD corner ticks */}
      <span aria-hidden className={`${corner} top-1.5 left-1.5 border-t border-l`} />
      <span aria-hidden className={`${corner} top-1.5 right-1.5 border-t border-r`} />
      <span aria-hidden className={`${corner} bottom-9 left-1.5 border-b border-l`} />
      <span aria-hidden className={`${corner} bottom-9 right-1.5 border-b border-r`} />

      {/* bottom status bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9996] h-7 flex items-stretch font-mono text-[9px] uppercase tracking-[0.15em] border-t border-border select-none"
        style={{ background: 'rgba(5, 10, 7, 0.96)' }}
      >
        <span className={`flex items-center px-3 font-bold tracking-[0.2em] ${MODE_STYLE[mode]}`}>
          {MODE_LABEL[mode]}
        </span>
        <span className="hidden sm:flex items-center px-3 border-r border-border text-text-dim">
          MAINNET·SOLANA
        </span>
        <span className="hidden md:flex items-center px-3 text-text-muted">
          PUMPTERMINAL v0.1
        </span>

        <span className="ml-auto hidden lg:flex items-center px-3 border-l border-border text-text-muted">
          CTRL+K <span className="ml-1.5 text-text-dim">PALETTE</span>
        </span>
        <span className="hidden sm:flex items-center px-3 border-l border-border text-text-dim">
          SOL <span className="text-green ml-1.5">{solPrice ? `$${solPrice.toFixed(2)}` : '—'}</span>
        </span>
        <span className="flex items-center px-3 border-l border-border text-text-dim">
          <span suppressHydrationWarning>{now ? utcClock(now) : '--:--:--'}</span>
          <span className="ml-1.5 text-text-muted">UTC</span>
        </span>
      </div>

      <CommandPalette />
    </>
  );
}
