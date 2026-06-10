'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Token } from '@/types';
import { cn, formatAge, formatUsd, getCategoryBadgeClass } from '@/lib/utils';

type SortKey = 'age' | 'mc' | 'holders' | 'buys' | 'dev' | 'curve';
type SortDir = 'desc' | 'asc';

interface FeedRowsProps {
  tokens: Token[];
}

const COLS =
  'grid grid-cols-[minmax(0,1.7fr)_70px_90px_64px_88px_64px_120px_64px] gap-2 items-center';

const SORTERS: Record<SortKey, (t: Token) => number> = {
  age: (t) => new Date(t.createdAt).getTime(),
  mc: (t) => t.marketCapUsd,
  holders: (t) => t.holdersCount,
  buys: (t) => t.buys1h,
  dev: (t) => t.devHoldingPct,
  curve: (t) => t.bondingCurveProgress,
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

/**
 * Dense Bloomberg-style row view of the feed. Column headers sort
 * (desc → asc → off); j/k or arrow keys move the selection, Enter opens
 * the selected token.
 */
export function FeedRows({ tokens }: FeedRowsProps): JSX.Element {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    if (!sortKey) return tokens;
    const get = SORTERS[sortKey];
    const sign = sortDir === 'desc' ? -1 : 1;
    return [...tokens].sort((a, b) => sign * (get(a) - get(b)));
  }, [tokens, sortKey, sortDir]);

  const cycleSort = (key: SortKey): void => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir('asc');
    } else {
      setSortKey(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, rows.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter' && selected >= 0 && rows[selected]) {
        e.preventDefault();
        router.push(`/token/${rows[selected]!.mintAddress}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, selected, router]);

  useEffect(() => {
    if (selected < 0) return;
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const TH = ({ label, k }: { label: string; k?: SortKey }): JSX.Element => (
    <button
      type="button"
      disabled={!k}
      onClick={k ? () => cycleSort(k) : undefined}
      className={cn(
        'text-left font-mono text-[9px] uppercase tracking-[0.15em] py-2 disabled:cursor-default',
        sortKey && k === sortKey ? 'text-green' : 'text-text-muted',
        k && 'hover:text-text-dim cursor-pointer',
      )}
    >
      {label}
      {k && sortKey === k && (
        <span className="ml-1 text-[8px]">{sortDir === 'desc' ? '▼' : '▲'}</span>
      )}
    </button>
  );

  return (
    <div className="border border-border bg-bg-elev/40">
      {/* header */}
      <div className={cn(COLS, 'px-3 border-b border-border bg-bg sticky top-[88px] z-10')}>
        <TH label="Token" />
        <TH label="Age" k="age" />
        <TH label="MC" k="mc" />
        <TH label="Hldrs" k="holders" />
        <TH label="B / S" k="buys" />
        <TH label="Dev%" k="dev" />
        <TH label="Curve" k="curve" />
        <TH label="Risk" />
      </div>

      {/* rows */}
      <div ref={listRef} className="divide-y divide-border/60">
        {rows.map((t, i) => (
          <Link
            key={t.mintAddress}
            href={`/token/${t.mintAddress}`}
            onMouseEnter={() => setSelected(i)}
            className={cn(
              COLS,
              'px-3 h-10 font-mono text-[11px] no-underline transition-colors duration-100',
              i === selected
                ? 'bg-green/[0.06] shadow-[inset_2px_0_0_0_#00ff66]'
                : 'hover:bg-bg-elev-2',
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-text font-bold whitespace-nowrap">${t.symbol}</span>
              <span className="text-text-muted truncate hidden sm:inline">{t.name}</span>
              <span className={cn('badge hidden lg:inline-block', getCategoryBadgeClass(t.category))}>
                {t.category}
              </span>
            </span>
            <span className="text-text-dim">{formatAge(t.createdAt)}</span>
            <span className="text-text font-semibold">{formatUsd(t.marketCapUsd)}</span>
            <span className="text-text-dim">{t.holdersCount}</span>
            <span>
              <span className="text-green">{t.buys1h}</span>
              <span className="text-text-muted"> / </span>
              <span className="text-red">{t.sells1h}</span>
            </span>
            <span className={t.devHoldingPct > 10 ? 'text-red' : 'text-text-dim'}>
              {t.devHoldingPct.toFixed(1)}
            </span>
            <span className="flex items-center gap-2">
              <span className="flex-1 h-1 bg-bg-elev-2 overflow-hidden">
                <span
                  className="block h-full bg-green"
                  style={{ width: `${Math.min(100, t.bondingCurveProgress * 100)}%` }}
                />
              </span>
              <span className="text-text-dim w-8 text-right">
                {Math.round(t.bondingCurveProgress * 100)}%
              </span>
            </span>
            <span
              className={
                t.riskLevel === 'low'
                  ? 'text-green'
                  : t.riskLevel === 'medium'
                    ? 'text-amber'
                    : 'text-red'
              }
            >
              {t.riskLevel === 'low' ? 'LOW' : t.riskLevel === 'medium' ? 'MED' : 'HIGH'}
            </span>
          </Link>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-border font-mono text-[9px] text-text-muted uppercase tracking-[0.15em]">
        <span className="text-text-dim">j/k</span> navigate · <span className="text-text-dim">enter</span> open ·{' '}
        <span className="text-text-dim">{rows.length}</span> tokens
      </div>
    </div>
  );
}
