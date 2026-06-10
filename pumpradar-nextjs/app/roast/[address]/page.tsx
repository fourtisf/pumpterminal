'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { Sparkline } from '@/components/Sparkline';
import { HoldingsTable } from '@/components/wallet/HoldingsTable';
import { useWalletSnapshot } from '@/hooks/use-wallet-snapshot';
import { activityBuckets } from '@/lib/solana';
import { roastWallet } from '@/lib/roast';
import { SOCIAL } from '@/lib/social';
import { shortenAddress } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';

export default function RoastResultPage({ params }: { params: { address: string } }): JSX.Element {
  const address = decodeURIComponent(params.address);
  const { data, loading, error, lastUpdated, refreshing } = useWalletSnapshot(address);
  const roast = useMemo(() => (data ? roastWallet(data) : null), [data]);
  const buckets = useMemo(() => (data ? activityBuckets(data.timestamps, 24) : []), [data]);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const onCopy = (): void => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };
  const tweetHref = roast
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `My wallet got tier ${roast.tier} on ${SOCIAL.x.handle} — ${roast.archetype} ${roast.archetypeEmoji}, degen index ${roast.degenScore}/100. ${shareUrl}`,
      )}`
    : '#';

  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
        <Link href="/roast" className="font-mono text-[11px] text-text-dim hover:text-green">
          ← Roast another wallet
        </Link>

        <div
          className="mt-4 border rounded-lg p-5 sm:p-6 relative overflow-hidden"
          style={{
            borderColor: roast ? `${roast.tierColor}55` : 'rgba(255,61,90,0.3)',
            background: roast
              ? `radial-gradient(ellipse at top right, ${roast.tierColor}1a, transparent 60%), linear-gradient(135deg, rgba(255,61,90,0.06), rgba(255,181,71,0.03))`
              : 'linear-gradient(135deg, rgba(255,61,90,0.10), rgba(255,181,71,0.05))',
          }}
        >
          <div aria-hidden className="absolute -top-4 -right-2 text-[80px] opacity-10 rotate-12">🔥</div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="font-mono text-[11px] text-text-dim">Wallet</div>
              <div className="font-mono text-base sm:text-lg text-text break-all">{shortenAddress(address, 8)}</div>
            </div>
            <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider">
              {refreshing ? 'refreshing…' : lastUpdated ? `live · ${new Date(lastUpdated).toLocaleTimeString()}` : ''}
            </span>
          </div>

          {loading && !data && <p className="font-mono text-[12px] text-text-dim mt-4">Pulling on-chain receipts…</p>}
          {error && <p className="font-mono text-[12px] text-amber mt-4 leading-relaxed">{error}</p>}

          {data && roast && (
            <>
              {/* Tier + Archetype headline */}
              <div className="mt-6 grid grid-cols-[auto_1fr] gap-4 sm:gap-6 items-center">
                <div
                  className="flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-lg border-2 font-display text-5xl sm:text-6xl font-bold leading-none"
                  style={{
                    borderColor: roast.tierColor,
                    color: roast.tierColor,
                    background: `${roast.tierColor}10`,
                    textShadow: `0 0 24px ${roast.tierColor}66`,
                  }}
                >
                  {roast.tier}
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.25em] mb-1">
                    Tier · {roast.archetype}
                  </div>
                  <div className="font-display text-xl sm:text-2xl text-text leading-tight flex items-center gap-2">
                    <span>{roast.archetypeEmoji}</span>
                    <span className="truncate">{roast.archetype}</span>
                  </div>
                  <div className="font-mono text-[11px] text-text-dim mt-1 leading-relaxed">
                    {roast.archetypeLine}
                  </div>
                  <div className="font-mono text-[10px] text-text-muted mt-1">{roast.tierLabel}</div>
                </div>
              </div>

              {/* Degen score + verdict */}
              <div className="mt-5 flex items-end gap-4 flex-wrap">
                <div>
                  <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em] mb-1">
                    Degen index
                  </div>
                  <div className="font-display text-4xl sm:text-5xl text-red leading-none">
                    {roast.degenScore}
                  </div>
                </div>
                <div className="font-mono text-sm text-text font-semibold pb-1 flex-1 min-w-[200px]">
                  {roast.verdict}
                </div>
              </div>

              {/* Burns */}
              <ul className="mt-5 flex flex-col gap-2">
                {roast.burns.map((b, i) => (
                  <li key={i} className="font-mono text-[12px] text-text-dim leading-relaxed">
                    🔥 {b}
                  </li>
                ))}
              </ul>

              {/* Metric strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border rounded-md overflow-hidden mt-6">
                <Cell label="Balance" value={`${data.balanceSol.toFixed(3)} SOL`} />
                <Cell label="Holdings" value={data.holdingsTotalUsd != null && data.holdingsTotalUsd > 0 ? `$${formatCompact(data.holdingsTotalUsd)}` : '—'} hint={`${data.holdingsTokenCount ?? 0} tokens`} />
                <Cell label="PumpFun bags" value={String(roast.pumpfunCount)} hint="tracked by us" accent={roast.pumpfunCount > 0 ? 'green' : null} />
                <Cell
                  label="Last active"
                  value={data.newestTs ? formatDistanceToNowStrict(new Date(data.newestTs * 1000)) : '—'}
                  hint="ago"
                />
              </div>

              {/* Holdings table */}
              {data.holdings && data.holdings.length > 0 && (
                <div className="mt-6">
                  <HoldingsTable
                    holdings={data.holdings}
                    totalUsd={data.holdingsTotalUsd ?? 0}
                    tokenCount={data.holdingsTokenCount ?? data.holdings.length}
                    limit={8}
                  />
                </div>
              )}

              {buckets.length > 1 && (
                <div className="mt-5">
                  <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em] mb-2">
                    Activity (last {data.signatureCount}
                    {data.hasMore ? '+' : ''} txs, oldest → newest)
                  </div>
                  <div className="bg-bg/60 border border-border rounded-md p-2">
                    <Sparkline values={buckets} height={70} bars />
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <button onClick={onCopy} className="text-green border border-green/40 rounded px-3 py-1.5 hover:bg-green/10">
                  {copied ? 'Copied ✓' : 'Copy link'}
                </button>
                <a
                  href={tweetHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue border border-blue/40 rounded px-3 py-1.5 hover:bg-blue/10"
                >
                  Share on X ↗
                </a>
                <Link
                  href={`/wallet/${encodeURIComponent(address)}`}
                  className="text-text-dim hover:text-green border border-border rounded px-3 py-1.5"
                >
                  Analytics view
                </Link>
                <a
                  href={`https://solscan.io/account/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-dim hover:text-green"
                >
                  Solscan ↗
                </a>
              </div>

              <p className="font-mono text-[10px] text-text-muted mt-5 leading-relaxed">{roast.disclaimer}</p>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function Cell({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'green' | null;
}): JSX.Element {
  return (
    <div className="bg-bg-elev p-3">
      <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.15em] mb-1">{label}</div>
      <div className={`font-mono text-base font-bold leading-none ${accent === 'green' ? 'text-green' : 'text-text'}`}>
        {value}
      </div>
      {hint && <div className="font-mono text-[9px] text-text-muted mt-1">{hint}</div>}
    </div>
  );
}
