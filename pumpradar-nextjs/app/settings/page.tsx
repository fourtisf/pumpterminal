'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { WalletRegistryEditor } from '@/components/settings/WalletRegistryEditor';
import { useProStore } from '@/lib/pro-store';
import { isLikelyAddress } from '@/lib/solana';
import { shortenAddress } from '@/lib/utils';
import type { TokenCategory } from '@/types';

const CATEGORIES: TokenCategory[] = [
  'AI',
  'Meme',
  'Animal',
  'Political',
  'Celebrity',
  'Tech',
  'Utility',
  'Religious',
  'Food',
  'Sports',
  'Other',
];

export default function SettingsPage(): JSX.Element {
  const isPro = useProStore((s) => s.isPro);
  const notifyEnabled = useProStore((s) => s.notifyEnabled);
  const setNotifyEnabled = useProStore((s) => s.setNotifyEnabled);
  const overrides = useProStore((s) => s.overrides);
  const addOverride = useProStore((s) => s.addOverride);
  const removeOverride = useProStore((s) => s.removeOverride);
  const trustedCreators = useProStore((s) => s.trustedCreators);
  const addTrustedCreator = useProStore((s) => s.addTrustedCreator);
  const removeTrustedCreator = useProStore((s) => s.removeTrustedCreator);

  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [kw, setKw] = useState('');
  const [kwCat, setKwCat] = useState<TokenCategory>('AI');
  const [creator, setCreator] = useState('');
  const creatorValid = isLikelyAddress(creator);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      if ('Notification' in window) setPermission(Notification.permission);
      else setPermission('unsupported');
    }
  }, []);

  const requestPermission = async (): Promise<void> => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === 'granted') setNotifyEnabled(true);
  };

  if (mounted && !isPro) {
    return (
      <>
        <Topbar />
        <TickerTape />
        <main className="max-w-md mx-auto px-5 py-20 text-center">
          <div className="text-3xl mb-3">⚙️</div>
          <h1 className="font-sans text-2xl font-semibold text-text mb-2">Settings</h1>
          <p className="font-mono text-[11px] text-text-dim leading-relaxed mb-6">
            Browser alerts, custom narrative rules, trusted-creator tags — all Pro-only.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-amber text-black px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider rounded hover:brightness-110"
          >
            Unlock with Pro →
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="font-sans text-3xl font-semibold tracking-tight mb-1">
          Pro <span className="text-green">Settings</span>
        </h1>
        <p className="font-mono text-[11px] text-text-dim mb-8">
          Everything is stored locally (zustand persist). Wire to a real account when billing lands.
        </p>

        {/* Notifications */}
        <Section title="Browser alerts" subtitle="fires when a watched token crosses 80% bonding curve">
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[11px] text-text-dim">
              permission: <span className="text-text">{permission}</span>
              {permission === 'granted' && (
                <>
                  {' '}· enabled:{' '}
                  <span className={notifyEnabled ? 'text-green' : 'text-amber'}>
                    {notifyEnabled ? 'yes' : 'no'}
                  </span>
                </>
              )}
            </div>
            {permission === 'granted' ? (
              <button
                onClick={() => setNotifyEnabled(!notifyEnabled)}
                className={
                  notifyEnabled
                    ? 'border border-border text-text-dim px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider rounded hover:text-text'
                    : 'bg-green text-black px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider rounded hover:bg-green-dim'
                }
              >
                {notifyEnabled ? 'Mute' : 'Enable'}
              </button>
            ) : permission === 'unsupported' ? (
              <span className="font-mono text-[10px] text-amber">browser doesn’t support notifications</span>
            ) : (
              <button
                onClick={requestPermission}
                className="bg-green text-black px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider rounded hover:bg-green-dim"
              >
                Allow
              </button>
            )}
          </div>
        </Section>

        {/* Keyword overrides */}
        <Section
          title="Custom narrative rules"
          subtitle="if a token’s name or symbol contains the keyword, force its category"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!kw.trim()) return;
              addOverride({ keyword: kw, category: kwCat });
              setKw('');
            }}
            className="flex gap-2 flex-wrap mb-4"
          >
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="keyword (e.g. cat)"
              className="flex-1 min-w-[120px] bg-bg border border-border text-text px-3 py-2 font-mono text-[11px] rounded outline-none focus:border-green"
            />
            <select
              value={kwCat}
              onChange={(e) => setKwCat(e.target.value as TokenCategory)}
              className="bg-bg border border-border text-text px-3 py-2 font-mono text-[11px] rounded outline-none focus:border-green"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-green text-black px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider rounded hover:bg-green-dim"
            >
              Add
            </button>
          </form>
          {overrides.length === 0 ? (
            <p className="font-mono text-[11px] text-text-muted">No rules yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {overrides.map((o, i) => (
                <li
                  key={`${o.keyword}-${i}`}
                  className="flex items-center justify-between font-mono text-[11px] bg-bg border border-border rounded px-3 py-2"
                >
                  <span>
                    <span className="text-text-dim">&ldquo;{o.keyword}&rdquo;</span>{' '}
                    <span className="text-text-muted">→</span>{' '}
                    <span className="text-green">{o.category}</span>
                  </span>
                  <button
                    onClick={() => removeOverride(i)}
                    className="text-text-muted hover:text-red text-[14px] leading-none"
                    aria-label="remove rule"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Trusted creators */}
        <Section
          title="Trusted creators"
          subtitle="tokens launched by these wallets get a ★ trusted badge"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!creatorValid) return;
              addTrustedCreator(creator);
              setCreator('');
            }}
            className="flex gap-2 mb-4"
          >
            <input
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="wallet address…"
              className="flex-1 bg-bg border border-border text-text px-3 py-2 font-mono text-[11px] rounded outline-none focus:border-green"
            />
            <button
              type="submit"
              disabled={!creatorValid}
              className="bg-green text-black px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-dim"
            >
              Add
            </button>
          </form>
          {trustedCreators.length === 0 ? (
            <p className="font-mono text-[11px] text-text-muted">No trusted creators yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {trustedCreators.map((addr) => (
                <li
                  key={addr}
                  className="flex items-center justify-between font-mono text-[11px] bg-bg border border-border rounded px-3 py-2"
                >
                  <span className="text-text" title={addr}>
                    {shortenAddress(addr, 6)}
                  </span>
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://solscan.io/account/${addr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green hover:underline"
                    >
                      solscan ↗
                    </a>
                    <button
                      onClick={() => removeTrustedCreator(addr)}
                      className="text-text-muted hover:text-red text-[14px] leading-none"
                      aria-label="remove creator"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Wallet identity registry"
          subtitle="Manually pin names, X handles, and avatar URLs to wallet addresses. Shows up as the profile card on /wallet/<address>. Set REGISTRY_TOKEN on the worker to gate writes."
        >
          <WalletRegistryEditor />
        </Section>

        <Link href="/live" className="font-mono text-[11px] text-green hover:underline">
          ← back to the feed
        </Link>
      </main>
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="mb-8 bg-bg-elev border border-border rounded-lg p-5">
      <h2 className="font-sans text-base font-semibold text-text leading-tight mb-1">{title}</h2>
      <p className="font-mono text-[10px] text-text-muted mb-4">{subtitle}</p>
      {children}
    </section>
  );
}
