'use client';

import { useMemo } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { TokenCard } from '@/components/feed/TokenCard';
import { useLiveFeed } from '@/hooks/use-live-feed';

export default function TrendingPage(): JSX.Element {
  const { tokens, live } = useLiveFeed();
  const ranked = useMemo(
    () =>
      [...tokens]
        .sort((a, b) => b.volume24hUsd - a.volume24hUsd || b.marketCapUsd - a.marketCapUsd)
        .slice(0, 40),
    [tokens],
  );

  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-end justify-between mb-6 pb-4 border-b border-border">
          <h1 className="font-display text-[28px] tracking-tight">
            Trending <span className="text-green">Now</span>
          </h1>
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
            {live ? 'ranked by traded volume · live' : 'demo data'}
          </span>
        </div>
        {ranked.length === 0 ? (
          <p className="font-mono text-sm text-text-dim py-16 text-center">
            No tokens in the feed yet — they&apos;ll appear as launches come in.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {ranked.map((t) => (
              <TokenCard key={t.mintAddress} token={t} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
