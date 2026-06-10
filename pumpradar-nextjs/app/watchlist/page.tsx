'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { TokenCard } from '@/components/feed/TokenCard';
import { useLiveFeed } from '@/hooks/use-live-feed';
import { useProStore } from '@/lib/pro-store';
import { shortenAddress } from '@/lib/utils';

export default function WatchlistPage(): JSX.Element {
  const isPro = useProStore((s) => s.isPro);
  const watchlist = useProStore((s) => s.watchlist);
  const toggleWatch = useProStore((s) => s.toggleWatch);
  const { tokens } = useLiveFeed();

  const byMint = useMemo(() => {
    const m = new Map(tokens.map((t) => [t.mintAddress, t]));
    return m;
  }, [tokens]);

  if (!isPro) {
    return (
      <>
        <Topbar />
        <TickerTape />
        <main className="max-w-md mx-auto px-5 py-20 text-center">
          <div className="text-3xl mb-3">⭐</div>
          <h1 className="font-display text-3xl text-text mb-2">Watchlist</h1>
          <p className="font-mono text-[11px] text-text-dim leading-relaxed mb-6">
            Star tokens straight from the live feed and jump back to them in one click. Pro feature.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-gradient-to-r from-amber to-green text-black px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider rounded hover:brightness-110"
          >
            Unlock with Pro →
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-end justify-between mb-6 pb-4 border-b border-border">
          <h1 className="font-display text-[28px] tracking-tight">
            Your <span className="text-green">Watchlist</span>
          </h1>
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
            {watchlist.length} starred
          </span>
        </div>

        {watchlist.length === 0 ? (
          <p className="font-mono text-sm text-text-dim py-16 text-center">
            Nothing starred yet. Hit the ⭐ on any token in the{' '}
            <Link href="/live" className="text-green hover:underline">live feed</Link> to track it here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {watchlist.map((mint) => {
              const token = byMint.get(mint);
              if (token) return <TokenCard key={mint} token={token} />;
              return (
                <div key={mint} className="bg-bg-elev border border-border border-dashed rounded-md p-4">
                  <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.15em] mb-2">
                    not in current feed window
                  </div>
                  <div className="font-mono text-sm text-text mb-3">{shortenAddress(mint, 6)}</div>
                  <div className="flex flex-wrap gap-3 font-mono text-[11px]">
                    <Link href={`/token/${mint}`} className="text-green hover:underline">
                      Open detail →
                    </Link>
                    <button
                      onClick={() => toggleWatch(mint)}
                      className="text-text-dim hover:text-red"
                    >
                      remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
