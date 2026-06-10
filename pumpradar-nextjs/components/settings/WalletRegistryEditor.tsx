'use client';

import { useEffect, useState } from 'react';
import { backendHttpBase } from '@/lib/backend';
import { isLikelyAddress } from '@/lib/solana';
import { shortenAddress } from '@/lib/utils';

interface RegistryEntry {
  name: string | null;
  twitter: string | null;
  avatar: string | null;
}

interface RegistryState {
  wallets: Record<string, RegistryEntry>;
  count: number;
}

export function WalletRegistryEditor(): JSX.Element {
  const [registry, setRegistry] = useState<RegistryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [addr, setAddr] = useState('');
  const [name, setName] = useState('');
  const [twitter, setTwitter] = useState('');
  const [avatar, setAvatar] = useState('');

  const base = backendHttpBase();
  const ready = Boolean(base);

  const load = async (): Promise<void> => {
    if (!base) return;
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/known-wallets`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as RegistryState;
      setRegistry(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async (): Promise<void> => {
    if (!base) return;
    if (!isLikelyAddress(addr)) {
      setError('invalid Solana address');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/known-wallets`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-registry-token': token,
        },
        body: JSON.stringify({
          address: addr.trim(),
          name: name.trim() || null,
          twitter: twitter.trim().replace(/^@/, '') || null,
          avatar: avatar.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setAddr('');
      setName('');
      setTwitter('');
      setAvatar('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'save failed');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (target: string): Promise<void> => {
    if (!base) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/known-wallets/${encodeURIComponent(target)}`, {
        method: 'DELETE',
        headers: { 'x-registry-token': token },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <p className="font-mono text-[11px] text-text-muted">
        Backend not configured — set NEXT_PUBLIC_WS_URL to enable the registry editor.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="font-mono text-[10px] text-text-muted uppercase tracking-[0.15em]">
          Registry token{' '}
          <span className="text-text-muted/60 normal-case tracking-normal">
            (required if REGISTRY_TOKEN env is set on the worker)
          </span>
        </label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          type="password"
          placeholder="leave blank if no token configured"
          className="bg-bg border border-border rounded px-3 py-2 font-mono text-[12px] text-text focus:outline-none focus:border-green"
        />
      </div>

      <div className="bg-bg border border-border rounded p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="Wallet address (base58)"
          className="sm:col-span-2 bg-bg-elev border border-border rounded px-3 py-2 font-mono text-[12px] text-text focus:outline-none focus:border-green"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Display name (e.g. Ansem)"
          className="bg-bg-elev border border-border rounded px-3 py-2 font-mono text-[12px] text-text focus:outline-none focus:border-green"
        />
        <input
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
          placeholder="X handle (without @)"
          className="bg-bg-elev border border-border rounded px-3 py-2 font-mono text-[12px] text-text focus:outline-none focus:border-green"
        />
        <input
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="Avatar URL (https://...)"
          className="sm:col-span-2 bg-bg-elev border border-border rounded px-3 py-2 font-mono text-[12px] text-text focus:outline-none focus:border-green"
        />
        <button
          onClick={onSave}
          disabled={busy || !addr}
          className="sm:col-span-2 bg-green text-black font-mono text-[11px] font-bold uppercase tracking-wider rounded px-3 py-2 hover:bg-green-dim disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : 'Add / Update wallet'}
        </button>
      </div>

      {error && (
        <p className="font-mono text-[11px] text-red leading-relaxed">{error}</p>
      )}

      <div>
        <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.15em] mb-2">
          {loading
            ? 'Loading registry…'
            : `${registry?.count ?? 0} wallet${(registry?.count ?? 0) === 1 ? '' : 's'} registered`}
        </div>
        {registry && Object.keys(registry.wallets).length === 0 && (
          <p className="font-mono text-[11px] text-text-muted">
            No wallets yet. Add famous traders above (e.g. paste address from GMGN leaderboard, add the
            name + X handle + avatar URL — copy avatar from their X profile via right-click).
          </p>
        )}
        {registry && Object.entries(registry.wallets).length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {Object.entries(registry.wallets).map(([address, entry]) => (
              <li
                key={address}
                className="flex items-center gap-3 bg-bg border border-border rounded px-3 py-2"
              >
                {entry.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.avatar}
                    alt={entry.name ?? address}
                    className="w-8 h-8 rounded-sm object-cover border border-border flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-sm bg-bg-elev border border-border flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[12px] text-text font-semibold truncate">
                    {entry.name ?? shortenAddress(address, 6)}
                  </div>
                  <div className="font-mono text-[10px] text-text-dim truncate">
                    {entry.twitter ? `@${entry.twitter} · ` : ''}
                    {shortenAddress(address, 6)}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(address)}
                  disabled={busy}
                  className="text-text-muted hover:text-red font-mono text-[14px] disabled:opacity-50"
                  aria-label="remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
