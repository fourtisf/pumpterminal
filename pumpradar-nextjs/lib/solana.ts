/**
 * Tiny browser-side Solana JSON-RPC helper. Uses the public mainnet endpoint by
 * default (rate-limited — set NEXT_PUBLIC_SOLANA_RPC to a dedicated endpoint,
 * e.g. a free Helius/QuickNode key, for anything real).
 */

import { backendHttpBase } from '@/lib/backend';

const DEFAULT_RPC = 'https://solana-rpc.publicnode.com';
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function rpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC || DEFAULT_RPC;
}

export function isLikelyAddress(addr: string): boolean {
  return BASE58.test(addr.trim());
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (res.status === 429) throw new Error('rate-limited');
  if (!res.ok) throw new Error(`rpc ${method} ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? 'rpc error');
  return json.result as T;
}

export interface TokenHolding {
  mint: string;
  amount: number;
  decimals: number;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number;
  usdValue: number;
  marketCapUsd: number;
  pumpfunTracked: boolean;
}

export interface WalletSnapshot {
  address: string;
  balanceSol: number;
  /** number of signatures returned (capped at `windowSize`) */
  signatureCount: number;
  /** true if the signature window was full (i.e. there's older history) */
  hasMore: boolean;
  windowSize: number;
  /** unix-seconds timestamps of recent txs, ascending */
  timestamps: number[];
  oldestTs: number | null;
  newestTs: number | null;
  /** top holdings (only present when fetched via worker proxy with holdings=1) */
  holdings?: TokenHolding[] | null;
  holdingsTotalUsd?: number | null;
  holdingsTokenCount?: number | null;
  /** primary Solana Name Service domain (e.g. 'ansem.sol') if the wallet owns one */
  solDomain?: string | null;
  solDomains?: string[] | null;
  /** display profile — curated registry wins, falls back to on-chain SNS records */
  profile?: WalletProfile | null;
}

export interface WalletProfile {
  source: 'curated' | 'community' | 'sns' | 'sns-name' | 'entity' | 'gmgn' | 'dev-inferred' | 'derived';
  name: string | null;
  twitter: string | null;
  avatar: string | null;
  /** for entity source: 'program' | 'exchange' | 'service' */
  entity?: string | null;
  /** auto-derived tags from balance / holdings / activity */
  tags?: WalletTag[];
}

export interface WalletTag {
  label: string;
  color: string;
  desc: string;
}

async function fetchFromWorker(address: string, windowSize: number, withHoldings: boolean): Promise<WalletSnapshot | null> {
  const base = backendHttpBase();
  if (!base) return null;
  try {
    const qs = new URLSearchParams({ limit: String(windowSize) });
    if (withHoldings) qs.set('holdings', '1');
    const res = await fetch(`${base}/api/wallet/${encodeURIComponent(address)}?${qs.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<WalletSnapshot> & { error?: string };
    if (json.error || typeof json.balanceSol !== 'number') return null;
    return {
      address: json.address ?? address,
      balanceSol: json.balanceSol,
      signatureCount: json.signatureCount ?? 0,
      hasMore: json.hasMore ?? false,
      windowSize: json.windowSize ?? windowSize,
      timestamps: json.timestamps ?? [],
      oldestTs: json.oldestTs ?? null,
      newestTs: json.newestTs ?? null,
      holdings: json.holdings ?? null,
      holdingsTotalUsd: json.holdingsTotalUsd ?? null,
      holdingsTokenCount: json.holdingsTokenCount ?? null,
      solDomain: json.solDomain ?? null,
      solDomains: json.solDomains ?? null,
      profile: json.profile ?? null,
    };
  } catch {
    return null;
  }
}

export async function getWalletSnapshot(address: string, windowSize = 100, withHoldings = true): Promise<WalletSnapshot> {
  const addr = address.trim();
  if (!isLikelyAddress(addr)) throw new Error('not a valid Solana address');

  // Prefer the worker proxy — the public Solana RPC now returns 401 in browsers.
  const viaWorker = await fetchFromWorker(addr, windowSize, withHoldings);
  if (viaWorker) return viaWorker;

  const [balance, sigs] = await Promise.all([
    rpc<{ value: number }>('getBalance', [addr]),
    rpc<Array<{ blockTime: number | null }>>('getSignaturesForAddress', [addr, { limit: windowSize }]),
  ]);

  const timestamps = sigs
    .map((s) => s.blockTime)
    .filter((t): t is number => typeof t === 'number' && t > 0)
    .sort((a, b) => a - b);

  return {
    address: addr,
    balanceSol: (balance?.value ?? 0) / 1e9,
    signatureCount: sigs.length,
    hasMore: sigs.length >= windowSize,
    windowSize,
    timestamps,
    oldestTs: timestamps[0] ?? null,
    newestTs: timestamps[timestamps.length - 1] ?? null,
  };
}

/** Bucket tx timestamps into `buckets` equal time slices over their span -> counts. */
export function activityBuckets(timestamps: number[], buckets = 24): number[] {
  if (timestamps.length === 0) return [];
  const min = timestamps[0]!;
  const max = timestamps[timestamps.length - 1]!;
  const span = Math.max(1, max - min);
  const out = new Array<number>(buckets).fill(0);
  for (const t of timestamps) {
    const idx = Math.min(buckets - 1, Math.floor(((t - min) / span) * buckets));
    out[idx] = (out[idx] ?? 0) + 1;
  }
  return out;
}
