'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { TokenCard } from '@/components/feed/TokenCard';
import { useGraduating, graduatingEventToToken } from '@/hooks/use-graduating';

const WINDOWS = [
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
] as const;

export default function GraduatingPage(): JSX.Element {
  const [win, setWin] = useState<(typeof WINDOWS)[number]['value']>('24h');
  const { events, sinceWorkerStart, loading, error } = useGraduating(win);
  const tokens = useMemo(() => events.map(graduatingEventToToken), [events]);

  const sinceLabel = sinceWorkerStart
    ? `worker live for ${formatDistanceToNowStrict(new Date(sinceWorkerStart))}`
    : null;

  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-end justify-between mb-6 pb-4 border-b border-border gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-[28px] tracking-tight">
              About to <span className="text-green">Graduate</span>
            </h1>
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mt-2">
              bonding curve ≥ 80% · peak mc ≥ $40k (graduation zone) · {events.length} in window
              {sinceLabel ? ` · ${sinceLabel}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                onClick={() => setWin(w.value)}
                className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider rounded transition-colors ${
                  win === w.value
                    ? 'bg-green text-black font-bold'
                    : 'text-text-dim hover:text-text border border-border'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {loading && events.length === 0 ? (
          <p className="font-mono text-sm text-text-dim py-16 text-center">Loading…</p>
        ) : error ? (
          <p className="font-mono text-sm text-amber py-16 text-center">
            Couldn&apos;t reach the worker: {error}
          </p>
        ) : tokens.length === 0 ? (
          <p className="font-mono text-sm text-text-dim py-16 text-center">
            No graduations in this window yet. The log starts fresh on worker boot — if you just
            restarted, give it time, or widen the window.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {tokens.map((t) => (
              <TokenCard key={t.mintAddress} token={t} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
