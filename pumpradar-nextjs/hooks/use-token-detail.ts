'use client';

import { useEffect, useState } from 'react';
import type { Token } from '@/types';

export interface HistoryPoint {
  t: number;
  mc: number;
  curve: number;
}

interface TokenDetailState {
  token: Token | null;
  history: HistoryPoint[];
  /** true when a backend feed is configured */
  live: boolean;
  loading: boolean;
}

/**
 * Live view of a single token: opens a short-lived WS to the worker, requests
 * the token's snapshot + market-cap history, then keeps appending live updates.
 * Falls back to "not live" when NEXT_PUBLIC_WS_URL isn't set.
 */
export function useTokenDetail(mint: string): TokenDetailState {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  const live = Boolean(wsUrl);
  const [token, setToken] = useState<Token | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(live);

  useEffect(() => {
    if (!wsUrl) {
      setLoading(false);
      return;
    }
    let disposed = false;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      setLoading(false);
      return;
    }
    const stopLoading = setTimeout(() => {
      if (!disposed) setLoading(false);
    }, 5000);

    ws.onopen = () => ws?.send(JSON.stringify({ type: 'get-token', mint }));

    ws.onmessage = (e) => {
      let m: unknown;
      try {
        m = JSON.parse(e.data as string);
      } catch {
        return;
      }
      if (typeof m !== 'object' || m === null) return;
      const msg = m as Record<string, unknown>;

      if (msg.type === 'token.detail' && msg.mint === mint) {
        if (msg.data) setToken(msg.data as Token);
        setHistory(Array.isArray(msg.history) ? (msg.history as HistoryPoint[]) : []);
        setLoading(false);
      } else if (msg.type === 'token.created') {
        const d = msg.data as Token | undefined;
        if (d && d.mintAddress === mint) setToken(d);
      } else if (msg.type === 'token.updated') {
        const d = msg.data as (Partial<Token> & { mintAddress: string }) | undefined;
        if (!d || d.mintAddress !== mint) return;
        setToken((prev) => (prev ? { ...prev, ...d } : prev));
        if (typeof d.marketCapUsd === 'number') {
          const mc = d.marketCapUsd;
          setHistory((h) => {
            const curve = typeof d.bondingCurveProgress === 'number'
              ? d.bondingCurveProgress
              : h.length > 0
                ? h[h.length - 1]!.curve
                : 0;
            return [...h, { t: Date.now(), mc, curve }].slice(-240);
          });
        }
      }
    };

    ws.onerror = () => ws?.close();

    return () => {
      disposed = true;
      clearTimeout(stopLoading);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
    };
  }, [wsUrl, mint]);

  return { token, history, live, loading };
}
