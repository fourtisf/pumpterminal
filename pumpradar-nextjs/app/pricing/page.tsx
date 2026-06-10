'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { useProStore } from '@/lib/pro-store';
import { backendHttpBase } from '@/lib/backend';
import { cn } from '@/lib/utils';

const FREE_FEATURES: readonly string[] = [
  'Real-time pump.fun launch feed',
  'Narrative heat + category filters',
  'About-to-graduate panel + alerts',
  'Per-token chart (market cap history)',
  'Wallet lookup + degen roast',
  '100 most recent launches in memory',
];

const PRO_FEATURES: readonly { label: string; ready: boolean }[] = [
  { label: 'Personal watchlist — star tokens, jump straight to them', ready: true },
  { label: 'Browser push when a watched token crosses 80% bonding curve', ready: true },
  { label: 'CSV export of the current feed (one click)', ready: true },
  { label: 'Custom narrative rules — your own keyword → category overrides', ready: true },
  { label: 'Trusted-creator tags — your private smart-money list', ready: true },
  { label: 'Open API (REST + WS) for your own bots', ready: true },
  { label: 'Telegram alerts (deliver the same events to your channel)', ready: false },
  { label: 'Priority RPC — no rate limits on /wallet & /roast', ready: false },
  { label: 'Dedicated support channel', ready: false },
];

export default function PricingPage(): JSX.Element {
  const isPro = useProStore((s) => s.isPro);
  const enablePreview = useProStore((s) => s.enablePreview);
  const disablePreview = useProStore((s) => s.disablePreview);
  const joinWaitlist = useProStore((s) => s.joinWaitlist);
  const waitlistEmail = useProStore((s) => s.waitlistEmail);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const onWaitlist = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('That doesn’t look like an email.');
      return;
    }
    // Optimistically save locally so the UI updates even if the network's flaky
    joinWaitlist(email);
    setSubmitted(true);
    const base = backendHttpBase();
    if (!base) return;
    try {
      const res = await fetch(`${base}/api/waitlist`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source: 'pricing' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Saved locally. Server didn’t accept it (${err.message}).`
          : 'Saved locally. Server didn’t accept it.',
      );
    }
  };

  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-5xl mx-auto px-5 py-12">
        <div className="text-center mb-10">
          <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.3em] mb-2">
            pricing · v0.1 preview
          </div>
          <h1 className="font-display text-4xl tracking-tight mb-3">
            Trade the <span className="text-green">edge</span>, not the lag.
          </h1>
          <p className="font-mono text-[12px] text-text-dim max-w-xl mx-auto leading-relaxed">
            Free does the heavy lifting. Pro gives you alerts, watchlists, smart-money tags, and
            the API — built for traders who don&apos;t want to babysit the feed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Free" price="$0" subtitle="for everyone" highlight={false}>
            <FeatureList items={FREE_FEATURES.map((label) => ({ label, ready: true }))} />
            <Link
              href="/live"
              className="mt-6 block text-center bg-bg border border-border text-text px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider rounded hover:border-border-bright"
            >
              Open live feed →
            </Link>
          </Card>

          <Card title="Pro" price="$19/mo" subtitle="early-access price · $9 for first 100" highlight>
            <FeatureList items={PRO_FEATURES} />
            {isPro ? (
              <div className="mt-6 flex flex-col gap-2">
                <div className="text-center bg-green/10 border border-green/40 text-green px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider rounded">
                  ✓ Pro preview enabled
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/settings"
                    className="flex-1 text-center bg-bg border border-border-bright text-text px-4 py-2 font-mono text-[10px] uppercase tracking-wider rounded hover:border-green hover:text-green"
                  >
                    Open settings →
                  </Link>
                  <Link
                    href="/watchlist"
                    className="flex-1 text-center bg-bg border border-border-bright text-text px-4 py-2 font-mono text-[10px] uppercase tracking-wider rounded hover:border-green hover:text-green"
                  >
                    Watchlist →
                  </Link>
                </div>
                <button
                  onClick={disablePreview}
                  className="text-center font-mono text-[10px] text-text-dim hover:text-text underline"
                >
                  turn off preview
                </button>
              </div>
            ) : (
              <button
                onClick={enablePreview}
                className="mt-6 w-full text-center bg-amber text-black px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider rounded hover:brightness-110"
              >
                Try Pro preview — free
              </button>
            )}
            <p className="mt-2 font-mono text-[9px] text-text-muted text-center leading-relaxed">
              Preview unlocks the Pro UI client-side so you can kick the tyres. Real billing +
              alerts ship with the next pipeline phase.
            </p>
          </Card>
        </div>

        {/* Waitlist */}
        <div className="mt-10 max-w-md mx-auto bg-bg-elev border border-border rounded-lg p-5 text-center">
          <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em] mb-2">
            Be first when billing opens
          </div>
          {submitted || waitlistEmail ? (
            <>
              <p className="font-mono text-[11px] text-green">
                ✓ {waitlistEmail ?? email} — you&apos;re on the list.
              </p>
              {error && <p className="mt-2 font-mono text-[10px] text-amber">{error}</p>}
            </>
          ) : (
            <form onSubmit={onWaitlist} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 bg-bg border border-border text-text px-3 py-2 font-mono text-[11px] rounded outline-none focus:border-green"
              />
              <button
                type="submit"
                className="bg-green text-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider rounded hover:bg-green-dim"
              >
                Join
              </button>
            </form>
          )}
          {error && !submitted && !waitlistEmail && (
            <p className="mt-2 font-mono text-[10px] text-amber">{error}</p>
          )}
        </div>

        <div className="mt-8 text-center font-mono text-[10px] text-text-muted">
          <Link href="/live" className="text-green hover:underline">← back to the feed</Link>
        </div>
      </main>
    </>
  );
}

function Card({
  title,
  price,
  subtitle,
  highlight,
  children,
}: {
  title: string;
  price: string;
  subtitle: string;
  highlight: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div
      className={cn(
        'border rounded-lg p-6 relative overflow-hidden',
        highlight ? 'border-green/40 bg-bg-elev' : 'border-border bg-bg-elev',
      )}
    >
      {highlight && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(0,255,102,0.08) 0%, transparent 60%)',
          }}
        />
      )}
      <div className="relative">
        <div className="flex items-baseline justify-between mb-1">
          <div className="font-display text-2xl tracking-tight text-text">{title}</div>
          {highlight && (
            <span className="font-mono text-[8px] text-green uppercase tracking-wider bg-green/10 px-1.5 py-0.5 rounded-none">
              recommended
            </span>
          )}
        </div>
        <div className={cn('font-mono text-3xl font-bold', highlight ? 'text-green' : 'text-text')}>
          {price}
        </div>
        <div className="font-mono text-[10px] text-text-muted uppercase tracking-wider mt-1 mb-5">
          {subtitle}
        </div>
        {children}
      </div>
    </div>
  );
}

function FeatureList({ items }: { items: readonly { label: string; ready: boolean }[] }): JSX.Element {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-start gap-2 font-mono text-[12px]">
          <span className={cn('mt-[2px] text-[10px]', it.ready ? 'text-green' : 'text-text-muted')}>
            {it.ready ? '✓' : '○'}
          </span>
          <span className={it.ready ? 'text-text' : 'text-text-dim'}>
            {it.label}
            {!it.ready && (
              <span className="ml-1.5 text-[9px] text-amber uppercase tracking-wider">soon</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
