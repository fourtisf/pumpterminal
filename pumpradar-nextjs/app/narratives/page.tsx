'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { TokenCard } from '@/components/feed/TokenCard';
import { useNarratives } from '@/hooks/use-narratives';
import { getCategoryColor } from '@/lib/utils';
import { MOCK_NARRATIVES } from '@/lib/mock-data';
import type { Token, TokenCategory } from '@/types';

interface NarrativeRow {
  category: TokenCategory;
  count: number;
  percentage: number;
  color: string;
  examples: string[];
  tokens: Token[];
}

export default function NarrativesPage(): JSX.Element {
  const { rows: apiRows, total, live, loading } = useNarratives(24);
  const [expanded, setExpanded] = useState<TokenCategory | null>(null);

  const rows = useMemo<NarrativeRow[]>(() => {
    if (live && apiRows.length > 0) {
      return apiRows.map((r) => ({
        category: r.category,
        count: r.count,
        percentage: r.percentage,
        color: getCategoryColor(r.category),
        examples: r.tokens.slice(0, 4).map((t) => t.symbol),
        tokens: r.tokens,
      }));
    }
    return MOCK_NARRATIVES.map((n) => ({
      category: n.category,
      count: n.count,
      percentage: n.percentage,
      color: n.colorVar,
      examples: [],
      tokens: [],
    }));
  }, [live, apiRows]);

  const maxPct = Math.max(1, ...rows.map((r) => r.percentage));

  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6 pb-4 border-b border-border">
          <h1 className="font-display text-2xl sm:text-[28px] tracking-tight">
            Narrative <span className="text-green">Heat</span>
          </h1>
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
            {live
              ? `${total.toLocaleString('en-US')} tokens · last 24h · live`
              : loading
                ? 'loading…'
                : 'demo data'}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const isOpen = expanded === row.category;
            const canExpand = row.tokens.length > 0;
            return (
              <div key={row.category} className="bg-bg-elev border border-border rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => canExpand && setExpanded(isOpen ? null : row.category)}
                  disabled={!canExpand}
                  aria-expanded={isOpen}
                  className={`w-full text-left p-4 transition-colors ${
                    canExpand ? 'cursor-pointer hover:bg-bg-elev-2' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 font-mono text-xs gap-3">
                    <span className="flex items-center gap-2 text-text font-semibold min-w-0">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: row.color }} />
                      <span className="truncate">{row.category}</span>
                    </span>
                    <span className="text-text-dim flex items-center gap-2 flex-shrink-0">
                      <span>{row.count.toLocaleString('en-US')} · {row.percentage}%</span>
                      {canExpand && (
                        <span className={`text-text-muted transition-transform duration-150 ${isOpen ? 'rotate-90 text-green' : ''}`}>
                          ▸
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-bg rounded-sm overflow-hidden mb-2">
                    <div
                      className="h-full rounded-sm transition-[width] duration-700"
                      style={{ width: `${Math.max(4, (row.percentage / maxPct) * 100)}%`, background: row.color }}
                    />
                  </div>
                  {row.examples.length > 0 && (
                    <div className="font-mono text-[10px] text-text-muted">
                      Top: {row.examples.map((s) => `$${s}`).join('  ')}
                    </div>
                  )}
                </button>

                {isOpen && canExpand && (
                  <div className="border-t border-border p-3 sm:p-4 bg-bg">
                    <div className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-3">
                      {row.tokens.length} {row.tokens.length === 1 ? 'token' : 'tokens'} in {row.category} · last 24h
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {row.tokens.slice(0, 50).map((t) => (
                        <TokenCard key={t.mintAddress} token={t} />
                      ))}
                    </div>
                    {row.tokens.length > 50 && (
                      <div className="mt-3 font-mono text-[10px] text-text-muted text-center">
                        showing top 50 of {row.tokens.length}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Link href="/live" className="inline-block mt-6 font-mono text-[11px] text-green hover:underline">
          ← Back to Live Feed
        </Link>
      </main>
    </>
  );
}
