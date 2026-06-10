'use client';

import { useMemo } from 'react';
import { useLiveFeed } from '@/hooks/use-live-feed';
import { formatUsd } from '@/lib/utils';

export function LiveSignals(): JSX.Element {
  const { tokens, alerts, live, connected } = useLiveFeed();

  const stats = useMemo(() => {
    const hourAgo = Date.now() - 3_600_000;
    const lastHour = tokens.filter((t) => new Date(t.createdAt).getTime() >= hourAgo).length;
    const mcs = tokens.map((t) => t.marketCapUsd).filter((m) => m > 0);
    const avg = mcs.length ? Math.round(mcs.reduce((a, b) => a + b, 0) / mcs.length) : 0;
    const near = tokens.filter((t) => t.bondingCurveProgress >= 0.5).length;
    return { lastHour, avg, near, alerts: alerts.length };
  }, [tokens, alerts]);

  return (
    <div className="mx-auto max-w-4xl mt-12 px-5">
      <div className="flex items-center justify-center gap-2 font-mono text-[10px] text-text-muted uppercase tracking-[0.2em] mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green animate-pulse-dot' : 'bg-text-muted'}`} />
        {live ? (connected ? 'streaming · pumpfun mainnet' : 'reconnecting…') : 'demo mode'}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border rounded-md overflow-hidden">
        <Cell label="Launches (1h)" value={stats.lastHour.toLocaleString('en-US')} />
        <Cell label="Avg market cap" value={stats.avg > 0 ? formatUsd(stats.avg) : '—'} />
        <Cell label="Near graduation" value={stats.near.toLocaleString('en-US')} hint="≥50% curve" />
        <Cell label="Live alerts" value={stats.alerts.toLocaleString('en-US')} />
      </div>
    </div>
  );
}

function Cell({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div className="bg-bg-elev p-4 text-center">
      <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.15em] mb-1.5">{label}</div>
      <div className="font-mono text-xl font-bold text-text leading-none">{value}</div>
      {hint && <div className="font-mono text-[9px] text-text-muted mt-1">{hint}</div>}
    </div>
  );
}
