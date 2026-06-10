'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { TokenCard } from '@/components/feed/TokenCard';
import { useLiveFeed } from '@/hooks/use-live-feed';

export function LivePreview(): JSX.Element {
  const { tokens, live } = useLiveFeed();
  const sample = useMemo(() => tokens.slice(0, 6), [tokens]);

  if (sample.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-5 mt-20">
        <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.2em] text-center">
          live preview · connecting…
        </div>
      </div>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-5 mt-24">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.3em] mb-1">
            {live ? 'live · from the feed right now' : 'sample feed'}
          </div>
          <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight">
            This is what your <span className="text-green">/live</span> looks like.
          </h2>
        </div>
        <Link
          href="/live"
          className="hidden sm:inline-flex font-mono text-[11px] text-green hover:underline whitespace-nowrap"
        >
          open feed →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sample.map((t) => (
          <TokenCard key={t.mintAddress} token={t} />
        ))}
      </div>
    </section>
  );
}
