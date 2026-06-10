'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { TokenHolding } from '@/lib/solana';
import { formatUsd, getAvatarGradient } from '@/lib/utils';

interface Props {
  holdings: TokenHolding[];
  totalUsd: number;
  tokenCount: number;
  limit?: number;
}

const DUST_USD = 1; // tokens below $1 = dust

export function HoldingsTable({ holdings, totalUsd, tokenCount, limit = 10 }: Props): JSX.Element {
  const [showDust, setShowDust] = useState(false);
  const dustCount = holdings.filter((h) => h.usdValue < DUST_USD).length;
  const filtered = showDust ? holdings : holdings.filter((h) => h.usdValue >= DUST_USD);
  const top = filtered.slice(0, limit);

  if (holdings.length === 0) {
    return (
      <p className="font-mono text-[11px] text-text-muted py-3">
        No SPL token holdings detected (or all dust). Worker didn’t see any priced tokens for this wallet.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between font-mono text-[10px] text-text-muted uppercase tracking-[0.15em] mb-1 gap-2 flex-wrap">
        <span>
          Holdings · {totalUsd > 0 ? formatUsd(totalUsd) : '—'}{' '}
          <span className="text-text-muted/70">across {tokenCount} tokens</span>
        </span>
        <span className="flex items-center gap-3">
          {dustCount > 0 && (
            <button
              type="button"
              onClick={() => setShowDust((v) => !v)}
              className="text-text-dim hover:text-green transition-colors normal-case tracking-normal"
            >
              {showDust ? `hide dust (${dustCount} < $1)` : `show dust (${dustCount} < $1)`}
            </button>
          )}
          <span>
            {top.length === limit && filtered.length > limit
              ? `top ${limit}`
              : `${top.length} token${top.length === 1 ? '' : 's'}`}
          </span>
        </span>
      </div>
      <div className="bg-bg border border-border rounded-md overflow-hidden">
        {top.length === 0 ? (
          <p className="font-mono text-[11px] text-text-muted px-3 py-3">
            All {dustCount} holdings are dust (&lt; $1). Click ‘show dust’ above to see them.
          </p>
        ) : (
          top.map((h, i) => (
            <HoldingRow key={h.mint} h={h} totalUsd={totalUsd} isLast={i === top.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}

function HoldingRow({ h, totalUsd, isLast }: { h: TokenHolding; totalUsd: number; isLast: boolean }): JSX.Element {
  const pct = totalUsd > 0 ? (h.usdValue / totalUsd) * 100 : 0;
  const label = h.symbol || `${h.mint.slice(0, 4)}…${h.mint.slice(-4)}`;
  return (
    <Link
      href={`/token/${h.mint}`}
      className={`flex items-center gap-3 px-3 py-2.5 hover:bg-bg-elev transition-colors ${isLast ? '' : 'border-b border-border'}`}
    >
      <Avatar src={h.imageUrl} seed={h.mint} label={label} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 font-mono text-[12px]">
          <span className="text-text font-semibold truncate">${label}</span>
          {h.pumpfunTracked && (
            <span className="text-[8px] text-green border border-green/40 bg-green/10 px-1.5 py-px rounded-sm uppercase tracking-wider whitespace-nowrap">
              ◆ tracked
            </span>
          )}
        </div>
        <div className="font-mono text-[10px] text-text-muted truncate">
          {h.name ?? '—'}
        </div>
      </div>
      <div className="text-right font-mono">
        <div className="text-[12px] text-text font-semibold">{h.usdValue > 0 ? formatUsd(h.usdValue) : '—'}</div>
        <div className="text-[9px] text-text-muted">
          {h.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          {pct > 0 ? ` · ${pct.toFixed(1)}%` : ''}
        </div>
      </div>
    </Link>
  );
}

function Avatar({ src, seed, label }: { src: string | null; seed: string; label: string }): JSX.Element {
  const [errored, setErrored] = useState(false);
  const initials = label.replace(/^\$/, '').slice(0, 2).toUpperCase();
  if (src && !errored) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={initials}
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-7 h-7 rounded-sm flex-shrink-0 object-cover border border-border"
      />
    );
  }
  return (
    <div
      className="w-7 h-7 rounded-sm flex-shrink-0 flex items-center justify-center font-mono text-[10px] font-bold text-black border border-border"
      style={{ background: getAvatarGradient(seed) }}
    >
      {initials}
    </div>
  );
}
