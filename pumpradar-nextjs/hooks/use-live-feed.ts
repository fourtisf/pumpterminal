'use client';

import { useEffect, useRef, useState } from 'react';
import type { SmartMoneyAlert, Token, WsMessage } from '@/types';
import { useConnectionStore } from '@/lib/connection-store';
import { MOCK_TOKENS } from '@/lib/mock-data';

const MAX_FEED_SIZE = 100;
const MAX_ALERTS = 20;
const RECONNECT_DELAY_MS = 3000;
// pump.fun spam pattern: same dev relaunches a token with identical
// name/symbol/image multiple times to phish snipers. Drop subsequent
// launches that share the same (creator, symbol) within this window.
const CLONE_WINDOW_MS = 30 * 60_000;

function cloneKey(creator: string, symbol: string): string {
  return `${creator}::${symbol.toLowerCase().trim()}`;
}

interface UseLiveFeedOptions {
  /**
   * Override the WebSocket URL. Defaults to NEXT_PUBLIC_WS_URL.
   * Falls back to mock data simulation when no URL is configured.
   */
  wsUrl?: string;
  paused?: boolean;
}

interface LiveFeedState {
  tokens: Token[];
  alerts: SmartMoneyAlert[];
  connected: boolean;
  /** true once a real backend feed is wired up (NEXT_PUBLIC_WS_URL set) */
  live: boolean;
  paused: boolean;
}

/**
 * Subscribe to the live launch feed.
 * - Production: connects to WebSocket at NEXT_PUBLIC_WS_URL
 * - Development: simulates new tokens every 3-8s from mock pool
 *
 * Component should call this once at the top of the feed page and pass
 * the tokens array down. Filtering happens client-side via FiltersStore.
 */
export function useLiveFeed(opts: UseLiveFeedOptions = {}): LiveFeedState {
  const wsUrl = opts.wsUrl ?? process.env.NEXT_PUBLIC_WS_URL;
  const live = Boolean(wsUrl);
  const [tokens, setTokens] = useState<Token[]>(() => (live ? [] : MOCK_TOKENS));
  const [alerts, setAlerts] = useState<SmartMoneyAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Map of (creator::symbol) -> first-seen timestamp ms. Used to drop clones.
  const cloneSeenRef = useRef<Map<string, number>>(new Map());
  const paused = opts.paused ?? false;

  useEffect(() => {
    const setGlobalStatus = useConnectionStore.getState().setStatus;

    // --- Mock mode: no WS URL configured ---
    if (!wsUrl) {
      setConnected(true);
      setGlobalStatus('demo');
      const scheduleNext = (): void => {
        const delay = 3000 + Math.random() * 5000;
        mockTimer.current = setTimeout(() => {
          if (!paused) {
            // Clone a random existing token with new timestamp & mint
            setTokens((prev) => {
              const seed = prev[Math.floor(Math.random() * prev.length)];
              if (!seed) return prev;
              const clone: Token = {
                ...seed,
                mintAddress: `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
                createdAt: new Date().toISOString(),
                isFresh: true,
                holdersCount: Math.floor(Math.random() * 30) + 5,
                marketCapUsd: Math.floor(Math.random() * 50_000) + 5_000,
              };
              return [clone, ...prev].slice(0, MAX_FEED_SIZE);
            });
          }
          scheduleNext();
        }, delay);
      };
      scheduleNext();
      return () => {
        if (mockTimer.current) clearTimeout(mockTimer.current);
      };
    }

    // --- Real WebSocket mode ---
    if (paused) return;

    let disposed = false;
    setGlobalStatus('reconnecting');

    const connect = (): void => {
      if (disposed) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setGlobalStatus('live');
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'token.created' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as WsMessage;
          if (msg.type === 'token.created') {
            const incoming = msg.data;
            const key = cloneKey(incoming.creatorWallet, incoming.symbol);
            const now = Date.now();
            // Sweep expired clone keys so the map doesn't grow unbounded.
            for (const [k, ts] of cloneSeenRef.current) {
              if (now - ts > CLONE_WINDOW_MS) cloneSeenRef.current.delete(k);
            }
            const firstSeen = cloneSeenRef.current.get(key);
            // Allow the same mint to be re-broadcast (worker may re-emit on
            // updates); only treat it as a clone if it's a DIFFERENT mint.
            if (
              firstSeen !== undefined &&
              now - firstSeen <= CLONE_WINDOW_MS &&
              incoming.creatorWallet
            ) {
              // Check if this mint is already in the feed (same mint re-broadcast)
              const sameMintAlreadyThere = (prev: Token[]): boolean =>
                prev.some((t) => t.mintAddress === incoming.mintAddress);
              setTokens((prev) => {
                if (sameMintAlreadyThere(prev)) {
                  // re-broadcast of an existing tracked mint — patch in place
                  return prev.map((t) =>
                    t.mintAddress === incoming.mintAddress ? { ...t, ...incoming } : t,
                  );
                }
                // genuine clone — drop it
                return prev;
              });
              return;
            }
            cloneSeenRef.current.set(key, now);
            setTokens((prev) => {
              const without = prev.filter((t) => t.mintAddress !== incoming.mintAddress);
              return [incoming, ...without].slice(0, MAX_FEED_SIZE);
            });
          } else if (msg.type === 'token.updated') {
            setTokens((prev) =>
              prev.map((t) =>
                t.mintAddress === msg.data.mintAddress ? { ...t, ...msg.data } : t,
              ),
            );
          } else if (msg.type === 'alert') {
            setAlerts((prev) => {
              const without = prev.filter((a) => a.id !== msg.data.id);
              return [msg.data, ...without].slice(0, MAX_ALERTS);
            });
          }
        } catch (err) {
          console.error('[useLiveFeed] parse error', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!disposed) {
          setGlobalStatus('reconnecting');
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, [wsUrl, paused]);

  return { tokens, alerts, connected, live, paused };
}
