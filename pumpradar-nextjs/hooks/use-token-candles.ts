'use client';

import { useEffect, useState } from 'react';
import { backendHttpBase } from '@/lib/backend';

export interface Candle {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type CandleSource = 'pump.fun' | 'geckoterminal' | 'worker' | 'none' | null;

interface State {
  candles: Candle[];
  source: CandleSource;
  loading: boolean;
  error: string | null;
}

/**
 * Polls the worker's /api/candles for OHLC data. The worker proxies pump.fun's
 * candlestick endpoint and falls back to bucketed worker history.
 */
export function useTokenCandles(mint: string, tfMin = 1, refreshMs = 4000): State {
  const [state, setState] = useState<State>({
    candles: [],
    source: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!mint) {
      setState({ candles: [], source: null, loading: false, error: null });
      return;
    }
    const base = backendHttpBase();
    if (!base) {
      setState({
        candles: [],
        source: null,
        loading: false,
        error: 'Backend not configured (NEXT_PUBLIC_WS_URL).',
      });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: s.candles.length === 0, error: null }));

    const fetchOnce = async (): Promise<void> => {
      try {
        const res = await fetch(
          `${base}/api/candles/${encodeURIComponent(mint)}?tf=${tfMin}`,
          { cache: 'no-store' },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { candles?: Candle[]; source?: CandleSource };
        if (cancelled) return;
        setState({
          candles: Array.isArray(data.candles) ? data.candles : [],
          source: data.source ?? null,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          candles: s.candles,
          source: s.source,
          loading: false,
          error: err instanceof Error ? err.message : 'fetch failed',
        }));
      }
    };

    fetchOnce();
    const id = setInterval(fetchOnce, Math.max(1500, refreshMs));
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mint, tfMin, refreshMs]);

  return state;
}
