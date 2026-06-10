'use client';

import { useEffect, useState } from 'react';
import { backendHttpBase } from '@/lib/backend';
import type { Token, TokenCategory } from '@/types';

export interface GraduatingEvent {
  mint: string;
  symbol: string;
  name: string;
  category: TokenCategory;
  imageUrl: string | null;
  creatorWallet: string;
  createdAt: string;
  t: number;
  peakCurve: number;
  marketCapUsd: number;
}

interface State {
  events: GraduatingEvent[];
  windowMs: number;
  sinceWorkerStart: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetch the worker's near-graduation event log (persisted, survives restarts).
 * `window` accepts "1h", "24h", "7d" etc. Poll every 15s.
 */
export function useGraduating(windowLabel: string = '24h', refreshMs = 15_000): State {
  const [state, setState] = useState<State>({
    events: [],
    windowMs: 0,
    sinceWorkerStart: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const base = backendHttpBase();
    if (!base) {
      setState({ events: [], windowMs: 0, sinceWorkerStart: null, loading: false, error: null });
      return;
    }
    let cancelled = false;

    const fetchOnce = async (): Promise<void> => {
      try {
        const res = await fetch(`${base}/api/graduating?window=${windowLabel}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setState({
          events: Array.isArray(data.events) ? data.events : [],
          windowMs: data.windowMs ?? 0,
          sinceWorkerStart: data.sinceWorkerStart ?? null,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'fetch failed',
        }));
      }
    };

    fetchOnce();
    const id = setInterval(fetchOnce, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [windowLabel, refreshMs]);

  return state;
}

/** Convert a GraduatingEvent into a Token shape so it can feed <TokenCard />. */
export function graduatingEventToToken(e: GraduatingEvent): Token {
  return {
    mintAddress: e.mint,
    name: e.name,
    symbol: e.symbol,
    imageUrl: e.imageUrl,
    creatorWallet: e.creatorWallet,
    createdAt: e.createdAt,
    graduatedAt: null,
    isComplete: e.peakCurve >= 1,
    category: e.category,
    keywords: [],
    riskScore: 50,
    riskLevel: 'medium',
    marketCapUsd: e.marketCapUsd,
    priceSol: 0,
    holdersCount: 0,
    bondingCurveProgress: e.peakCurve,
    volume24hUsd: 0,
    devHoldingPct: 0,
    buys1h: 0,
    sells1h: 0,
    hasSmartMoney: false,
    isFresh: false,
  };
}
