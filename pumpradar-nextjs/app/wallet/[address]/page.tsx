'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { Sparkline } from '@/components/Sparkline';
import { HoldingsTable } from '@/components/wallet/HoldingsTable';
import { useWalletSnapshot } from '@/hooks/use-wallet-snapshot';
import { useTickerPrices } from '@/hooks/use-ticker-prices';
import { activityBuckets, type WalletSnapshot } from '@/lib/solana';
import { cn, formatUsd, getAvatarGradient, shortenAddress } from '@/lib/utils';
import { format, formatDistanceToNowStrict } from 'date-fns';

interface WalletClassInfo {
  klass: 'Whale' | 'Active Trader' | 'Casual' | 'Dormant' | 'Fresh';
  klassColor: string;
  klassNote: string;
  txInWindow: number;
  activeDays: number;
  spanDays: number;
  busiestCount: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeColor: string;
}

function profileOf(s: WalletSnapshot): WalletClassInfo {
  const span = s.oldestTs && s.newestTs ? Math.max(1, (s.newestTs - s.oldestTs) / 86400) : 1;
  const days = new Map<string, number>();
  for (const ts of s.timestamps) {
    const k = new Date(ts * 1000).toISOString().slice(0, 10);
    days.set(k, (days.get(k) ?? 0) + 1);
  }
  const activeDays = days.size;
  const busiestCount = days.size ? Math.max(...days.values()) : 0;
  const idleDays = s.newestTs ? (Date.now() / 1000 - s.newestTs) / 86400 : Infinity;
  const txInWindow = s.signatureCount;

  let klass: WalletClassInfo['klass'] = 'Casual';
  let klassColor = '#7ab8ff';
  let klassNote = 'Periodic on-chain activity.';
  if (idleDays > 30) {
    klass = 'Dormant';
    klassColor = '#8a93a0';
    klassNote = `Idle for ${Math.round(idleDays)} days. Probably abandoned or HODL-mode.`;
  } else if (s.signatureCount < 10) {
    klass = 'Fresh';
    klassColor = '#00ff88';
    klassNote = 'New wallet — too little history to judge.';
  } else if (s.balanceSol >= 50 && txInWindow / span < 5) {
    klass = 'Whale';
    klassColor = '#ffb547';
    klassNote = 'Sizeable balance, low churn. Looks like a serious holder.';
  } else if (txInWindow / span >= 10) {
    klass = 'Active Trader';
    klassColor = '#a3ff9c';
    klassNote = `~${(txInWindow / span).toFixed(0)} tx/day in this window. High-velocity wallet.`;
  }

  const consistency = activeDays / Math.max(1, Math.ceil(span));
  let grade: WalletClassInfo['grade'] = 'F';
  let gradeColor = '#ff3d5a';
  if (consistency >= 0.8) { grade = 'A'; gradeColor = '#00ff88'; }
  else if (consistency >= 0.6) { grade = 'B'; gradeColor = '#a3ff9c'; }
  else if (consistency >= 0.4) { grade = 'C'; gradeColor = '#ffb547'; }
  else if (consistency >= 0.2) { grade = 'D'; gradeColor = '#ff8a47'; }

  return { klass, klassColor, klassNote, txInWindow, activeDays, spanDays: span, busiestCount, grade, gradeColor };
}

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function WalletDetailPage({ params }: { params: { address: string } }): JSX.Element {
  const address = decodeURIComponent(params.address);
  const { data, loading, error, lastUpdated, refreshing } = useWalletSnapshot(address);
  const { solPrice } = useTickerPrices();
  const buckets = useMemo(() => (data ? activityBuckets(data.timestamps, 32) : []), [data]);
  const profile = useMemo(() => (data ? profileOf(data) : null), [data]);

  const solUsd = solPrice ?? 91; // fallback if ticker not loaded yet
  const balanceUsd = data ? data.balanceSol * solUsd : 0;
  const holdingsUsd = data?.holdingsTotalUsd ?? 0;
  const totalPortfolioUsd = balanceUsd + holdingsUsd;
  const pumpfunBags = data?.holdings?.filter((h) => h.pumpfunTracked).length ?? 0;
  const ident = data?.profile ?? null;
  const displayName = ident?.name ?? data?.solDomain ?? shortenAddress(address, 6);
  const profileAvatar = ident?.avatar ?? null;
  const profileTwitter = ident?.twitter ?? null;
  const profileBadge =
    ident?.source === 'curated'
      ? { label: 'VERIFIED', color: '#ffb547' }
      : ident?.source === 'community'
        ? { label: 'COMMUNITY', color: '#a855f7' }
        : ident?.source === 'entity'
          ? { label: (ident.entity ?? 'ENTITY').toUpperCase(), color: '#7ab8ff' }
          : ident?.source === 'dev-inferred'
            ? { label: 'AUTO DEV', color: '#a3ff9c' }
            : ident?.source === 'gmgn'
              ? { label: 'GMGN', color: '#a3ff9c' }
              : ident?.source === 'sns'
                ? { label: 'SNS', color: '#00ff88' }
                : ident?.source === 'sns-name'
                  ? { label: 'SNS', color: '#7ab8ff' }
                  : null;
  const autoTags = ident?.tags ?? [];

  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
        <Link href="/wallet" className="font-mono text-[11px] text-text-dim hover:text-green">
          ← Look up another wallet
        </Link>

        {loading && !data && (
          <p className="font-mono text-[12px] text-text-dim mt-6">Querying the chain…</p>
        )}
        {error && (
          <p className="font-mono text-[12px] text-amber mt-6 leading-relaxed">{error}</p>
        )}

        {data && profile && (
          <>
            {/* GMGN-style profile card */}
            <div className="mt-4 bg-bg-elev border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-4 sm:gap-5 p-5 sm:p-6 relative">
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none opacity-30"
                  style={{
                    background: `radial-gradient(ellipse at 0% 0%, ${profile.klassColor}25, transparent 60%)`,
                  }}
                />
                {profileAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileAvatar}
                    alt={displayName}
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-md border-2 object-cover flex-shrink-0"
                    style={{ borderColor: profile.klassColor }}
                  />
                ) : (
                  <div
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-md border-2 flex items-center justify-center font-mono text-base font-bold text-black flex-shrink-0"
                    style={{
                      background: getAvatarGradient(address),
                      borderColor: profile.klassColor,
                    }}
                  >
                    {(displayName ?? address).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 relative">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans text-lg sm:text-xl font-semibold text-text truncate">
                      {displayName}
                    </span>
                    {profileBadge && (
                      <span
                        className="font-mono text-[9px] px-1.5 py-px rounded-sm uppercase tracking-wider"
                        style={{
                          color: profileBadge.color,
                          background: `${profileBadge.color}15`,
                          border: `1px solid ${profileBadge.color}55`,
                        }}
                      >
                        {profileBadge.label}
                      </span>
                    )}
                    <span
                      className="font-mono text-[9px] px-1.5 py-px rounded-sm uppercase tracking-wider"
                      style={{
                        color: profile.klassColor,
                        background: `${profile.klassColor}15`,
                        border: `1px solid ${profile.klassColor}55`,
                      }}
                    >
                      {profile.klass}
                    </span>
                    {profileTwitter && (
                      <a
                        href={`https://twitter.com/${profileTwitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] text-blue hover:underline"
                        title={`@${profileTwitter} on X`}
                      >
                        @{profileTwitter}
                      </a>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-text-dim mt-1 break-all">
                    {address}
                  </div>
                  {autoTags.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {autoTags.map((t) => (
                        <span
                          key={t.label}
                          title={t.desc}
                          className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                          style={{
                            color: t.color,
                            background: `${t.color}15`,
                            border: `1px solid ${t.color}55`,
                          }}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-text-muted mt-1 flex items-center gap-2 flex-wrap">
                    <span className="status-dot" />
                    {refreshing ? 'refreshing…' : lastUpdated ? `live · ${new Date(lastUpdated).toLocaleTimeString()}` : 'idle'}
                    <span>·</span>
                    <span>
                      Last active{' '}
                      {data.newestTs
                        ? formatDistanceToNowStrict(new Date(data.newestTs * 1000)) + ' ago'
                        : '—'}
                    </span>
                  </div>
                  {/* Quick action links */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
                    {data.solDomain && (
                      <a
                        href={`https://www.sns.id/domain?domain=${data.solDomain.replace(/\.sol$/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green hover:underline"
                      >
                        SNS ↗
                      </a>
                    )}
                    <a
                      href={
                        profileTwitter
                          ? `https://twitter.com/${profileTwitter}`
                          : `https://twitter.com/search?q=${encodeURIComponent(data.solDomain ?? address)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue hover:underline"
                      title={profileTwitter ? `@${profileTwitter} on X` : 'Search this wallet on X'}
                    >
                      {profileTwitter ? `X: @${profileTwitter} ↗` : 'Find on X ↗'}
                    </a>
                    <a
                      href={`https://solscan.io/account/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-dim hover:text-green"
                    >
                      Solscan ↗
                    </a>
                    <a
                      href={`https://gmgn.ai/sol/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-dim hover:text-green"
                    >
                      GMGN ↗
                    </a>
                    <Link
                      href={`/roast/${encodeURIComponent(address)}`}
                      className="ml-auto text-red/80 hover:text-red border border-red/30 rounded px-2 py-0.5"
                    >
                      🔥 Roast
                    </Link>
                  </div>
                </div>
              </div>

              {/* Hero stats: total portfolio + headline metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-t border-border">
                <HeroCell
                  label="Total portfolio"
                  value={formatCompact(totalPortfolioUsd)}
                  hint={`${data.balanceSol.toFixed(2)} SOL + tokens`}
                  highlight
                />
                <HeroCell
                  label="SOL balance"
                  value={`${data.balanceSol.toFixed(3)}`}
                  hint={`~${formatCompact(balanceUsd)}`}
                />
                <HeroCell
                  label="Holdings"
                  value={formatCompact(holdingsUsd)}
                  hint={`${data.holdingsTokenCount ?? 0} tokens`}
                />
                <HeroCell
                  label="PumpFun bags"
                  value={String(pumpfunBags)}
                  hint="tracked by us"
                  accent={pumpfunBags > 0 ? '#00ff88' : undefined}
                />
              </div>
            </div>

            {/* Class narrative */}
            <div className="mt-4 bg-bg-elev border border-border rounded-md p-4 font-mono text-[12px] text-text-dim leading-relaxed">
              <span className="text-text-muted uppercase text-[9px] tracking-[0.25em] block mb-1">
                Analysis
              </span>
              {profile.klassNote}{' '}
              <span className="text-text-muted">
                Consistency grade <span style={{ color: profile.gradeColor }}>{profile.grade}</span> from{' '}
                {profile.activeDays}/{Math.max(1, Math.ceil(profile.spanDays))} active day
                {profile.spanDays > 1 ? 's' : ''} in window.
              </span>
            </div>

            {/* Activity metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border rounded-md overflow-hidden mt-4">
              <Cell
                label="Tx in window"
                value={`${profile.txInWindow}${data.hasMore ? '+' : ''}`}
                hint={`last ${data.windowSize} sigs`}
              />
              <Cell
                label="Window span"
                value={profile.spanDays >= 1 ? `${Math.round(profile.spanDays)}d` : '<1d'}
                hint="oldest → newest"
              />
              <Cell
                label="Busiest day"
                value={profile.busiestCount.toString()}
                hint="txs"
              />
              <Cell
                label="Window start"
                value={data.oldestTs ? format(new Date(data.oldestTs * 1000), 'MMM d') : '—'}
                hint={data.oldestTs ? format(new Date(data.oldestTs * 1000), 'HH:mm') : undefined}
              />
            </div>

            {/* Holdings */}
            {data.holdings && (
              <div className="mt-6">
                <HoldingsTable
                  holdings={data.holdings}
                  totalUsd={data.holdingsTotalUsd ?? 0}
                  tokenCount={data.holdingsTokenCount ?? data.holdings.length}
                  limit={10}
                />
              </div>
            )}

            {/* Activity chart */}
            {buckets.length > 1 ? (
              <div className="mt-6">
                <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em] mb-2">
                  Tx activity (oldest → newest)
                </div>
                <div className="bg-bg border border-border rounded-md p-3">
                  <Sparkline values={buckets} height={110} bars />
                </div>
              </div>
            ) : (
              <p className="font-mono text-[11px] text-text-muted mt-5">
                Not enough recent transactions to chart.
              </p>
            )}

            <p className="font-mono text-[10px] text-text-muted mt-6 leading-relaxed">
              Snapshot from balance + {data.signatureCount}
              {data.hasMore ? '+' : ''} most-recent signatures via public RPC,
              SPL holdings priced via DexScreener / Jupiter / pump.fun, .sol
              domain via Bonfida. Realized P&amp;L and per-token win rate need the
              full indexer — not built yet.
            </p>
          </>
        )}
      </main>
    </>
  );
}

function HeroCell({
  label,
  value,
  hint,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  accent?: string;
}): JSX.Element {
  return (
    <div className={cn('p-4', highlight ? 'bg-green/[0.04]' : 'bg-bg-elev')}>
      <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.15em] mb-1.5">
        {label}
      </div>
      <div
        className="font-mono text-xl sm:text-2xl font-bold leading-none break-all"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && <div className="font-mono text-[10px] text-text-muted mt-1.5">{hint}</div>}
    </div>
  );
}

function Cell({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div className="bg-bg-elev p-3">
      <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.15em] mb-1">{label}</div>
      <div className="font-mono text-base font-bold text-text leading-none break-all">{value}</div>
      {hint && <div className="font-mono text-[9px] text-text-muted mt-1">{hint}</div>}
    </div>
  );
}
