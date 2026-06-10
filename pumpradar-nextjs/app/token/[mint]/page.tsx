'use client';

import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { LiveTokenChart } from '@/components/LiveTokenChart';
import { useTokenDetail } from '@/hooks/use-token-detail';
import { useTokenInfo } from '@/hooks/use-token-info';
import {
  cn,
  formatAge,
  formatUsd,
  getAvatarGradient,
  getCategoryBadgeClass,
  shortenAddress,
} from '@/lib/utils';
import type { RiskLevel } from '@/types';

export default function TokenDetailPage({ params }: { params: { mint: string } }): JSX.Element {
  const mint = decodeURIComponent(params.mint);
  const { token, history, live, loading } = useTokenDetail(mint);
  // Fallback: any mint not in the worker's live window still gets a chart and
  // metadata via DexScreener + pump.fun metadata proxied through the worker.
  const { info, loading: infoLoading } = useTokenInfo(mint, !token && !loading);

  return (
    <>
      <Topbar />
      <TickerTape />

      <main className="max-w-3xl mx-auto px-5 py-8">
        <Link href="/live" className="font-mono text-[11px] text-text-dim hover:text-green">
          ← Back to Live Feed
        </Link>

        {token ? (
          <div className="mt-5 bg-bg-elev border border-border rounded-lg p-6">
            <div className="flex gap-4 items-start">
              <Avatar src={token.imageUrl} seed={token.mintAddress} initials={token.symbol.slice(0, 2).toUpperCase()} />
              <div className="min-w-0">
                <h1 className="font-sans text-2xl font-semibold text-text leading-tight break-words">
                  {token.name}
                </h1>
                <div className="font-mono text-sm text-text-dim flex items-center gap-2 mt-1 flex-wrap">
                  <span>${token.symbol}</span>
                  <span>·</span>
                  <span className={token.isFresh ? 'text-green' : 'text-text-muted'}>
                    {formatAge(token.createdAt)} old
                  </span>
                  <span className={cn('badge', getCategoryBadgeClass(token.category))}>{token.category}</span>
                </div>
              </div>
              <RiskBadge level={token.riskLevel} score={token.riskScore} />
            </div>

            {/* Real-time market-cap chart, built from pump.fun trades the worker streams */}
            <div className="mt-6">
              <div className="flex items-center justify-between font-mono text-[10px] text-text-muted uppercase tracking-[0.2em] mb-2">
                <span>Market cap · live · pump.fun</span>
                <a
                  href={`https://pump.fun/${token.mintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green hover:underline normal-case tracking-normal"
                >
                  open on pump.fun ↗
                </a>
              </div>
              <LiveTokenChart mint={token.mintAddress} history={history} height={440} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border border border-border rounded-md overflow-hidden mt-6">
              <Stat label="Market Cap" value={formatUsd(token.marketCapUsd)} />
              <Stat label="Price (SOL)" value={token.priceSol > 0 ? token.priceSol.toFixed(9) : '—'} />
              <Stat label="Holders (proxy)" value={token.holdersCount.toLocaleString('en-US')} hint="unique traders" />
              <Stat label="Buys / Sells (seen)" value={`${token.buys1h} / ${token.sells1h}`} />
              <Stat label="Dev Holding" value={`${token.devHoldingPct.toFixed(1)}%`} hint="est. from initial buy" />
              <Stat label="Volume (seen)" value={formatUsd(token.volume24hUsd)} />
            </div>

            <div className="mt-6">
              <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.2em] mb-2">
                Bonding curve · {Math.round(token.bondingCurveProgress * 100)}%
              </div>
              <div className="h-2 bg-border rounded-sm overflow-hidden">
                <div
                  className="h-full transition-[width] duration-500"
                  style={{
                    width: `${token.bondingCurveProgress * 100}%`,
                    background: 'linear-gradient(90deg, #00cc6a, #00ff88)',
                    boxShadow: '0 0 8px #00ff88',
                  }}
                />
              </div>
            </div>

            <MintRow mint={token.mintAddress} />
          </div>
        ) : info ? (
          <div className="mt-5 bg-bg-elev border border-border rounded-lg p-5 sm:p-6">
            <div className="flex gap-4 items-start">
              <Avatar
                src={info.imageUrl}
                seed={info.mint}
                initials={(info.symbol ?? info.mint).slice(0, 2).toUpperCase()}
              />
              <div className="min-w-0 flex-1">
                <h1 className="font-sans text-2xl font-semibold text-text leading-tight break-words">
                  {info.name ?? 'Unknown token'}
                </h1>
                <div className="font-mono text-sm text-text-dim flex items-center gap-2 mt-1 flex-wrap">
                  {info.symbol && <span>${info.symbol}</span>}
                  {info.priceChange24h != null && (
                    <>
                      <span>·</span>
                      <span className={info.priceChange24h >= 0 ? 'text-green' : 'text-red'}>
                        {info.priceChange24h >= 0 ? '+' : ''}
                        {info.priceChange24h.toFixed(2)}% 24h
                      </span>
                    </>
                  )}
                  {info.tracked && (
                    <span className="text-[9px] text-green border border-green/40 bg-green/10 px-1.5 py-px rounded-sm uppercase tracking-wider">
                      ◆ tracked
                    </span>
                  )}
                </div>
                {info.description && (
                  <p className="font-mono text-[11px] text-text-muted mt-2 leading-relaxed line-clamp-3">
                    {info.description}
                  </p>
                )}
              </div>
            </div>

            {/* Chart — same pump.fun candle source as tracked tokens */}
            <div className="mt-6">
              <div className="flex items-center justify-between font-mono text-[10px] text-text-muted uppercase tracking-[0.2em] mb-2">
                <span>Market cap · pump.fun</span>
                <a
                  href={info.pumpfunUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green hover:underline normal-case tracking-normal"
                >
                  open on pump.fun ↗
                </a>
              </div>
              <LiveTokenChart mint={info.mint} history={[]} height={440} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border rounded-md overflow-hidden mt-6">
              <Stat label="Market Cap" value={info.marketCapUsd > 0 ? formatUsd(info.marketCapUsd) : '—'} />
              <Stat label="Price (USD)" value={info.priceUsd > 0 ? `$${formatPrice(info.priceUsd)}` : '—'} />
              <Stat label="Liquidity" value={info.liquidityUsd != null && info.liquidityUsd > 0 ? formatUsd(info.liquidityUsd) : '—'} />
              <Stat label="Volume 24h" value={info.volume24hUsd != null && info.volume24hUsd > 0 ? formatUsd(info.volume24hUsd) : '—'} />
            </div>

            {(info.twitter || info.telegram || info.website) && (
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px]">
                {info.website && (
                  <a className="text-green hover:underline" href={info.website} target="_blank" rel="noopener noreferrer">
                    Website ↗
                  </a>
                )}
                {info.twitter && (
                  <a className="text-green hover:underline" href={info.twitter} target="_blank" rel="noopener noreferrer">
                    Twitter ↗
                  </a>
                )}
                {info.telegram && (
                  <a className="text-green hover:underline" href={info.telegram} target="_blank" rel="noopener noreferrer">
                    Telegram ↗
                  </a>
                )}
              </div>
            )}

            <MintRow mint={info.mint} />
          </div>
        ) : (
          <div className="mt-5 bg-bg-elev border border-border rounded-lg p-6">
            <h1 className="font-display text-xl text-text">Token detail</h1>
            <p className="font-mono text-[11px] text-text-dim mt-2 leading-relaxed">
              {loading || infoLoading
                ? 'Looking this token up…'
                : live
                  ? "Couldn't find this token on DexScreener or pump.fun. It may be too new, delisted, or the mint is wrong."
                  : 'Running in demo mode — wire up the backend feed (NEXT_PUBLIC_WS_URL) for live token detail + chart.'}
            </p>
            <MintRow mint={mint} />
          </div>
        )}
      </main>
    </>
  );
}

function Avatar({
  src,
  seed,
  initials,
}: {
  src: string | null | undefined;
  seed: string;
  initials: string;
}): JSX.Element {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={initials}
        className="w-16 h-16 rounded-md flex-shrink-0 object-cover border border-border bg-bg-elev-2"
      />
    );
  }
  return (
    <div
      className="w-16 h-16 rounded-md flex-shrink-0 flex items-center justify-center font-mono text-xl font-bold text-black border border-border"
      style={{ background: getAvatarGradient(seed) }}
    >
      {initials}
    </div>
  );
}

function formatPrice(p: number): string {
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toPrecision(3);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div className="bg-bg-elev p-4">
      <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.15em] mb-1.5">{label}</div>
      <div className="font-mono text-lg font-bold text-text leading-none break-all">{value}</div>
      {hint && <div className="font-mono text-[9px] text-text-muted mt-1">{hint}</div>}
    </div>
  );
}

function RiskBadge({ level, score }: { level: RiskLevel; score: number }): JSX.Element {
  const color =
    level === 'low'
      ? 'text-green border-green/40'
      : level === 'medium'
        ? 'text-amber border-amber/40'
        : 'text-red border-red/40';
  return (
    <div className={cn('ml-auto font-mono text-[10px] border rounded px-2 py-1 uppercase tracking-wider whitespace-nowrap', color)}>
      {level} risk · {score}
    </div>
  );
}

function MintRow({ mint }: { mint: string }): JSX.Element {
  return (
    <div className="mt-6 pt-4 border-t border-dashed border-border font-mono text-[11px] text-text-dim flex flex-wrap items-center gap-x-4 gap-y-2">
      <span>
        Mint: <span className="text-text">{shortenAddress(mint, 6)}</span>
      </span>
      <a href={`https://pump.fun/${mint}`} target="_blank" rel="noopener noreferrer" className="text-green hover:underline">
        Open on pump.fun ↗
      </a>
      <a href={`https://solscan.io/token/${mint}`} target="_blank" rel="noopener noreferrer" className="text-green hover:underline">
        Solscan ↗
      </a>
    </div>
  );
}
