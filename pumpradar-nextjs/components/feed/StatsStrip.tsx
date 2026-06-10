'use client';

import { useMemo } from 'react';
import type { Token } from '@/types';
import { formatUsd } from '@/lib/utils';

interface StatBlock {
  label: string;
  value: string;
  delta: string;
  deltaDirection: 'up' | 'down' | 'neutral';
}

const DEMO_STATS: StatBlock[] = [
  { label: 'Launches / hr', value: '487', delta: 'demo data', deltaDirection: 'neutral' },
  { label: 'Avg MC at 1h', value: '$14.2K', delta: 'demo data', deltaDirection: 'neutral' },
  { label: 'Top narrative', value: 'AI', delta: '37% share', deltaDirection: 'neutral' },
  { label: 'Graduates / 24h', value: '42', delta: 'demo data', deltaDirection: 'neutral' },
];

const NEAR_GRADUATION = 0.8;

function liveStats(tokens: Token[]): StatBlock[] {
  const hourAgo = Date.now() - 3_600_000;
  const lastHour = tokens.filter((t) => new Date(t.createdAt).getTime() >= hourAgo).length;

  const mcs = tokens.map((t) => t.marketCapUsd).filter((m) => m > 0);
  const avgMc = mcs.length ? Math.round(mcs.reduce((a, b) => a + b, 0) / mcs.length) : 0;

  const counts = new Map<Token['category'], number>();
  for (const t of tokens) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  let topCat = '—';
  let topCount = 0;
  for (const [cat, n] of counts) {
    if (n > topCount) {
      topCount = n;
      topCat = cat;
    }
  }
  const share = tokens.length ? Math.round((topCount / tokens.length) * 100) : 0;

  const graduating = tokens.filter((t) => !t.isComplete && t.bondingCurveProgress >= NEAR_GRADUATION).length;

  return [
    {
      label: 'Launches (1h, feed)',
      value: lastHour.toLocaleString('en-US'),
      delta: 'live from pump.fun',
      deltaDirection: 'neutral',
    },
    {
      label: 'Avg MC (in feed)',
      value: avgMc > 0 ? formatUsd(avgMc) : '—',
      delta: `${mcs.length} tokens`,
      deltaDirection: 'neutral',
    },
    {
      label: 'Top narrative',
      value: topCat,
      delta: share > 0 ? `${share}% share` : '—',
      deltaDirection: 'neutral',
    },
    {
      label: 'Near graduation',
      value: graduating.toLocaleString('en-US'),
      delta: '≥80% bonding curve',
      deltaDirection: graduating > 0 ? 'up' : 'neutral',
    },
  ];
}

interface StatsStripProps {
  tokens?: Token[];
  live?: boolean;
}

export function StatsStrip({ tokens, live = false }: StatsStripProps): JSX.Element {
  const stats = useMemo(
    () => (live && tokens ? liveStats(tokens) : DEMO_STATS),
    [live, tokens],
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-md overflow-hidden mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-bg-elev p-4 transition-colors duration-150 hover:bg-bg-elev-2 group">
          <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.15em] mb-1.5">
            <span className="text-green/50 mr-1.5 group-hover:text-green transition-colors">▪</span>
            {stat.label}
          </div>
          <div className="font-mono text-[22px] font-bold text-text leading-none tracking-tight">
            {stat.value}
          </div>
          <div
            className={`font-mono text-[10px] mt-1.5 ${
              stat.deltaDirection === 'down'
                ? 'text-red'
                : stat.deltaDirection === 'up'
                  ? 'text-green'
                  : 'text-text-dim'
            }`}
          >
            {stat.delta}
          </div>
        </div>
      ))}
    </div>
  );
}
