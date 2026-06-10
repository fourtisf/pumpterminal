'use client';

import { useMemo } from 'react';
import { useFiltersStore } from '@/lib/filters-store';
import type { Token } from '@/types';
import { TokenCard } from './TokenCard';

interface FeedGridProps {
  tokens: Token[];
  cols?: 1 | 2;
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

export function FeedGrid({ tokens, cols = 2 }: FeedGridProps): JSX.Element {
  const filters = useFiltersStore();
  const filtered = useMemo(() => applyFilters(tokens, filters), [tokens, filters]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-text-dim font-mono text-sm">
        No tokens match these filters.{' '}
        <button
          onClick={filters.reset}
          className="text-green underline hover:text-green-dim"
        >
          Reset filters
        </button>
      </div>
    );
  }

  return (
    <div className={cols === 1 ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 xl:grid-cols-2 gap-3'}>
      {filtered.map((token) => (
        <TokenCard key={token.mintAddress} token={token} />
      ))}
    </div>
  );
}
