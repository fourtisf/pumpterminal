'use client';

import { useMemo } from 'react';
import type { Token } from '@/types';
import { useLiveFeed } from '@/hooks/use-live-feed';
import { LiveSignals } from './LiveSignals';
import { formatUsd } from '@/lib/utils';

const BOOT_LINES = [
  { tag: '[ boot  ]', cls: 'text-amber', text: ' pump_terminal v0.1 · mainnet' },
  { tag: '[  ok   ]', cls: 'text-green', text: ' pump.fun firehose connected' },
  { tag: '[  ok   ]', cls: 'text-green', text: ' narrative classifier online' },
] as const;

function tapeTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

/**
 * The hero terminal window: a real live tape. Three boot lines, then the
 * newest launches streaming in from the same feed hook that powers /live
 * (mock pool when no backend is configured). One hook instance feeds both
 * the tape and the signals strip below it.
 */
export function LandingLive(): JSX.Element {
  const { tokens, alerts, live, connected } = useLiveFeed();

  // newest at the bottom, like terminal output
  const tape = useMemo(() => tokens.slice(0, 5).reverse(), [tokens]);

  return (
    <>
      <div className="rise rise-4 mt-12 mx-auto max-w-2xl text-left bg-bg-elev/90 border border-border rounded-lg overflow-hidden shadow-[0_20px_80px_-20px_rgba(0,255,102,0.2),0_0_0_1px_rgba(0,255,102,0.06)] backdrop-blur-sm">
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-bg">
          <span className="w-2.5 h-2.5 rounded-full bg-red/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-green/60" />
          <span className="ml-3 font-mono text-[10px] text-text-muted">pump_terminal — live tape</span>
          <span
            className={`ml-auto font-mono text-[9px] tracking-[0.2em] px-1.5 py-0.5 border ${
              live && connected
                ? 'text-green border-green/30 bg-green/[0.06]'
                : live
                  ? 'text-amber border-amber/30 bg-amber/[0.06]'
                  : 'text-text-muted border-border'
            }`}
          >
            {live ? (connected ? 'LIVE' : 'SYNC') : 'DEMO'}
          </span>
        </div>

        <div className="p-5 font-mono text-[12px] leading-relaxed text-text-dim min-h-[210px]">
          {BOOT_LINES.map((l) => (
            <div key={l.tag + l.text}>
              <span className={l.cls}>{l.tag}</span>
              {l.text}
            </div>
          ))}

          {tape.length === 0 && (
            <div>
              <span className="text-amber">[ sync  ]</span> waiting for the next launch…
            </div>
          )}
          {tape.map((t: Token) => (
            <div key={t.mintAddress} className="animate-live-flash truncate">
              <span className="text-text-muted">[{tapeTime(t.createdAt)}]</span>{' '}
              <span className="text-green">▶</span>{' '}
              <span className="text-text font-semibold">${t.symbol}</span>{' '}
              <span className="text-text-muted">·</span> MC {formatUsd(t.marketCapUsd)}{' '}
              <span className="text-text-muted">·</span> curve{' '}
              {Math.round(t.bondingCurveProgress * 100)}%{' '}
              <span className="text-text-muted">·</span> {t.category}
            </div>
          ))}

          <div>
            <span className="text-green">$</span>
            <span className="term-cursor ml-1.5 !h-[1em]" aria-hidden />
          </div>
        </div>
      </div>

      <LiveSignals tokens={tokens} alerts={alerts} live={live} connected={connected} />
    </>
  );
}
