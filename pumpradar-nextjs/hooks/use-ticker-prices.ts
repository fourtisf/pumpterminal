'use client';

import { useEffect, useState } from 'react';
import { backendHttpBase } from '@/lib/backend';

export interface TickerItem {
  sym: string;
  value: string;
  pct: string;
  direction: 'up' | 'down';
}

interface CoinEntry {
  id: string;
  sym: string;
  /** 'price' → render $X.XX, 'mc' → render compact market cap */
  kind: 'price' | 'mc';
}

const COINS: CoinEntry[] = [
  { id: 'solana', sym: 'SOL', kind: 'price' },
  { id: 'peanut-the-squirrel', sym: '$PNUT', kind: 'mc' },
  { id: 'goatseus-maximus', sym: '$GOAT', kind: 'mc' },
  { id: 'dogwifcoin', sym: '$WIF', kind: 'mc' },
  { id: 'bonk', sym: '$BONK', kind: 'mc' },
  { id: 'popcat', sym: '$POPCAT', kind: 'mc' },
  { id: 'official-trump', sym: '$TRUMP', kind: 'mc' },
];

const FALLBACK: TickerItem[] = [
  { sym: 'SOL', value: '—', pct: '…', direction: 'up' },
  { sym: '$PNUT', value: '—', pct: '…', direction: 'up' },
  { sym: '$GOAT', value: '—', pct: '…', direction: 'up' },
  { sym: '$WIF', value: '—', pct: '…', direction: 'up' },
  { sym: '$BONK', value: '—', pct: '…', direction: 'up' },
  { sym: '$POPCAT', value: '—', pct: '…', direction: 'up' },
  { sym: '$TRUMP', value: '—', pct: '…', direction: 'up' },
];

const POLL_MS = 30_000;

function formatPrice(p: number): string {
  if (p >= 100) return `$${p.toFixed(2)}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toPrecision(3)}`;
}

function formatMc(mc: number): string {
  if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(2)}B MC`;
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M MC`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K MC`;
  return `$${mc.toFixed(0)} MC`;
}

function formatPct(p: number | undefined | null): string {
  if (p == null || !Number.isFinite(p)) return '—';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(2)}%`;
}

interface CoinGeckoResponse {
  [id: string]: {
    usd?: number;
    usd_market_cap?: number;
    usd_24h_change?: number;
  };
}

export function useTickerPrices(): { items: TickerItem[]; solPrice: number | null } {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base = backendHttpBase();
    const workerUrl = base ? `${base}/api/ticker` : null;
    const ids = COINS.map((c) => c.id).join(',');
    const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;

    const loadFromWorker = async (): Promise<boolean> => {
      if (!workerUrl) return false;
      try {
        const res = await fetch(workerUrl, { cache: 'no-store' });
        if (!res.ok) return false;
        const json = (await res.json()) as { items?: TickerItem[] };
        if (cancelled) return true;
        if (Array.isArray(json.items) && json.items.length > 0) {
          setItems(json.items);
          const solItem = json.items.find((i) => i.sym === 'SOL');
          if (solItem) {
            const n = Number(solItem.value.replace(/[^0-9.]/g, ''));
            if (Number.isFinite(n) && n > 0) setSolPrice(n);
          }
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const loadFromCoinGecko = async (): Promise<void> => {
      try {
        const res = await fetch(cgUrl, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as CoinGeckoResponse;
        if (cancelled) return;
        const next: TickerItem[] = COINS.map((c) => {
          const row = data[c.id] ?? {};
          const change = row.usd_24h_change;
          const direction: 'up' | 'down' = (change ?? 0) >= 0 ? 'up' : 'down';
          let value = '—';
          if (c.kind === 'price' && typeof row.usd === 'number') {
            value = formatPrice(row.usd);
          } else if (c.kind === 'mc' && typeof row.usd_market_cap === 'number') {
            value = formatMc(row.usd_market_cap);
          }
          return { sym: c.sym, value, pct: formatPct(change), direction };
        });
        setItems(next);
        const sol = data['solana']?.usd;
        if (typeof sol === 'number') setSolPrice(sol);
      } catch {
        // keep last good values
      }
    };

    const load = async (): Promise<void> => {
      const ok = await loadFromWorker();
      if (!ok) await loadFromCoinGecko();
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { items, solPrice };
}
