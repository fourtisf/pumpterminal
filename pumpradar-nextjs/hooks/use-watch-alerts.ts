'use client';

import { useEffect, useRef } from 'react';
import type { Token } from '@/types';
import { useProStore } from '@/lib/pro-store';

const FIRE_CURVE = 0.8;

/**
 * Watches the live feed for tokens on the user's watchlist crossing the
 * graduation alert threshold and fires a browser Notification (Pro feature).
 * The hook only fires once per mint per session.
 */
export function useWatchAlerts(tokens: readonly Token[]): void {
  const isPro = useProStore((s) => s.isPro);
  const notifyEnabled = useProStore((s) => s.notifyEnabled);
  const watchlist = useProStore((s) => s.watchlist);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isPro || !notifyEnabled) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (watchlist.length === 0) return;
    const watched = new Set(watchlist);
    for (const t of tokens) {
      if (!watched.has(t.mintAddress)) continue;
      if (t.bondingCurveProgress < FIRE_CURVE) continue;
      if (firedRef.current.has(t.mintAddress)) continue;
      firedRef.current.add(t.mintAddress);
      try {
        const n = new Notification(`$${t.symbol} near graduation`, {
          body: `${Math.round(t.bondingCurveProgress * 100)}% bonding curve · ${t.holdersCount} holders`,
          tag: `pumpterminal:${t.mintAddress}`,
          icon: t.imageUrl ?? undefined,
        });
        n.onclick = () => {
          window.focus();
          window.location.href = `/token/${t.mintAddress}`;
        };
      } catch {
        // Notifications can fail silently (private mode, ESR limits, etc).
      }
    }
  }, [tokens, isPro, notifyEnabled, watchlist]);
}
