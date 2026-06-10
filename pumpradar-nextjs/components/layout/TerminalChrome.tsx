'use client';

import { useEffect, useState } from 'react';
import { useTickerPrices } from '@/hooks/use-ticker-prices';

function utcClock(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

/**
 * Global terminal chrome: four HUD corner ticks framing the viewport and a
 * fixed tmux-style status bar along the bottom (mode block, network, SOL/USD,
 * ticking UTC clock). Rendered once in the root layout; body reserves 28px
 * of bottom padding for the bar.
 */
export function TerminalChrome(): JSX.Element {
  const [now, setNow] = useState<Date | null>(null);
  const { solPrice } = useTickerPrices();

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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
        <span className="flex items-center px-3 bg-green text-black font-bold tracking-[0.2em]">
          ▮ LIVE
        </span>
        <span className="hidden sm:flex items-center px-3 border-r border-border text-text-dim">
          MAINNET·SOLANA
        </span>
        <span className="hidden md:flex items-center px-3 text-text-muted">
          PUMP_TERMINAL v0.1
        </span>

        <span className="ml-auto hidden sm:flex items-center px-3 border-l border-border text-text-dim">
          SOL <span className="text-green ml-1.5">{solPrice ? `$${solPrice.toFixed(2)}` : '—'}</span>
        </span>
        <span className="flex items-center px-3 border-l border-border text-text-dim">
          <span suppressHydrationWarning>{now ? utcClock(now) : '--:--:--'}</span>
          <span className="ml-1.5 text-text-muted">UTC</span>
        </span>
      </div>
    </>
  );
}
