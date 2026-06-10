'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getWalletSnapshot, isLikelyAddress, type WalletSnapshot } from '@/lib/solana';

interface State {
  data: WalletSnapshot | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refreshing: boolean;
}

/**
 * Looks up a wallet snapshot and (by default) auto-refreshes every `refreshMs`.
 * Keeps showing the previous data while a refresh is in flight.
 */
export function useWalletSnapshot(address: string, refreshMs = 20_000): State {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
    refreshing: false,
  });
  const cancelledRef = useRef(false);

  const load = useCallback(
    (isRefresh: boolean) => {
      if (!isLikelyAddress(address)) {
        setState({ data: null, loading: false, error: 'That doesn’t look like a Solana address.', lastUpdated: null, refreshing: false });
        return;
      }
      setState((s) => ({ ...s, loading: !isRefresh, refreshing: isRefresh }));
      getWalletSnapshot(address)
        .then((data) => {
          if (cancelledRef.current) return;
          setState({ data, loading: false, error: null, lastUpdated: Date.now(), refreshing: false });
        })
        .catch((err: unknown) => {
          if (cancelledRef.current) return;
          const msg =
            err instanceof Error && err.message === 'rate-limited'
              ? 'Public Solana RPC is rate-limiting. Set NEXT_PUBLIC_SOLANA_RPC to a dedicated endpoint and rebuild.'
              : err instanceof Error
                ? err.message
                : 'Lookup failed.';
          // keep stale data on a failed refresh; only blank out on first load
          setState((s) => ({ ...s, loading: false, refreshing: false, error: s.data ? null : msg }));
        });
    },
    [address],
  );

  useEffect(() => {
    cancelledRef.current = false;
    load(false);
    if (refreshMs <= 0) return () => { cancelledRef.current = true; };
    const id = setInterval(() => load(true), refreshMs);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [load, refreshMs]);

  return state;
}
