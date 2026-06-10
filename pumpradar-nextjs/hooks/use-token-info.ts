'use client';

import { useEffect, useState } from 'react';
import { backendHttpBase } from '@/lib/backend';

export interface TokenInfo {
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  description: string | null;
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  priceUsd: number;
  marketCapUsd: number;
  priceChange24h: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  pairUrl: string | null;
  pairAddress: string | null;
  dexscreenerEmbedUrl: string | null;
  pumpfunUrl: string;
  solscanUrl: string;
  tracked: boolean;
  inLaunchHistory: boolean;
}

interface State {
  info: TokenInfo | null;
  loading: boolean;
  error: string | null;
}

export function useTokenInfo(mint: string, enabled = true): State {
  const [state, setState] = useState<State>({ info: null, loading: enabled, error: null });

  useEffect(() => {
    if (!enabled) return;
    const base = backendHttpBase();
    if (!base) {
      setState({ info: null, loading: false, error: 'backend not configured' });
      return;
    }
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`${base}/api/token-info/${encodeURIComponent(mint)}`, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setState({ info: null, loading: false, error: `worker ${res.status}` });
          return;
        }
        const info = (await res.json()) as TokenInfo;
        if (!cancelled) setState({ info, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ info: null, loading: false, error: err instanceof Error ? err.message : 'fetch failed' });
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mint, enabled]);

  return state;
}
