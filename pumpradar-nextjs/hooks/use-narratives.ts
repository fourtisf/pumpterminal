'use client';

import { useEffect, useState } from 'react';
import { backendHttpBase } from '@/lib/backend';
import type { Token, TokenCategory } from '@/types';

export interface NarrativeRowData {
  category: TokenCategory;
  count: number;
  percentage: number;
  tokens: Token[];
}

interface NarrativesResponse {
  windowMs: number;
  total: number;
  rows: NarrativeRowData[];
}

interface UseNarrativesState {
  rows: NarrativeRowData[];
  total: number;
  windowMs: number;
  loading: boolean;
  /** true once a backend response succeeded at least once */
  live: boolean;
}

const POLL_MS = 30_000;

export function useNarratives(windowHours = 24): UseNarrativesState {
  const [state, setState] = useState<UseNarrativesState>({
    rows: [],
    total: 0,
    windowMs: windowHours * 3_600_000,
    loading: true,
    live: false,
  });

  useEffect(() => {
    const base = backendHttpBase();
    if (!base) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const url = `${base}/api/narratives?window=${windowHours}h`;
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as NarrativesResponse;
        if (cancelled) return;
        setState({
          rows: data.rows ?? [],
          total: data.total ?? 0,
          windowMs: data.windowMs ?? windowHours * 3_600_000,
          loading: false,
          live: true,
        });
      } catch {
        // keep last good state
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [windowHours]);

  return state;
}
