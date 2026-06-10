'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Token, RiskLevel } from '@/types';
import { categoryFor, useProStore } from '@/lib/pro-store';
import {
  cn,
  formatUsd,
  formatAge,
  isAgeFresh,
  getAvatarGradient,
  getCategoryBadgeClass,
} from '@/lib/utils';

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps): JSX.Element {
  // Compute fresh/age client-side so it ticks with time
  const [age, setAge] = useState(() => formatAge(token.createdAt));
  const [isFresh, setIsFresh] = useState(() => isAgeFresh(token.createdAt));
  const router = useRouter();
  const isPro = useProStore((s) => s.isPro);
  const watchedRaw = useProStore((s) => s.watchlist.includes(token.mintAddress));
  const overrides = useProStore((s) => s.overrides);
  const trustedRaw = useProStore((s) => s.trustedCreators.includes(token.creatorWallet));
  const toggleWatch = useProStore((s) => s.toggleWatch);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const watched = mounted && watchedRaw;
  const trustedCreator = mounted && trustedRaw;
  const category = mounted
    ? categoryFor(`${token.name} ${token.symbol}`, token.category, overrides)
    : token.category;

  useEffect(() => {
    const interval = setInterval(() => {
      setAge(formatAge(token.createdAt));
      setIsFresh(isAgeFresh(token.createdAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [token.createdAt]);

  const onStar = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPro) {
      router.push('/pricing');
      return;
    }
    toggleWatch(token.mintAddress);
  };

  const initials = token.symbol.slice(0, 2).toUpperCase();
  const buySellRatio = token.sells1h > 0 ? token.buys1h / token.sells1h : token.buys1h;
  const isBuyDominant = buySellRatio > 2;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onStar}
        aria-label={watched ? 'Unstar token' : isPro ? 'Star token' : 'Star token (Pro)'}
        title={watched ? 'Remove from watchlist' : isPro ? 'Add to watchlist' : 'Pro feature — click to learn more'}
        className={cn(
          'absolute top-2 left-2 z-20 w-6 h-6 rounded-full font-mono text-[12px] leading-none flex items-center justify-center transition-all duration-100',
          watched
            ? 'bg-amber/15 text-amber border border-amber/50'
            : 'bg-bg/60 text-text-muted border border-border hover:text-amber hover:border-amber/50',
        )}
      >
        {watched ? '★' : '☆'}
      </button>
    <Link
      href={`/token/${token.mintAddress}`}
      className={cn(
        'block bg-bg-elev border rounded-md p-3.5 cursor-pointer transition-all duration-150 relative overflow-hidden group',
        'hover:-translate-y-px hover:shadow-[3px_3px_0_0_rgba(0,255,102,0.14)]',
        isFresh && 'animate-fresh-glow border-green/40',
        !isFresh && token.hasSmartMoney && 'border-purple/40',
        !isFresh && !token.hasSmartMoney && 'border-border hover:border-green/40',
      )}
    >
      {/* Hover gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100"
        style={{
          background:
            'linear-gradient(135deg, transparent 0%, rgba(0, 255, 102, 0.04) 100%)',
        }}
      />

      {/* HUD corner ticks on hover */}
      <span aria-hidden className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-transparent group-hover:border-green/70 transition-colors duration-150 pointer-events-none" />
      <span aria-hidden className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-transparent group-hover:border-green/70 transition-colors duration-150 pointer-events-none" />

      {/* Smart money badge — top right */}
      {token.hasSmartMoney && (
        <div className="absolute top-2 right-2 font-mono text-[8px] text-purple bg-purple/10 px-1.5 py-[3px] rounded-none tracking-wider font-semibold z-10">
          ◆ SMART MONEY
        </div>
      )}

      {/* Top: avatar + name */}
      <div className="flex gap-3 mb-3">
        <Avatar src={token.imageUrl} seed={token.mintAddress} initials={initials} />
        <div className="flex-1 min-w-0">
          <div className="font-sans text-sm font-semibold text-text overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">
            {token.name}
          </div>
          <div className="font-mono text-[11px] text-text-dim flex items-center gap-2">
            <span>${token.symbol}</span>
            <span>·</span>
            <span className={cn('text-[10px]', isFresh ? 'text-green' : 'text-text-muted')}>
              {age}
            </span>
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px] pt-2.5 border-t border-dashed border-border">
        <MetaCell label="Market Cap" value={formatUsd(token.marketCapUsd)} />
        <MetaCell label="Holders" value={token.holdersCount.toString()} />
        <MetaCell
          label="Buys / Sells"
          value={`${token.buys1h} / ${token.sells1h}`}
          accent={isBuyDominant ? 'up' : null}
        />
        <MetaCell
          label="Dev Hold"
          value={`${token.devHoldingPct.toFixed(1)}%`}
          accent={token.devHoldingPct > 10 ? 'down' : null}
        />
      </div>

      {/* Bonding curve mini bar — only show if > 30% */}
      {token.bondingCurveProgress >= 0.3 && (
        <div className="relative h-[3px] bg-border rounded-sm overflow-hidden mt-2">
          <div
            className="h-full transition-[width] duration-500"
            style={{
              width: `${token.bondingCurveProgress * 100}%`,
              background: '#00ff66',
              boxShadow: '0 0 8px #00ff66',
            }}
          />
          <span className="absolute -top-4 right-0 font-mono text-[9px] text-text-muted">
            CURVE {Math.round(token.bondingCurveProgress * 100)}%
          </span>
        </div>
      )}

      {/* Bottom: badges + risk */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex gap-1 flex-wrap">
          <span className={cn('badge', getCategoryBadgeClass(category))}>{category}</span>
          {token.subcategory && token.subcategory !== category && (
            <span className={cn('badge', getCategoryBadgeClass(category))}>
              {token.subcategory}
            </span>
          )}
          {trustedCreator && (
            <span className="badge text-amber border-amber/40 bg-amber/10" title="creator on your trusted list">
              ★ trusted
            </span>
          )}
        </div>
        <RiskIndicator level={token.riskLevel} />
      </div>
    </Link>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function Avatar({
  src,
  seed,
  initials,
}: {
  src: string | null | undefined;
  seed: string;
  initials: string;
}): JSX.Element {
  const [errored, setErrored] = useState(false);
  if (src && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={initials}
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-12 h-12 rounded-md flex-shrink-0 object-cover border border-border bg-bg-elev-2 ring-1 ring-green/10 ring-offset-1 ring-offset-bg-elev"
      />
    );
  }
  return (
    <div
      className="w-12 h-12 rounded-md flex-shrink-0 flex items-center justify-center font-mono text-base font-bold text-black border border-border"
      style={{ background: getAvatarGradient(seed) }}
    >
      {initials}
    </div>
  );
}

interface MetaCellProps {
  label: string;
  value: string;
  accent?: 'up' | 'down' | null;
}

function MetaCell({ label, value, accent = null }: MetaCellProps): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] text-text-muted uppercase tracking-wider">
        {label}
      </span>
      <span
        className={cn(
          'font-semibold',
          accent === 'up' && 'text-green',
          accent === 'down' && 'text-red',
          !accent && 'text-text',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RiskIndicator({ level }: { level: RiskLevel }): JSX.Element {
  const config = {
    low: { label: 'LOW', color: 'text-green', filled: 2 },
    medium: { label: 'MED', color: 'text-amber', filled: 3 },
    high: { label: 'HIGH', color: 'text-red', filled: 5 },
  } as const;

  const { label, color, filled } = config[level];
  const filledColor = level === 'low' ? '#00ff66' : level === 'medium' ? '#ffb000' : '#ff4d4d';

  return (
    <div className="font-mono text-[10px] inline-flex items-center gap-1">
      <span className={color}>{label}</span>
      <div className="flex gap-px">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="w-[3px] h-2"
            style={{
              background: i < filled ? filledColor : '#16271c',
            }}
          />
        ))}
      </div>
    </div>
  );
}
