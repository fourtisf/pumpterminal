'use client';

import { useMemo } from 'react';
import { useFiltersStore } from '@/lib/filters-store';
import type { Token } from '@/types';
import { TokenCard } from './TokenCard';
import { FeedRows } from './FeedRows';

export type FeedView = 'cards' | 'rows';

interface FeedGridProps {
  tokens: Token[];
  cols?: 1 | 2;
  view?: FeedView;
  /** live mode, nothing received yet — show skeletons instead of emptiness */
  loading?: boolean;
}

function hasLink(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.length > 0;
}

/**
 * Apply client-side filters from the FiltersStore to the incoming feed.
 *
 * Note: virtualization is intentionally skipped at MVP — feed is capped at
 * 100 items in the WebSocket hook. When real volume hits 1000+ tokens visible,
 * swap the .map() for @tanstack/react-virtual.
 */
function applyFilters(tokens: Token[], filters: ReturnType<typeof useFiltersStore.getState>): Token[] {
  let result = tokens;

  if (filters.category !== 'all') {
    result = result.filter((t) => t.category === filters.category);
  }

  if (filters.smartMoneyOnly) {
    result = result.filter((t) => t.hasSmartMoney);
  }

  if (filters.lowRiskOnly) {
    result = result.filter((t) => t.riskLevel === 'low');
  }

  if (filters.hideBundled) {
    result = result.filter((t) => t.devHoldingPct <= 10);
  }

  if (filters.minMarketCap > 0) {
    result = result.filter((t) => t.marketCapUsd >= filters.minMarketCap);
  }

  if (filters.maxAgeMinutes > 0) {
    const cutoff = Date.now() - filters.maxAgeMinutes * 60_000;
    result = result.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  }

  if (filters.hasTwitter) {
    result = result.filter((t) => hasLink(t.twitterUrl));
  }

  if (filters.hasTelegram) {
    result = result.filter((t) => hasLink(t.telegramUrl));
  }

  switch (filters.sortBy) {
    case 'new':
      result = [...result].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case 'volume':
      result = [...result].sort((a, b) => b.volume24hUsd - a.volume24hUsd);
      break;
    case 'market_cap':
      result = [...result].sort((a, b) => b.marketCapUsd - a.marketCapUsd);
      break;
  }

  return result;
}

export function FeedGrid({ tokens, cols = 2, view = 'cards', loading = false }: FeedGridProps): JSX.Element {
  const filters = useFiltersStore();
  const filtered = useMemo(() => applyFilters(tokens, filters), [tokens, filters]);

  if (loading && tokens.length === 0) {
    return <FeedSkeleton view={view} cols={cols} />;
  }

  if (filtered.length === 0) {
    return (
      <div className="border border-border bg-bg-elev/40 py-14 px-6 text-center font-mono">
        <div className="text-[13px] text-text-dim mb-1.5">
          <span className="text-green mr-2" aria-hidden>▌</span>
          {tokens.length === 0 ? 'scanning the chain — waiting for launches' : 'no tokens match these filters'}
          <span className="term-cursor ml-1.5 !h-[0.9em]" aria-hidden />
        </div>
        {tokens.length > 0 && (
          <button
            onClick={filters.reset}
            className="mt-3 border border-border-bright text-text-dim px-3 py-1.5 text-[10px] uppercase tracking-wider hover:border-green hover:text-green transition-colors"
          >
            Reset filters
          </button>
        )}
      </div>
    );
  }

  if (view === 'rows') {
    return <FeedRows tokens={filtered} />;
  }

  return (
    <div className={cols === 1 ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 xl:grid-cols-2 gap-3'}>
      {filtered.map((token) => (
        <TokenCard key={token.mintAddress} token={token} />
      ))}
    </div>
  );
}

/* ---------- Loading skeletons ---------- */

function Shimmer(): JSX.Element {
  return (
    <span
      aria-hidden
      className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-green/[0.05] to-transparent"
    />
  );
}

function FeedSkeleton({ view, cols }: { view: FeedView; cols: 1 | 2 }): JSX.Element {
  if (view === 'rows') {
    return (
      <div className="border border-border divide-y divide-border/60" aria-label="Loading feed" role="status">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="relative overflow-hidden h-10 px-3 flex items-center gap-4">
            <Shimmer />
            <span className="h-2.5 w-16 bg-bg-elev-2" />
            <span className="h-2.5 w-32 bg-bg-elev-2 hidden sm:block" />
            <span className="h-2.5 w-14 bg-bg-elev-2 ml-auto" />
            <span className="h-2.5 w-20 bg-bg-elev-2" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      className={cols === 1 ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 xl:grid-cols-2 gap-3'}
      aria-label="Loading feed"
      role="status"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="relative overflow-hidden bg-bg-elev border border-border p-3.5">
          <Shimmer />
          <div className="flex gap-3 mb-3">
            <span className="w-12 h-12 bg-bg-elev-2 flex-shrink-0" />
            <div className="flex-1 pt-1">
              <div className="h-3 w-2/3 bg-bg-elev-2 mb-2" />
              <div className="h-2.5 w-1/3 bg-bg-elev-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-dashed border-border">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j}>
                <div className="h-2 w-14 bg-bg-elev-2 mb-1.5" />
                <div className="h-2.5 w-20 bg-bg-elev-2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
