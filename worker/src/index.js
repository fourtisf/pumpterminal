/**
 * PumpRadar ingestion worker — minimal real-data bridge.
 *
 * Connects to PumpPortal's free public data stream (new token launches +
 * trades), maps each event into the `WsMessage` shape the Next.js frontend
 * already understands (see pumpradar-nextjs/types/index.ts), and re-broadcasts
 * to any number of browser clients over a plain WebSocket server.
 *
 * No database, no API key. Point the frontend at it with:
 *   NEXT_PUBLIC_WS_URL=ws://<host>:<PORT>
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import url from 'url';
import { WebSocket, WebSocketServer } from 'ws';

/**
 * Load `<worker>/.env` (or $WORKER_ENV_FILE) into process.env at startup. Lines
 * already set in the environment win — so pm2 / shell exports still override
 * the file. Keeps the operator from having to remember --update-env or set up
 * a pm2 ecosystem config just to plug in an API key.
 */
function loadEnvFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
const __here = path.dirname(url.fileURLToPath(import.meta.url));
loadEnvFile(process.env.WORKER_ENV_FILE ?? path.join(__here, '..', '.env'));

const PORT = Number(process.env.PORT ?? 4000);
const PUMPPORTAL_WS_BASE = process.env.PUMPPORTAL_WS ?? 'wss://pumpportal.fun/api/data';
const PUMPPORTAL_API_KEY_RAW = (process.env.PUMPPORTAL_API_KEY ?? '').trim();
// Reject obvious placeholder values like `<paste-key-here>` or `your-key` so
// they don't get sent to the upstream and look "configured" in /health.
const PUMPPORTAL_API_KEY =
  PUMPPORTAL_API_KEY_RAW &&
  !/[<>]/.test(PUMPPORTAL_API_KEY_RAW) &&
  !/^your[-_]?key/i.test(PUMPPORTAL_API_KEY_RAW) &&
  !/paste/i.test(PUMPPORTAL_API_KEY_RAW)
    ? PUMPPORTAL_API_KEY_RAW
    : '';
// PumpPortal gates subscribeTokenTrade / subscribeAccountTrade behind a funded
// API key (>=0.02 SOL). Append the key when present.
const PUMPPORTAL_WS = PUMPPORTAL_API_KEY
  ? `${PUMPPORTAL_WS_BASE}?api-key=${encodeURIComponent(PUMPPORTAL_API_KEY)}`
  : PUMPPORTAL_WS_BASE;
let upstreamRequiresApiKey = false; // flipped when we detect the gating message

// A pump.fun bonding curve holds ~85 SOL of virtual reserves at graduation;
// total token supply is the canonical 1e9.
const GRADUATION_SOL = 85;
const TOTAL_SUPPLY = 1_000_000_000;
const GRADUATING_ALERT_THRESHOLD = 0.8; // emit "about to graduate" once curve crosses this
const MAX_TRACKED = 120; // how many recent mints we keep trade subscriptions + state for
const BACKFILL_SIZE = 30; // recent token.created events replayed to new clients
const HISTORY_MAX = 180; // market-cap history points kept per token (for the detail chart)
const RECONNECT_DELAY_MS = 5000;

let solUsd = Number(process.env.SOL_USD ?? 150);

const WAITLIST_FILE =
  process.env.WAITLIST_FILE ?? path.join(os.homedir(), '.pumpradar-waitlist.jsonl');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function appendWaitlist(email, meta) {
  const line = JSON.stringify({ email, ts: Date.now(), ...meta }) + '\n';
  await fs.promises.appendFile(WAITLIST_FILE, line);
}

/* ---------- ticker price proxy (CoinGecko, cached) ---------- */

const TICKER_COINS = [
  { id: 'solana', sym: 'SOL', kind: 'price' },
  { id: 'peanut-the-squirrel', sym: '$PNUT', kind: 'mc' },
  { id: 'goatseus-maximus', sym: '$GOAT', kind: 'mc' },
  { id: 'dogwifcoin', sym: '$WIF', kind: 'mc' },
  { id: 'bonk', sym: '$BONK', kind: 'mc' },
  { id: 'popcat', sym: '$POPCAT', kind: 'mc' },
  { id: 'official-trump', sym: '$TRUMP', kind: 'mc' },
];
const TICKER_TTL_MS = 60_000;
let tickerCache = { ts: 0, items: [] };

function fmtPrice(p) {
  if (p >= 100) return `$${p.toFixed(2)}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toPrecision(3)}`;
}
function fmtMc(mc) {
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B MC`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(2)}M MC`;
  if (mc >= 1e3) return `$${(mc / 1e3).toFixed(1)}K MC`;
  return `$${mc.toFixed(0)} MC`;
}
function fmtPct(p) {
  if (p == null || !Number.isFinite(p)) return '—';
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}

async function fetchTicker() {
  if (Date.now() - tickerCache.ts < TICKER_TTL_MS && tickerCache.items.length > 0) {
    return tickerCache.items;
  }
  const ids = TICKER_COINS.map((c) => c.id).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const data = await res.json();
    const items = TICKER_COINS.map((c) => {
      const row = data[c.id] ?? {};
      const change = row.usd_24h_change;
      const direction = (change ?? 0) >= 0 ? 'up' : 'down';
      let value = '—';
      if (c.kind === 'price' && typeof row.usd === 'number') value = fmtPrice(row.usd);
      else if (c.kind === 'mc' && typeof row.usd_market_cap === 'number') value = fmtMc(row.usd_market_cap);
      return { sym: c.sym, value, pct: fmtPct(change), direction };
    });
    tickerCache = { ts: Date.now(), items };
    // Use Solana price for MC conversions worker-wide
    const sol = data['solana']?.usd;
    if (typeof sol === 'number' && sol > 0) solUsd = sol;
    return items;
  } catch (err) {
    console.warn('[worker] ticker fetch failed:', err.message);
    return tickerCache.items;
  }
}
// Warm cache + refresh in background
fetchTicker();
setInterval(fetchTicker, TICKER_TTL_MS).unref();

/* ---------- Solana RPC proxy (avoid public-RPC 401 in browser) ---------- */

// Public Solana RPCs that don't require an API key. Tried in order; on 401/403/429
// or transport error we fall through to the next one. Override / extend with
// SOLANA_RPC=url1,url2,url3 in worker/.env (comma-separated, custom keys go first).
const SOLANA_RPC_FALLBACKS = [
  'https://solana-rpc.publicnode.com',
  'https://solana.drpc.org',
  'https://endpoints.omniatech.io/v1/sol/mainnet/public',
  'https://solana.api.onfinality.io/public',
  'https://api.mainnet-beta.solana.com',
];
const SOLANA_RPCS = [
  ...(process.env.SOLANA_RPC ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  ...SOLANA_RPC_FALLBACKS,
];

async function solanaRpc(method, params) {
  let lastErr = null;
  for (const endpoint of SOLANA_RPCS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        lastErr = new Error(`${endpoint} ${res.status}`);
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`${endpoint} ${res.status}`);
        continue;
      }
      const json = await res.json();
      if (json.error) {
        lastErr = new Error(json.error.message ?? 'rpc error');
        continue;
      }
      return json.result;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('all rpc endpoints failed');
}

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SPL_TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

/* ---------- token price helper (DexScreener, cached) ---------- */

const PRICE_TTL_MS = 60_000;
const priceCache = new Map(); // mint -> { price, symbol, name, imageUrl, ts }

// Metadata fallbacks: pump.fun for fresh bonding-curve tokens, Jupiter for
// graduated / regular SPL tokens. Negative results cached only briefly so we
// retry quickly when an upstream recovers.
const PUMPFUN_META_TTL_MS = 5 * 60_000;
const PUMPFUN_NEGATIVE_TTL_MS = 60_000;
const pumpfunMetaCache = new Map(); // mint -> { name, symbol, imageUrl, ts, found }

// pump.fun blocks plain fetch() without browser-ish headers. These mirror what
// a real browser sends.
const PUMPFUN_HEADERS = {
  accept: 'application/json',
  'accept-language': 'en-US,en;q=0.9',
  origin: 'https://pump.fun',
  referer: 'https://pump.fun/',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};
const PUMPFUN_HOSTS = [
  'https://frontend-api-v3.pump.fun',
  'https://frontend-api-v2.pump.fun',
  'https://frontend-api.pump.fun',
];

async function fetchPumpfunMeta(mint) {
  const cached = pumpfunMetaCache.get(mint);
  if (cached) {
    const ttl = cached.found ? PUMPFUN_META_TTL_MS : PUMPFUN_NEGATIVE_TTL_MS;
    if (Date.now() - cached.ts < ttl) return cached.found ? cached : null;
  }
  for (const host of PUMPFUN_HOSTS) {
    try {
      const res = await fetch(`${host}/coins/${mint}`, {
        headers: PUMPFUN_HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (!json || (!json.symbol && !json.name)) continue;
      const entry = {
        ts: Date.now(),
        found: true,
        name: json?.name ?? null,
        symbol: json?.symbol ?? null,
        imageUrl: json?.image_uri ?? null,
        description: json?.description ?? null,
        twitter: json?.twitter ?? null,
        telegram: json?.telegram ?? null,
        website: json?.website ?? null,
        marketCapUsd: Number(json?.usd_market_cap ?? 0),
      };
      pumpfunMetaCache.set(mint, entry);
      // Auto-discovery: link this token's creator to its twitter handle if
      // both are present. Multiple matching tokens promote the wallet to
      // 'dev-inferred' source in walletProfileFor.
      try {
        const creator = json?.creator ?? json?.creator_address ?? json?.dev ?? null;
        if (creator && entry.twitter) recordDevTwitter(String(creator), entry.twitter);
      } catch {}
      return entry;
    } catch {
      // try next host
    }
  }
  pumpfunMetaCache.set(mint, { ts: Date.now(), found: false });
  return null;
}

// Jupiter token list — covers graduated pump.fun tokens, Raydium pairs, and
// anything Jupiter routes. Lightweight per-mint endpoint, cached aggressively.
const JUPITER_TTL_MS = 30 * 60_000;
const JUPITER_NEGATIVE_TTL_MS = 60_000;
const jupiterMetaCache = new Map(); // mint -> { symbol, name, imageUrl, decimals, ts, found }

async function fetchJupiterMeta(mint) {
  const cached = jupiterMetaCache.get(mint);
  if (cached) {
    const ttl = cached.found ? JUPITER_TTL_MS : JUPITER_NEGATIVE_TTL_MS;
    if (Date.now() - cached.ts < ttl) return cached.found ? cached : null;
  }
  try {
    const res = await fetch(`https://lite-api.jup.ag/tokens/v1/token/${mint}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      jupiterMetaCache.set(mint, { ts: Date.now(), found: false });
      return null;
    }
    const json = await res.json();
    if (!json || (!json.symbol && !json.name)) {
      jupiterMetaCache.set(mint, { ts: Date.now(), found: false });
      return null;
    }
    const entry = {
      ts: Date.now(),
      found: true,
      name: json.name ?? null,
      symbol: json.symbol ?? null,
      imageUrl: json.logoURI ?? null,
      decimals: typeof json.decimals === 'number' ? json.decimals : null,
    };
    jupiterMetaCache.set(mint, entry);
    return entry;
  } catch {
    jupiterMetaCache.set(mint, { ts: Date.now(), found: false });
    return null;
  }
}

// Solana Name Service — resolve .sol domain(s) for a wallet via Bonfida's
// public API. Used to display 'ansem.sol' instead of a raw base58 address.
const SNS_TTL_MS = 6 * 60 * 60_000;
const SNS_NEGATIVE_TTL_MS = 10 * 60_000;
const snsCache = new Map();

async function fetchSnsDomain(addr) {
  const cached = snsCache.get(addr);
  if (cached) {
    const ttl = cached.found ? SNS_TTL_MS : SNS_NEGATIVE_TTL_MS;
    if (Date.now() - cached.ts < ttl) return cached.found ? cached : null;
  }
  try {
    const res = await fetch(`https://sns-api.bonfida.com/v2/user/domains/${addr}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      snsCache.set(addr, { ts: Date.now(), found: false });
      return null;
    }
    const json = await res.json();
    const domains = Array.isArray(json?.result)
      ? json.result.map((d) => (typeof d === 'string' ? d : d?.domain)).filter(Boolean)
      : [];
    if (domains.length === 0) {
      snsCache.set(addr, { ts: Date.now(), found: false });
      return null;
    }
    const normalized = domains.map((d) => (d.endsWith('.sol') ? d : `${d}.sol`));
    normalized.sort((a, b) => a.length - b.length);
    const primary = normalized[0];
    // Best-effort: pull twitter + image records for the primary domain.
    // These are stored on-chain via Bonfida SNS records; gives a verifiable
    // X handle for the wallet (vs. just a search link).
    const [twitter, image] = await Promise.all([
      fetchSnsRecord(primary, 'twitter').catch(() => null),
      fetchSnsRecord(primary, 'pic').catch(() => null),
    ]);
    const entry = {
      ts: Date.now(),
      found: true,
      primary,
      all: normalized,
      twitter,
      image,
    };
    snsCache.set(addr, entry);
    return entry;
  } catch {
    snsCache.set(addr, { ts: Date.now(), found: false });
    return null;
  }
}

// GMGN trader profile lookup — uses their internal walletNew endpoint.
// Undocumented and best-effort; if GMGN throttles or changes the contract
// we silently fall through to the SNS / curated paths. Cached aggressively
// to keep request volume low.
const GMGN_TTL_MS = 60 * 60_000;
const GMGN_NEGATIVE_TTL_MS = 10 * 60_000;
const gmgnCache = new Map();

async function fetchGmgnProfile(addr) {
  const cached = gmgnCache.get(addr);
  if (cached) {
    const ttl = cached.found ? GMGN_TTL_MS : GMGN_NEGATIVE_TTL_MS;
    if (Date.now() - cached.ts < ttl) return cached.found ? cached : null;
  }
  try {
    // GMGN.ai's API is behind Cloudflare bot protection — direct fetches
    // return 'Host not in allowlist' 403. To enable, set GMGN_PROXY_URL to
    // a scraping proxy (ScrapingBee, Bright Data, FlareSolverr, etc.) that
    // takes ?url= and returns the upstream body.
    const target = `https://gmgn.ai/defi/quotation/v1/wallet/sol/walletNew/${addr}?period=7d`;
    const url = process.env.GMGN_PROXY_URL
      ? `${process.env.GMGN_PROXY_URL}?url=${encodeURIComponent(target)}`
      : target;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        origin: 'https://gmgn.ai',
        referer: `https://gmgn.ai/sol/address/${addr}`,
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      gmgnCache.set(addr, { ts: Date.now(), found: false });
      return null;
    }
    const json = await res.json();
    const data = json?.data ?? json?.result ?? json;
    if (!data || typeof data !== 'object') {
      gmgnCache.set(addr, { ts: Date.now(), found: false });
      return null;
    }
    const name =
      data.name ??
      data.ens_domain ??
      data.twitter_username ??
      null;
    const twitter = data.twitter_username ?? data.twitter ?? null;
    const avatar = data.avatar ?? data.twitter_avatar ?? data.profile_image_url ?? null;
    const winRate = typeof data.winrate === 'number' ? data.winrate : null;
    const pnl7d = typeof data.pnl_7d === 'number' ? data.pnl_7d : null;
    const realizedPnl = typeof data.realized_profit_7d === 'number' ? data.realized_profit_7d : null;
    if (!name && !twitter && !avatar) {
      gmgnCache.set(addr, { ts: Date.now(), found: false });
      return null;
    }
    const entry = {
      ts: Date.now(),
      found: true,
      name,
      twitter,
      avatar,
      winRate,
      pnl7d,
      realizedPnl,
    };
    gmgnCache.set(addr, entry);
    return entry;
  } catch {
    gmgnCache.set(addr, { ts: Date.now(), found: false });
    return null;
  }
}

async function fetchSnsRecord(domain, kind) {
  try {
    const name = domain.replace(/\.sol$/, '');
    const res = await fetch(`https://sns-api.bonfida.com/v2/record/${name}/${kind}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const value = typeof json?.result === 'string' ? json.result.trim() : null;
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

// Built-in registry of well-known Solana programs / exchanges. These addresses
// are publicly documented and stable. Hardcoded so the worker can label a
// wallet as "Raydium AMM" / "Binance Hot Wallet" without any external lookup.
const KNOWN_ENTITIES = {
  // Pump.fun ecosystem
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': { name: 'Pump.fun', kind: 'program' },
  'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA': { name: 'PumpSwap', kind: 'program' },
  // Raydium
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': { name: 'Raydium AMM v4', kind: 'program' },
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': { name: 'Raydium CPMM', kind: 'program' },
  // Jupiter
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': { name: 'Jupiter v6', kind: 'program' },
  // Orca
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': { name: 'Orca Whirlpool', kind: 'program' },
  // System
  '11111111111111111111111111111111': { name: 'System Program', kind: 'program' },
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': { name: 'SPL Token Program', kind: 'program' },
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': { name: 'Token-2022 Program', kind: 'program' },
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': { name: 'Associated Token Program', kind: 'program' },
  // Major centralized exchange hot wallets (publicly documented)
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': { name: 'Binance Hot Wallet', kind: 'exchange' },
  '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9': { name: 'Binance Hot Wallet', kind: 'exchange' },
  '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S': { name: 'OKX Hot Wallet', kind: 'exchange' },
  'GJRs4FwHtemZ5ZE9x3FNvJ8TMeCbtsoFmjK6ekZG5HE9': { name: 'Bybit Hot Wallet', kind: 'exchange' },
  'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2': { name: 'Bybit Hot Wallet', kind: 'exchange' },
  '5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD': { name: 'Coinbase Hot Wallet', kind: 'exchange' },
  'H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS': { name: 'Coinbase Hot Wallet', kind: 'exchange' },
  'GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ': { name: 'Coinbase 4', kind: 'exchange' },
  // Solana ecosystem
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM': { name: 'pump.fun Fee Recipient', kind: 'service' },
};

// User-curated registry of well-known wallets. Empty by default — add JSON to
// ~/.pumpradar-known-wallets.json (or WALLETS_REGISTRY env path) shaped as:
//   { "<base58>": { "name": "Ansem", "twitter": "blknoiz06", "avatar": "https://..." } }
// Loaded on boot, hot-reload via SIGHUP not implemented to keep it simple.
const WALLETS_REGISTRY_FILE =
  process.env.WALLETS_REGISTRY ?? path.join(os.homedir(), '.pumpradar-known-wallets.json');
let knownWallets = {};
(function loadKnownWallets() {
  try {
    if (!fs.existsSync(WALLETS_REGISTRY_FILE)) return;
    const raw = fs.readFileSync(WALLETS_REGISTRY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      knownWallets = parsed;
      console.log(`[worker] loaded ${Object.keys(knownWallets).length} known wallets`);
    }
  } catch (err) {
    console.warn('[worker] failed to load known wallets registry:', err.message);
  }
})();

// Auto-discovery: when a pump.fun token in our feed has a twitter URL set
// on its metadata, the token's creator wallet is very likely the owner of
// that twitter handle. We record creator -> twitter counts; the most-common
// handle with at least MIN_DEV_TOKENS confirmations wins.
const MIN_DEV_TOKENS = 2;
const devTwitterCounts = new Map(); // creator -> Map<twitterHandle, count>
const DEV_DISCOVERY_FILE =
  process.env.DEV_DISCOVERY_FILE ?? path.join(os.homedir(), '.pumpradar-dev-twitter.json');
let devInferenceCache = new Map(); // creator -> { twitter, count }

(function loadDevDiscovery() {
  try {
    if (!fs.existsSync(DEV_DISCOVERY_FILE)) return;
    const raw = fs.readFileSync(DEV_DISCOVERY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [creator, counts] of Object.entries(parsed)) {
        devTwitterCounts.set(creator, new Map(Object.entries(counts)));
        // Pick the winner per creator
        let bestHandle = null;
        let bestCount = 0;
        for (const [h, c] of Object.entries(counts)) {
          if (c > bestCount) { bestHandle = h; bestCount = c; }
        }
        if (bestHandle && bestCount >= MIN_DEV_TOKENS) {
          devInferenceCache.set(creator, { twitter: bestHandle, count: bestCount });
        }
      }
      console.log(`[worker] loaded dev->twitter discovery: ${devInferenceCache.size} confirmed`);
    }
  } catch (err) {
    console.warn('[worker] failed to load dev discovery:', err.message);
  }
})();

let devSaveQueue = Promise.resolve();
function persistDevDiscovery() {
  devSaveQueue = devSaveQueue
    .then(() => {
      const out = {};
      for (const [creator, counts] of devTwitterCounts) {
        out[creator] = Object.fromEntries(counts);
      }
      return fs.promises.writeFile(DEV_DISCOVERY_FILE, JSON.stringify(out));
    })
    .catch((err) => console.warn('[worker] dev discovery write failed:', err.message));
}

// Normalize a twitter URL/handle to bare handle (lowercase, no @ / URL prefix).
function normalizeTwitterHandle(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;
  // Strip URLs
  const m = s.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,30})/i);
  if (m) s = m[1];
  s = s.replace(/^@/, '').replace(/[^A-Za-z0-9_].*$/, '');
  if (s.length < 2 || s.length > 30) return null;
  return s.toLowerCase();
}

function recordDevTwitter(creator, twitterRaw) {
  if (!creator) return;
  const handle = normalizeTwitterHandle(twitterRaw);
  if (!handle) return;
  let counts = devTwitterCounts.get(creator);
  if (!counts) {
    counts = new Map();
    devTwitterCounts.set(creator, counts);
  }
  counts.set(handle, (counts.get(handle) ?? 0) + 1);
  // Recompute winner for this creator
  let bestHandle = null;
  let bestCount = 0;
  for (const [h, c] of counts) {
    if (c > bestCount) { bestHandle = h; bestCount = c; }
  }
  if (bestHandle && bestCount >= MIN_DEV_TOKENS) {
    devInferenceCache.set(creator, { twitter: bestHandle, count: bestCount });
  }
  persistDevDiscovery();
}

function inferredDevProfileFor(addr) {
  const hit = devInferenceCache.get(addr);
  if (!hit) return null;
  return {
    source: 'dev-inferred',
    name: `@${hit.twitter}`,
    twitter: hit.twitter,
    avatar: `https://unavatar.io/twitter/${hit.twitter}`,
    confidence: hit.count,
  };
}

// Optional community wallet list — set KNOWN_WALLETS_URL to a public JSON URL
// (e.g. raw GitHub gist) and the worker pulls it every 6h and merges into
// knownWallets. Manual /settings entries override community ones since they
// live in the local file loaded after this.
const COMMUNITY_TTL_MS = 6 * 60 * 60_000;
let communityWallets = {};

async function refreshCommunityWallets() {
  const url = (process.env.KNOWN_WALLETS_URL ?? '').trim();
  if (!url) return;
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json && typeof json === 'object') {
      communityWallets = json;
      console.log(`[worker] community wallets refreshed: ${Object.keys(communityWallets).length}`);
    }
  } catch (err) {
    console.warn('[worker] community wallets fetch failed:', err.message);
  }
}
refreshCommunityWallets();
setInterval(refreshCommunityWallets, COMMUNITY_TTL_MS).unref();

async function saveKnownWallets() {
  try {
    await fs.promises.writeFile(WALLETS_REGISTRY_FILE, JSON.stringify(knownWallets, null, 2));
  } catch (err) {
    console.warn('[worker] failed to save known wallets:', err.message);
  }
}

function withUnavatarFallback(profile) {
  if (!profile) return profile;
  if (!profile.avatar && profile.twitter) {
    profile.avatar = `https://unavatar.io/twitter/${profile.twitter}`;
  }
  return profile;
}

function walletProfileFor(addr, sns, gmgn) {
  // Manual (local) curated registry wins — explicit user assignment.
  const curated = knownWallets[addr];
  if (curated) {
    return withUnavatarFallback({
      source: 'curated',
      name: curated.name ?? null,
      twitter: curated.twitter ?? null,
      avatar: curated.avatar ?? null,
      entity: null,
    });
  }
  // Community-shared list (pulled from KNOWN_WALLETS_URL).
  const community = communityWallets[addr];
  if (community) {
    return withUnavatarFallback({
      source: 'community',
      name: community.name ?? null,
      twitter: community.twitter ?? null,
      avatar: community.avatar ?? null,
      entity: null,
    });
  }
  // Built-in entity registry (programs, exchanges).
  const entity = KNOWN_ENTITIES[addr];
  if (entity) {
    return {
      source: 'entity',
      name: entity.name,
      twitter: null,
      avatar: null,
      entity: entity.kind,
    };
  }
  // Auto-inferred from pump.fun token launches: wallet that consistently
  // ships tokens linking to the same twitter is almost certainly that dev.
  const inferred = inferredDevProfileFor(addr);
  if (inferred) {
    return {
      source: inferred.source,
      name: inferred.name,
      twitter: inferred.twitter,
      avatar: inferred.avatar,
      entity: null,
      confidence: inferred.confidence,
    };
  }
  // GMGN (only if a paid proxy is configured).
  if (gmgn?.found && (gmgn.name || gmgn.twitter || gmgn.avatar)) {
    return withUnavatarFallback({
      source: 'gmgn',
      name: gmgn.name ?? gmgn.twitter ?? null,
      twitter: gmgn.twitter ?? null,
      avatar: gmgn.avatar ?? null,
      entity: null,
    });
  }
  // SNS records — verifiable on-chain claim.
  if (sns?.found && (sns.twitter || sns.image)) {
    return withUnavatarFallback({
      source: 'sns',
      name: sns.primary,
      twitter: sns.twitter ?? null,
      avatar: sns.image ?? null,
      entity: null,
    });
  }
  if (sns?.found) {
    return { source: 'sns-name', name: sns.primary, twitter: null, avatar: null, entity: null };
  }
  return null;
}

// Auto-derived tags from on-chain signals. Runs after balance/holdings/sigs
// are fetched. Pure functions of the inputs — no external lookups.
function computeAutoTags({ balanceSol, holdings, signatureCount, oldestTs, newestTs, hasMore }) {
  const tags = [];
  const now = Date.now() / 1000;
  const idleDays = newestTs ? (now - newestTs) / 86400 : Infinity;
  const span = oldestTs && newestTs ? Math.max(1, (newestTs - oldestTs) / 86400) : 1;
  const txPerDay = signatureCount / span;
  const totalSigs = signatureCount + (hasMore ? 1 : 0); // rough "has more" signal

  const pumpfunHoldings = (holdings ?? []).filter((h) => h.pumpfunTracked).length;
  const totalHoldingsUsd = (holdings ?? []).reduce((s, h) => s + (h.usdValue ?? 0), 0);

  // Activity-based — leveraging pumpradar's own tracked-token data.
  if (pumpfunHoldings >= 10) {
    tags.push({ label: 'Whale Sniper', color: '#a855f7', desc: `Holds ${pumpfunHoldings} pump.fun tokens we track` });
  } else if (pumpfunHoldings >= 5) {
    tags.push({ label: 'Active Sniper', color: '#00ff88', desc: `Holds ${pumpfunHoldings} pump.fun tokens we track` });
  } else if (pumpfunHoldings >= 2) {
    tags.push({ label: 'PumpFun Bagger', color: '#7ab8ff', desc: `Holds ${pumpfunHoldings} pump.fun tokens we track` });
  }

  // Capital tier.
  if (balanceSol >= 1000) {
    tags.push({ label: 'Megawhale', color: '#ffb547', desc: `${balanceSol.toFixed(0)} SOL on hand` });
  } else if (balanceSol >= 100) {
    tags.push({ label: 'Whale', color: '#ffb547', desc: `${balanceSol.toFixed(0)} SOL on hand` });
  }
  if (totalHoldingsUsd >= 100_000) {
    tags.push({ label: 'Big Bag', color: '#ffb547', desc: `~$${Math.round(totalHoldingsUsd / 1000)}K in tokens` });
  }

  // Activity pattern.
  if (txPerDay >= 50 && totalSigs >= 50) {
    tags.push({ label: 'Bot Suspect', color: '#ff3d5a', desc: `~${txPerDay.toFixed(0)} tx/day cadence` });
  } else if (txPerDay >= 15) {
    tags.push({ label: 'High Velocity', color: '#ff8a47', desc: `~${txPerDay.toFixed(0)} tx/day` });
  }
  if (idleDays > 90) {
    tags.push({ label: 'Dormant', color: '#8a93a0', desc: `Idle ${Math.round(idleDays)}d` });
  } else if (idleDays > 30) {
    tags.push({ label: 'Cooling Off', color: '#8a93a0', desc: `Last seen ${Math.round(idleDays)}d ago` });
  }

  // Fresh wallet.
  if (signatureCount < 5 && balanceSol < 1) {
    tags.push({ label: 'Fresh', color: '#00ff88', desc: 'New wallet, too little history' });
  }

  return tags;
}

// Combined: pump.fun (fresh tokens) + Jupiter (indexed tokens).
// Metaplex on-chain fallback removed — the @solana/web3.js dep brought a
// rpc-websockets/uuid ESM mismatch that crash-looped the worker. Worth
// living without the marginal 5% logo coverage for stability.
async function fetchTokenMeta(mint) {
  const [pump, jup] = await Promise.all([
    fetchPumpfunMeta(mint).catch(() => null),
    fetchJupiterMeta(mint).catch(() => null),
  ]);
  return {
    name: pump?.name ?? jup?.name ?? null,
    symbol: pump?.symbol ?? jup?.symbol ?? null,
    imageUrl: pump?.imageUrl ?? jup?.imageUrl ?? null,
    description: pump?.description ?? null,
    twitter: pump?.twitter ?? null,
    telegram: pump?.telegram ?? null,
    website: pump?.website ?? null,
    marketCapUsd: pump?.marketCapUsd ?? 0,
  };
}

async function fetchPricesForMints(mints) {
  const need = [];
  const now = Date.now();
  for (const m of mints) {
    const cached = priceCache.get(m);
    if (!cached || now - cached.ts > PRICE_TTL_MS) need.push(m);
  }
  // DexScreener accepts up to 30 mints per request
  for (let i = 0; i < need.length; i += 30) {
    const batch = need.slice(i, i + 30);
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${batch.join(',')}`, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const pairs = Array.isArray(json?.pairs) ? json.pairs : [];
      // For each mint, pick the pair with highest liquidity
      const byMint = new Map();
      for (const p of pairs) {
        const mint = p.baseToken?.address;
        if (!mint || !batch.includes(mint)) continue;
        const liq = Number(p.liquidity?.usd ?? 0);
        const prev = byMint.get(mint);
        if (!prev || liq > prev.liq) byMint.set(mint, { p, liq });
      }
      for (const mint of batch) {
        const hit = byMint.get(mint);
        if (hit) {
          priceCache.set(mint, {
            price: Number(hit.p.priceUsd ?? 0),
            symbol: hit.p.baseToken?.symbol ?? null,
            name: hit.p.baseToken?.name ?? null,
            imageUrl: hit.p.info?.imageUrl ?? null,
            marketCapUsd: Number(hit.p.marketCap ?? hit.p.fdv ?? 0),
            ts: now,
          });
        } else {
          // negative cache so we don't hammer DexScreener for unknown mints
          priceCache.set(mint, { price: 0, symbol: null, name: null, imageUrl: null, marketCapUsd: 0, ts: now });
        }
      }
    } catch (err) {
      console.warn('[worker] dexscreener fetch failed:', err.message);
    }
  }
  const out = new Map();
  for (const m of mints) out.set(m, priceCache.get(m) ?? null);
  return out;
}

async function fetchHoldings(address) {
  const both = await Promise.allSettled([
    solanaRpc('getTokenAccountsByOwner', [address, { programId: SPL_TOKEN_PROGRAM }, { encoding: 'jsonParsed' }]),
    solanaRpc('getTokenAccountsByOwner', [address, { programId: SPL_TOKEN_2022_PROGRAM }, { encoding: 'jsonParsed' }]),
  ]);
  const rows = [];
  for (const r of both) {
    if (r.status !== 'fulfilled' || !r.value?.value) continue;
    for (const acc of r.value.value) {
      const info = acc.account?.data?.parsed?.info;
      if (!info) continue;
      const amount = Number(info.tokenAmount?.uiAmount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      rows.push({
        mint: String(info.mint),
        amount,
        decimals: Number(info.tokenAmount?.decimals ?? 0),
      });
    }
  }
  // Enrich with prices for up to top 50 by raw amount (DexScreener limit)
  const top = rows.slice().sort((a, b) => b.amount - a.amount).slice(0, 50);
  const prices = await fetchPricesForMints(top.map((r) => r.mint));
  // For any top holding that's still missing image/symbol after DexScreener,
  // hit pump.fun + Jupiter in parallel. Pump.fun owns fresh bonding-curve
  // tokens; Jupiter owns everything else.
  const needsMeta = top
    .filter((r) => {
      const m = prices.get(r.mint);
      return !m?.imageUrl || !m?.symbol;
    })
    .slice(0, 50);
  const pumpMetas = await Promise.all(needsMeta.map((r) => fetchTokenMeta(r.mint)));
  const pumpMetaByMint = new Map();
  needsMeta.forEach((r, i) => pumpMetaByMint.set(r.mint, pumpMetas[i]));

  const enriched = rows.map((r) => {
    const meta = prices.get(r.mint);
    const pump = pumpMetaByMint.get(r.mint);
    let price = meta?.price ?? 0;
    let marketCapUsd = meta?.marketCapUsd || pump?.marketCapUsd || 0;
    // DexScreener has no price for pump.fun tokens still on the bonding curve.
    // Derive price from pump.fun's reported market cap (total supply 1B).
    if (price <= 0 && pump?.marketCapUsd > 0) {
      price = pump.marketCapUsd / 1_000_000_000;
    }
    const usdValue = price > 0 ? price * r.amount : 0;
    const pumpfunTracked = state.has(r.mint) || launchHistory.has(r.mint);
    return {
      ...r,
      symbol: meta?.symbol ?? pump?.symbol ?? null,
      name: meta?.name ?? pump?.name ?? null,
      imageUrl: meta?.imageUrl ?? pump?.imageUrl ?? null,
      priceUsd: price,
      usdValue,
      marketCapUsd,
      pumpfunTracked,
    };
  });
  enriched.sort((a, b) => b.usdValue - a.usdValue);
  const totalUsd = enriched.reduce((s, r) => s + (r.usdValue || 0), 0);
  return { holdings: enriched.slice(0, 50), totalUsd, tokenCount: rows.length };
}

/* ---------- graduating events log (persisted) ---------- */

const GRAD_LOG_FILE =
  process.env.GRADUATING_LOG_FILE ?? path.join(os.homedir(), '.pumpradar-graduating.jsonl');
// Pump.fun graduation: curve fills (85 SOL ≈ $16K raised) and the token's
// market cap lands around $60-70K. "About to graduate" should mean it's
// actually in that territory — not random junk with a stale curve reading.
const GRAD_THRESHOLD = 0.8; // first crossing recorded
const GRAD_MC_FLOOR_USD = 40_000; // graduation MC is ~$60-70K — require ≥$40k peak to count
const GRAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7d in memory; clients can window-narrow
const GRAD_MEMORY_CAP = 800;

/** mint -> event */
const graduatingByMint = new Map();
const graduatingCrossed = new Set();

function loadGraduatingFromDisk() {
  let content;
  try {
    content = fs.readFileSync(GRAD_LOG_FILE, 'utf8');
  } catch {
    return;
  }
  const cutoff = Date.now() - GRAD_RETENTION_MS;
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const e = JSON.parse(line);
      if (!e || !e.mint || !Number.isFinite(e.t)) continue;
      if (e.t < cutoff) continue;
      // last write wins (later trades may update peak)
      const existing = graduatingByMint.get(e.mint);
      if (!existing || (e.peakCurve ?? 0) >= (existing.peakCurve ?? 0)) {
        graduatingByMint.set(e.mint, e);
      }
      graduatingCrossed.add(e.mint);
    } catch {
      // skip malformed line
    }
  }
  console.log(`[worker] loaded ${graduatingByMint.size} graduating events from disk`);
}

function appendGraduatingEvent(event) {
  fs.promises
    .appendFile(GRAD_LOG_FILE, JSON.stringify(event) + '\n')
    .catch((err) => console.warn('[worker] graduating log write failed:', err.message));
}

function recordGraduatingEvent(mint) {
  if (graduatingCrossed.has(mint)) {
    // update peakCurve / mc if newer trade pushed it higher
    const st = state.get(mint);
    const existing = graduatingByMint.get(mint);
    if (!st || !existing) return;
    if (st.curve > (existing.peakCurve ?? 0)) {
      existing.peakCurve = st.curve;
      existing.tUpdated = Date.now();
    }
    if ((st.marketCapUsd ?? 0) > (existing.peakMcUsd ?? 0)) {
      existing.peakMcUsd = st.marketCapUsd;
    }
    existing.marketCapUsd = st.marketCapUsd;
    return;
  }
  const st = state.get(mint);
  if (!st || st.curve < GRAD_THRESHOLD) return;
  graduatingCrossed.add(mint);
  const event = {
    mint,
    symbol: st.symbol,
    name: st.name,
    category: st.category,
    imageUrl: st.imageUrl ?? null,
    creatorWallet: st.creatorWallet,
    createdAt: st.createdAt,
    t: Date.now(),
    peakCurve: st.curve,
    marketCapUsd: st.marketCapUsd,
    peakMcUsd: st.marketCapUsd,
  };
  graduatingByMint.set(mint, event);
  appendGraduatingEvent(event);
  // cap in-memory size (drop oldest by event time)
  if (graduatingByMint.size > GRAD_MEMORY_CAP) {
    const oldest = [...graduatingByMint.entries()].sort((a, b) => a[1].t - b[1].t)[0];
    if (oldest) graduatingByMint.delete(oldest[0]);
  }
}

loadGraduatingFromDisk();

async function refreshSolPrice() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    );
    if (!res.ok) return;
    const json = await res.json();
    const p = json?.solana?.usd;
    if (typeof p === 'number' && p > 0) {
      solUsd = p;
      console.log(`[worker] SOL/USD = ${solUsd}`);
    }
  } catch (err) {
    console.warn('[worker] SOL price refresh failed:', err.message);
  }
}
refreshSolPrice();
setInterval(refreshSolPrice, 5 * 60_000);

/* ---------- naive keyword categorizer ---------- */

// Order matters — first match wins. Kept deliberately broad: most pump.fun names
// are noise, so anything that doesn't hit a rule falls through to "Other".
const CATEGORY_RULES = [
  ['AI', /(\bai\b|\bagi\b|\bagent\b|\bgpt\b|\bllm\b|chatgpt|openai|deepseek|grok|claude|gemini|neural|machine.?learning|robot|android|cyborg|sentient|singularity|\bmodel\b|\bbrain\b|\bgenai\b)/i],
  ['Animal', /(\bdog\b|doge|\binu\b|shib|shiba|bonk|wif|\bcat\b|kitty|meow|\bpepe\b|frog|pnut|peanut|squirrel|monkey|\bape\b|gorilla|chimp|\bbear\b|\bbull\b|hippo|moo?deng|\bwolf\b|\bfox\b|\bbird\b|penguin|panda|tiger|lion|\bgoat\b|sheep|\bpig\b|hamster|rabbit|bunny|dolphin|whale|shark|snake|dragon|elephant|koala|sloth|llama|capybara|axolotl|chicken|duck|turtle|octopus)/i],
  ['Political', /(trump|maga|biden|kamala|harris|\bvance\b|\bnewsom\b|desantis|obama|clinton|\bbush\b|reagan|\bputin\b|zelensky|netanyahu|\bxi\b|modi|\bmilei\b|bukele|libertarian|democrat|republican|\bgop\b|election|potus|president|congress|senate|\bmaga\b|\bmega\b|deport|\bdoge\b.?gov|\bdoj\b|\bcia\b|\bfbi\b|\bfed\b)/i],
  ['Celebrity', /(\belon\b|\bmusk\b|kanye|\bye\b|taylor.?swift|\bdrake\b|kendrick|\bdiddy\b|\bmessi\b|ronaldo|lebron|\bmrbeast\b|\bksi\b|hawk.?tuah|kardashian|jenner|\bbieber\b|\brihanna\b|\bzuck\b|bezos|\bgates\b|\bsaylor\b|\bcz\b|\bsbf\b|vitalik|\btate\b|hawk)/i],
  ['Tech', /(\btech\b|\bchip\b|\bgpu\b|\bnvidia\b|\bcuda\b|quantum|\bdefi\b|\bweb3\b|\bdao\b|protocol|blockchain|solana|ethereum|bitcoin|\bzk\b|rollup|layer.?2|\bl2\b|\bdepin\b|\brwa\b|\bnft\b|metaverse|\bvr\b|\bar\b|spacex|tesla|starlink)/i],
  ['Food', /(pizza|burger|\btaco\b|sushi|coffee|\bbeer\b|wagyu|ramen|noodle|\bcake\b|\bbread\b|\bdonut\b|bacon|\begg\b|cheese|\bmilk\b|\bsoda\b|\bcola\b|whisky|whiskey|vodka|tequila|\bramen\b|\bsoup\b|\bfries\b|nugget|\bbanana\b|\bmango\b|\bpotato\b|\bcorn\b|\brice\b|chocolate|candy|\bgummy\b|\bsnack\b)/i],
  ['Religious', /(\bjesus\b|christ|\bgod\b|allah|buddha|church|\bholy\b|\bangel\b|\bsaint\b|\bbible\b|quran|\bpope\b|heaven|\bhell\b|\bdemon\b|\bsatan\b|prophet|messiah|divine|\bpray\b|\bfaith\b|gospel|\bamen\b)/i],
  ['Sports', /(\bnfl\b|\bnba\b|\bmlb\b|\bnhl\b|soccer|football|basketball|baseball|\bufc\b|\bmma\b|olympic|\bfifa\b|\bf1\b|formula.?1|\bnascar\b|\bgolf\b|tennis|cricket|rugby|boxing|wrestl|\bgym\b|\bfit\b|workout|marathon)/i],
];

// Tickers that pump.fun tokens love to impersonate. Don't let an exact-match
// symbol drag the token into Tech/Animal — they're meme/scam, not the real thing.
const IMPERSONATOR_SYMBOLS = new Set([
  'SOL', 'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'USDT', 'USDC', 'DAI',
  'AVAX', 'MATIC', 'DOT', 'LINK', 'TRX', 'LTC', 'BCH', 'TON',
]);

function categorize(name = '', symbol = '') {
  const sym = String(symbol).trim().toUpperCase();
  if (IMPERSONATOR_SYMBOLS.has(sym)) return 'Meme';
  const hay = `${name} ${symbol}`;
  for (const [cat, re] of CATEGORY_RULES) {
    if (re.test(hay)) return cat;
  }
  // generic meme-y markers; everything else is "Other" so the breakdown isn't
  // dominated by a catch-all.
  if (/(moon|lambo|wagmi|ngmi|hodl|degen|chad|wojak|gigachad|sigma|rich|millionaire|\b1000x\b|\b100x\b|pump|rug|jeet|baghold|cope|based|\bmeme\b|coin\b|\btoken\b|\binu\b|\bfomo\b|elon|\bgm\b| retard|\bcum\b|\bsex\b|\bporn\b|\bnword\b)/i.test(hay)) {
    return 'Meme';
  }
  return 'Other';
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function mcUsd(marketCapSol) {
  return Math.round(Number(marketCapSol ?? 0) * solUsd);
}

/* ---------- candle fetcher (pump.fun proxy + worker-history fallback) ---------- */

const TOTAL_SUPPLY_FOR_PRICE = 1_000_000_000;
const candleCache = new Map(); // key: `${mint}:${tfMin}` -> { t, candles, source }
const CANDLE_TTL_MS = 4000;
const CANDLE_TIMEOUT_MS = 6000;

const CANDLE_HOSTS = [
  'https://frontend-api-v3.pump.fun',
  'https://frontend-api.pump.fun',
];

async function fetchPumpCandles(mint, tfMin) {
  for (const host of CANDLE_HOSTS) {
    const url = `${host}/candlesticks/${encodeURIComponent(mint)}?offset=0&limit=300&timeframe=${tfMin}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CANDLE_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'pumpradar-worker/0.1 (+pumpradar)',
        },
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (!Array.isArray(json) || json.length === 0) continue;
      // pump.fun candle values are SOL price per token (e.g. 0.00000003). Convert
      // them to market-cap USD so it lines up with everything else in the UI.
      const sample = json.find((c) => Number(c?.close) > 0);
      const isSolPrice = sample && Number(sample.close) < 0.001;
      const mul = isSolPrice ? TOTAL_SUPPLY_FOR_PRICE * solUsd : 1;
      const volMul = isSolPrice ? solUsd : 1;
      return json
        .map((c) => ({
          t: Number(c.timestamp || c.t || 0) * (Number(c.timestamp) > 10_000_000_000 ? 1 : 1000),
          open: Number(c.open ?? 0) * mul,
          high: Number(c.high ?? 0) * mul,
          low: Number(c.low ?? 0) * mul,
          close: Number(c.close ?? 0) * mul,
          volume: Number(c.volume ?? 0) * volMul,
        }))
        .filter((c) => c.t > 0 && c.close > 0)
        .sort((a, b) => a.t - b.t);
    } catch {
      // try next host
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function bucketWorkerHistory(history, tfMin) {
  if (!history || history.length === 0) return [];
  const tfMs = Math.max(1000, tfMin * 60_000);
  const buckets = new Map();
  for (const p of history) {
    if (!p || !(p.mc > 0)) continue;
    const bucketT = Math.floor(p.t / tfMs) * tfMs;
    const existing = buckets.get(bucketT);
    if (!existing) {
      buckets.set(bucketT, {
        t: bucketT,
        open: p.mc,
        high: p.mc,
        low: p.mc,
        close: p.mc,
        volume: 0,
      });
    } else {
      if (p.mc > existing.high) existing.high = p.mc;
      if (p.mc < existing.low) existing.low = p.mc;
      existing.close = p.mc;
    }
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

// Map our tfMin -> GeckoTerminal OHLCV parameters.
function gtTfFor(tfMin) {
  if (tfMin >= 60) return { tf: 'hour', aggregate: Math.max(1, Math.round(tfMin / 60)) };
  if (tfMin >= 1) return { tf: 'minute', aggregate: Math.max(1, Math.min(15, Math.round(tfMin))) };
  return { tf: 'minute', aggregate: 1 };
}

const gtPoolCache = new Map(); // mint -> { pool, ts }
const GT_POOL_TTL_MS = 10 * 60_000;

async function findGeckoTerminalPool(mint) {
  const cached = gtPoolCache.get(mint);
  if (cached && Date.now() - cached.ts < GT_POOL_TTL_MS) return cached.pool;
  try {
    const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      gtPoolCache.set(mint, { pool: null, ts: Date.now() });
      return null;
    }
    const j = await r.json();
    const pools = Array.isArray(j?.data) ? j.data : [];
    // Pick pool with highest USD liquidity
    pools.sort((a, b) => Number(b?.attributes?.reserve_in_usd ?? 0) - Number(a?.attributes?.reserve_in_usd ?? 0));
    const pool = pools[0]?.attributes?.address ?? null;
    gtPoolCache.set(mint, { pool, ts: Date.now() });
    return pool;
  } catch {
    gtPoolCache.set(mint, { pool: null, ts: Date.now() });
    return null;
  }
}

async function fetchGeckoTerminalCandles(mint, tfMin) {
  const pool = await findGeckoTerminalPool(mint);
  if (!pool) return [];
  const { tf, aggregate } = gtTfFor(tfMin);
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${tf}?aggregate=${aggregate}&limit=300&currency=usd`,
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) return [];
    const j = await r.json();
    const list = j?.data?.attributes?.ohlcv_list;
    if (!Array.isArray(list) || list.length === 0) return [];
    // GeckoTerminal returns prices in USD per token. Multiply by total supply
    // to surface market-cap, matching the rest of the UI.
    const candles = list
      .map((c) => ({
        t: Number(c[0]) * 1000,
        open: Number(c[1]) * TOTAL_SUPPLY_FOR_PRICE,
        high: Number(c[2]) * TOTAL_SUPPLY_FOR_PRICE,
        low: Number(c[3]) * TOTAL_SUPPLY_FOR_PRICE,
        close: Number(c[4]) * TOTAL_SUPPLY_FOR_PRICE,
        volume: Number(c[5] ?? 0),
      }))
      .filter((c) => c.t > 0 && c.close > 0)
      .sort((a, b) => a.t - b.t);
    return candles;
  } catch {
    return [];
  }
}

async function getCandlesFor(mint, tfMin) {
  const key = `${mint}:${tfMin}`;
  const cached = candleCache.get(key);
  if (cached && Date.now() - cached.t < CANDLE_TTL_MS) return cached;
  let candles = await fetchPumpCandles(mint, tfMin);
  let source = 'pump.fun';
  if (!candles || candles.length === 0) {
    // Pump.fun stops serving candles once a token graduates to PumpSwap/Raydium.
    // GeckoTerminal indexes both, so it's the right fallback for the full lifecycle.
    candles = await fetchGeckoTerminalCandles(mint, tfMin);
    if (candles && candles.length > 0) {
      source = 'geckoterminal';
    } else {
      const st = state.get(mint);
      if (st && st.history && st.history.length > 0) {
        candles = bucketWorkerHistory(st.history, tfMin);
        source = 'worker';
      } else {
        candles = [];
        source = 'none';
      }
    }
  }
  const result = { t: Date.now(), candles, source };
  candleCache.set(key, result);
  return result;
}

function curveProgress(vSolInBondingCurve) {
  return clamp(Number(vSolInBondingCurve ?? 0) / GRADUATION_SOL, 0, 1);
}

/* ---------- token metadata / image ---------- */

function ipfsToHttp(url) {
  if (typeof url !== 'string' || url.length === 0) return null;
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.slice(7).replace(/^ipfs\//, '')}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return null;
}

let metaInFlight = 0;
const META_CONCURRENCY = 16;
const META_TIMEOUT_MS = 4000;

async function fetchTokenImage(uri) {
  const metaUrl = ipfsToHttp(uri);
  if (!metaUrl || metaInFlight >= META_CONCURRENCY) return null;
  metaInFlight += 1;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), META_TIMEOUT_MS);
  try {
    const res = await fetch(metaUrl, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = await res.json();
    return ipfsToHttp(json?.image) ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    metaInFlight -= 1;
  }
}

// initialBuy from the create event is the dev's token amount (UI units).
function devPctFromInitialBuy(initialBuy) {
  const tokens = Number(initialBuy ?? 0);
  if (!Number.isFinite(tokens) || tokens <= 0) return 0;
  return clamp((tokens / TOTAL_SUPPLY) * 100, 0, 100);
}

function riskFromState(devPct, holders, sells, buys) {
  // crude heuristic: high dev holdings + low holders + heavy selling => riskier
  let score = 35 + devPct * 3.5;
  if (holders <= 3) score += 12;
  if (buys + sells > 0 && sells / (buys + sells) > 0.6) score += 12;
  score = Math.round(clamp(score, 5, 95));
  const level = score < 34 ? 'low' : score < 67 ? 'medium' : 'high';
  return { riskScore: score, riskLevel: level };
}

/* ---------- per-token rolling state ---------- */

/**
 * mint -> {
 *   name, symbol, category, imageUrl, createdAt, creatorWallet,
 *   buys, sells, traders:Set<string>, volumeUsd, devPct,
 *   marketCapUsd, priceSol, curve, alertedGraduating,
 *   history: Array<{ t:number, mc:number, curve:number }>
 * }
 */
let totalTradesSeen = 0;
let totalTradesDropped = 0; // trades for mints we don't track (state evicted, etc)
const seenMsgTypes = new Map(); // key: txType/type label -> count
let rawSamplesLogged = 0;
const RAW_SAMPLE_LIMIT = 25;
const recentUpstreamSamples = []; // last N raw upstream messages (string-truncated)
const RECENT_SAMPLE_KEEP = 8;
let upstreamConnectAttempts = 0;
let upstreamLastCloseCode = null;
let upstreamLastCloseReason = null;
let upstreamLastErrorMsg = null;
let upstreamLastConnectedAt = null;
let upstreamLastDisconnectedAt = null;
const startTs = Date.now();

const state = new Map();
const tracked = []; // FIFO of recently-seen mints (normal lifetime)
const trackedSet = new Set();
const promising = []; // FIFO of mints that crossed the "promising" curve; kept longer
const promisingSet = new Set();
const PROMISING_CURVE = 0.4;
const PROMISING_CAP = 60;

/** Reconstruct a frontend-shaped Token from rolling state. */
function snapshotOf(mint) {
  const st = state.get(mint);
  if (!st) return null;
  const holders = st.traders.size;
  const { riskScore, riskLevel } = riskFromState(st.devPct, holders, st.sells, st.buys);
  return {
    mintAddress: mint,
    name: st.name,
    symbol: st.symbol,
    imageUrl: st.imageUrl ?? null,
    creatorWallet: st.creatorWallet ?? '',
    createdAt: st.createdAt,
    graduatedAt: null,
    isComplete: st.curve >= 1,
    category: st.category,
    keywords: [],
    riskScore,
    riskLevel,
    marketCapUsd: st.marketCapUsd,
    priceSol: st.priceSol ?? 0,
    holdersCount: holders,
    bondingCurveProgress: st.curve,
    volume24hUsd: Math.round(st.volumeUsd),
    devHoldingPct: Number(st.devPct.toFixed(1)),
    buys1h: st.buys,
    sells1h: st.sells,
    hasSmartMoney: false,
    isFresh: Date.now() - new Date(st.createdAt).getTime() < 60_000,
  };
}

function dropMint(mint) {
  // only forget a mint once it's out of BOTH lists
  if (trackedSet.has(mint) || promisingSet.has(mint)) return;
  state.delete(mint);
  if (upstream && upstream.readyState === WebSocket.OPEN) {
    try {
      upstream.send(JSON.stringify({ method: 'unsubscribeTokenTrade', keys: [mint] }));
    } catch {}
  }
}

function trackMint(mint) {
  tracked.push(mint);
  trackedSet.add(mint);
  while (tracked.length > MAX_TRACKED) {
    const old = tracked.shift();
    trackedSet.delete(old);
    dropMint(old);
  }
}

function promoteMint(mint) {
  if (promisingSet.has(mint)) return;
  promising.push(mint);
  promisingSet.add(mint);
  while (promising.length > PROMISING_CAP) {
    const old = promising.shift();
    promisingSet.delete(old);
    dropMint(old);
  }
}

/* ---------- browser-facing broadcast hub (HTTP + WebSocket on one port) ---------- */

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/api/waitlist') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2048) req.destroy();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const email = String(payload.email ?? '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) {
          res.writeHead(400, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'invalid email' }));
        }
        await appendWaitlist(email, {
          source: typeof payload.source === 'string' ? payload.source.slice(0, 64) : 'web',
          ua: String(req.headers['user-agent'] ?? '').slice(0, 256),
        });
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.warn('[worker] waitlist write failed:', err.message);
        res.writeHead(500, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'server error' }));
      }
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(
      JSON.stringify({
        ok: true,
        uptimeSec: Math.round((Date.now() - startTs) / 1000),
        clients: wss.clients.size,
        tracked: tracked.length,
        launchHistorySize: launchHistory.size,
        promising: promising.length,
        trades: {
          seen: totalTradesSeen,
          dropped: totalTradesDropped,
          msgTypes: Object.fromEntries(seenMsgTypes),
        },
        upstream: {
          state: upstream?.readyState === WebSocket.OPEN ? 'open' : 'down',
          url: PUMPPORTAL_WS_BASE,
          apiKeyConfigured: Boolean(PUMPPORTAL_API_KEY),
          requiresApiKey: upstreamRequiresApiKey,
          connectAttempts: upstreamConnectAttempts,
          lastCloseCode: upstreamLastCloseCode,
          lastCloseReason: upstreamLastCloseReason,
          lastError: upstreamLastErrorMsg,
          lastConnectedAt: upstreamLastConnectedAt,
          lastDisconnectedAt: upstreamLastDisconnectedAt,
          recentMessages: recentUpstreamSamples,
          hint:
            upstreamRequiresApiKey && !PUMPPORTAL_API_KEY
              ? PUMPPORTAL_API_KEY_RAW
                ? 'PUMPPORTAL_API_KEY is set but looks like a placeholder. Open ~/pumpradar/worker/.env, paste the REAL key from https://pumpportal.fun/trading-api (after funding the generated wallet with 0.02 SOL or more), then `pm2 restart pumpradar-worker`.'
                : 'Trade events are gated. Generate a PumpPortal API key (fund a wallet at https://pumpportal.fun/trading-api with 0.02 SOL or more), put PUMPPORTAL_API_KEY=<the-key> into ~/pumpradar/worker/.env, then `pm2 restart pumpradar-worker`.'
              : null,
        },
        solUsd,
      }),
    );
  }
  const m = req.method === 'GET' && /^\/api\/token\/([^/?]+)/.exec(req.url ?? '');
  if (m) {
    const mint = decodeURIComponent(m[1]);
    const st = state.get(mint);
    res.writeHead(st ? 200 : 404, { 'content-type': 'application/json' });
    return res.end(
      JSON.stringify(
        st ? { found: true, token: snapshotOf(mint), history: st.history } : { found: false },
      ),
    );
  }
  if (req.method === 'GET' && (req.url === '/api/graduating' || (req.url ?? '').startsWith('/api/graduating?'))) {
    const m = /[?&]window=(\d+)([smhd])?/.exec(req.url ?? '');
    let windowMs = 24 * 60 * 60 * 1000; // default 24h
    if (m) {
      const n = Number(m[1]);
      const unit = m[2] ?? 'h';
      const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 3_600_000;
      windowMs = Math.min(GRAD_RETENTION_MS, Math.max(60_000, n * mult));
    }
    const cutoff = Date.now() - windowMs;
    const allEvents = [...graduatingByMint.values()]
      .filter((e) => e.t >= cutoff)
      // Filter on peak MC ever seen so a momentary low reading doesn't
      // exclude a token that genuinely hit graduation territory.
      .filter((e) => Math.max(e.peakMcUsd ?? 0, e.marketCapUsd ?? 0) >= GRAD_MC_FLOOR_USD)
      .sort((a, b) => (b.peakCurve ?? 0) - (a.peakCurve ?? 0));
    // Dedupe clones: same dev relaunching the same symbol shows up as N
    // separate mints with identical metadata. Keep the highest-curve event
    // per (creator, symbol) key.
    const seenCloneKeys = new Set();
    const events = [];
    for (const e of allEvents) {
      const key = `${e.creatorWallet ?? ''}::${(e.symbol ?? '').toLowerCase().trim()}`;
      if (key !== '::' && seenCloneKeys.has(key)) continue;
      seenCloneKeys.add(key);
      events.push(e);
      if (events.length >= 200) break;
    }
    // live overlay: any currently-tracked token >= GRAD_THRESHOLD that
    // hasn't been logged yet (rare race) — append so the list is honest.
    for (const [mint, st] of state) {
      if (graduatingByMint.has(mint)) continue;
      if ((st.curve ?? 0) < GRAD_THRESHOLD) continue;
      if ((st.marketCapUsd ?? 0) < GRAD_MC_FLOOR_USD) continue;
      events.push({
        mint,
        symbol: st.symbol,
        name: st.name,
        category: st.category,
        imageUrl: st.imageUrl ?? null,
        creatorWallet: st.creatorWallet,
        createdAt: st.createdAt,
        t: Date.now(),
        peakCurve: st.curve,
        marketCapUsd: st.marketCapUsd,
      });
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(
      JSON.stringify({
        windowMs,
        sinceWorkerStart: startTs,
        count: events.length,
        events,
      }),
    );
  }
  const tinfo = req.method === 'GET' && /^\/api\/token-info\/([^/?]+)/.exec(req.url ?? '');
  if (tinfo) {
    const mint = decodeURIComponent(tinfo[1]);
    if (!BASE58_RE.test(mint)) {
      res.writeHead(400, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: 'invalid mint' }));
    }
    (async () => {
      try {
        const [pricesMap, pump] = await Promise.all([
          fetchPricesForMints([mint]),
          fetchTokenMeta(mint),
        ]);
        const price = pricesMap.get(mint);
        // DexScreener also returns a pair address for charting — refetch raw
        // so we can hand the frontend a chart-ready URL.
        let pairUrl = null;
        let pairAddress = null;
        let priceChange24h = null;
        let liquidityUsd = null;
        let volume24hUsd = null;
        try {
          const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
            headers: { accept: 'application/json' },
            signal: AbortSignal.timeout(4000),
          });
          if (r.ok) {
            const j = await r.json();
            const pairs = Array.isArray(j?.pairs) ? j.pairs : [];
            pairs.sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0));
            const best = pairs[0];
            if (best) {
              pairUrl = best.url ?? null;
              pairAddress = best.pairAddress ?? null;
              priceChange24h = Number(best.priceChange?.h24 ?? 0);
              liquidityUsd = Number(best.liquidity?.usd ?? 0);
              volume24hUsd = Number(best.volume?.h24 ?? 0);
            }
          }
        } catch {}

        const tracked = state.get(mint);
        const launch = launchHistory.get(mint);
        const snap = tracked ? snapshotOf(mint) : (launch ?? null);

        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            mint,
            name: snap?.name ?? price?.name ?? pump?.name ?? null,
            symbol: snap?.symbol ?? price?.symbol ?? pump?.symbol ?? null,
            imageUrl: snap?.imageUrl ?? price?.imageUrl ?? pump?.imageUrl ?? null,
            description: pump?.description ?? null,
            twitter: pump?.twitter ?? null,
            telegram: pump?.telegram ?? null,
            website: pump?.website ?? null,
            priceUsd: price?.price ?? 0,
            marketCapUsd: snap?.marketCapUsd || price?.marketCapUsd || pump?.marketCapUsd || 0,
            priceChange24h,
            liquidityUsd,
            volume24hUsd,
            pairUrl,
            pairAddress,
            dexscreenerEmbedUrl: pairAddress ? `https://dexscreener.com/solana/${pairAddress}?embed=1&theme=dark&info=0` : null,
            pumpfunUrl: `https://pump.fun/${mint}`,
            solscanUrl: `https://solscan.io/token/${mint}`,
            tracked: Boolean(tracked),
            inLaunchHistory: Boolean(launch),
          }),
        );
      } catch (err) {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    })();
    return;
  }
  // Known wallets registry — list + upsert + delete. Auth via REGISTRY_TOKEN
  // env var. Empty token disables writes (read still allowed for transparency).
  if (req.url === '/api/known-wallets' || (req.url ?? '').startsWith('/api/known-wallets/')) {
    const auth = req.headers['x-registry-token'] ?? '';
    const requireToken = (process.env.REGISTRY_TOKEN ?? '').trim();
    const isAuthed = !requireToken || auth === requireToken;

    if (req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      // Don't expose nothing — return the list. Addresses are public anyway.
      return res.end(JSON.stringify({ wallets: knownWallets, count: Object.keys(knownWallets).length }));
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      if (!isAuthed) {
        res.writeHead(401, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: 'registry token required' }));
      }
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 16_384) req.destroy();
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const addr = String(payload.address ?? '').trim();
          if (!BASE58_RE.test(addr)) {
            res.writeHead(400, { 'content-type': 'application/json' });
            return res.end(JSON.stringify({ error: 'invalid address' }));
          }
          const name = typeof payload.name === 'string' ? payload.name.slice(0, 80) : null;
          const twitter = typeof payload.twitter === 'string'
            ? payload.twitter.replace(/^@/, '').slice(0, 40)
            : null;
          const avatar = typeof payload.avatar === 'string' ? payload.avatar.slice(0, 500) : null;
          knownWallets[addr] = { name, twitter, avatar };
          await saveKnownWallets();
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: true, address: addr, entry: knownWallets[addr] }));
        } catch (err) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
    if (req.method === 'DELETE') {
      if (!isAuthed) {
        res.writeHead(401, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: 'registry token required' }));
      }
      const m = /^\/api\/known-wallets\/([^/?]+)/.exec(req.url ?? '');
      const addr = m ? decodeURIComponent(m[1]) : '';
      if (!addr || !knownWallets[addr]) {
        res.writeHead(404, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: 'not found' }));
      }
      delete knownWallets[addr];
      saveKnownWallets();
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ok: true }));
    }
  }
  if (req.method === 'GET' && req.url === '/api/ticker') {
    (async () => {
      const items = await fetchTicker();
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' });
      res.end(JSON.stringify({ items, cachedAt: tickerCache.ts }));
    })();
    return;
  }
  const wm = req.method === 'GET' && /^\/api\/wallet\/([^/?]+)/.exec(req.url ?? '');
  if (wm) {
    const addr = decodeURIComponent(wm[1]);
    if (!BASE58_RE.test(addr)) {
      res.writeHead(400, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: 'invalid address' }));
    }
    const limitMatch = /[?&]limit=(\d+)/.exec(req.url ?? '');
    const limit = limitMatch ? Math.max(1, Math.min(1000, Number(limitMatch[1]))) : 100;
    const wantHoldings = (req.url ?? '').includes('holdings=1');
    // Known programs / exchanges have millions of signatures — fetching them
    // floods public RPCs and times out. Skip the sigs call for these and
    // serve a lightweight profile so the page still renders something useful.
    const isHeavyEntity = Boolean(KNOWN_ENTITIES[addr]);
    (async () => {
      try {
        const [balance, sigs, holdings, sns, gmgn] = await Promise.all([
          solanaRpc('getBalance', [addr]).catch((err) => {
            console.warn('[worker] getBalance failed:', err.message);
            return null;
          }),
          isHeavyEntity
            ? Promise.resolve([])
            : solanaRpc('getSignaturesForAddress', [addr, { limit }]).catch((err) => {
                console.warn('[worker] getSignaturesForAddress failed:', err.message);
                return [];
              }),
          wantHoldings ? fetchHoldings(addr).catch(() => null) : Promise.resolve(null),
          fetchSnsDomain(addr).catch(() => null),
          // GMGN auto-fetch disabled — their API is Cloudflare-protected and
          // returns 'Host not in allowlist' to every non-browser request.
          // Keep the function definition so a paid proxy can re-enable it
          // by setting GMGN_PROXY_URL, but don't call it by default.
          process.env.GMGN_PROXY_URL ? fetchGmgnProfile(addr).catch(() => null) : Promise.resolve(null),
        ]);
        const safeSigs = Array.isArray(sigs) ? sigs : [];
        const timestamps = safeSigs
          .map((s) => s.blockTime)
          .filter((t) => typeof t === 'number' && t > 0)
          .sort((a, b) => a - b);
        const balanceSol = (balance?.value ?? 0) / 1e9;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            address: addr,
            balanceSol,
            signatureCount: safeSigs.length,
            hasMore: safeSigs.length >= limit,
            windowSize: limit,
            timestamps,
            oldestTs: timestamps[0] ?? null,
            newestTs: timestamps[timestamps.length - 1] ?? null,
            holdings: holdings?.holdings ?? null,
            holdingsTotalUsd: holdings?.totalUsd ?? null,
            holdingsTokenCount: holdings?.tokenCount ?? null,
            solDomain: sns?.primary ?? null,
            solDomains: sns?.all ?? null,
            isHeavyEntity,
            profile: (() => {
              const base = walletProfileFor(addr, sns, gmgn);
              const tags = computeAutoTags({
                balanceSol,
                holdings: holdings?.holdings ?? null,
                signatureCount: safeSigs.length,
                oldestTs: timestamps[0] ?? null,
                newestTs: timestamps[timestamps.length - 1] ?? null,
                hasMore: safeSigs.length >= limit,
              });
              // Surface GMGN PnL/winrate as extra tags even when profile
              // already came from a higher-priority source.
              if (gmgn?.found) {
                if (typeof gmgn.winRate === 'number') {
                  const pct = Math.round(gmgn.winRate * 100);
                  tags.unshift({
                    label: `${pct}% WIN 7D`,
                    color: pct >= 60 ? '#00ff88' : pct >= 40 ? '#ffb547' : '#ff3d5a',
                    desc: `GMGN 7-day win rate: ${pct}%`,
                  });
                }
                if (typeof gmgn.realizedPnl === 'number' && Math.abs(gmgn.realizedPnl) >= 100) {
                  const pos = gmgn.realizedPnl >= 0;
                  const usd =
                    Math.abs(gmgn.realizedPnl) >= 1000
                      ? `$${(gmgn.realizedPnl / 1000).toFixed(1)}K`
                      : `$${Math.round(gmgn.realizedPnl)}`;
                  tags.unshift({
                    label: `${pos ? '+' : ''}${usd} 7D`,
                    color: pos ? '#00ff88' : '#ff3d5a',
                    desc: `GMGN realized P&L 7d: ${pos ? '+' : ''}${usd}`,
                  });
                }
              }
              return { ...(base ?? { source: 'derived', name: null, twitter: null, avatar: null, entity: null }), tags };
            })(),
          }),
        );
      } catch (err) {
        console.warn('[worker] wallet endpoint failed:', err.message);
        // Even on top-level failure, return a minimal object so the frontend
        // doesn't fall back to direct RPC (which 401s in the browser).
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            address: addr,
            balanceSol: 0,
            signatureCount: 0,
            hasMore: false,
            windowSize: limit,
            timestamps: [],
            oldestTs: null,
            newestTs: null,
            holdings: null,
            holdingsTotalUsd: null,
            holdingsTokenCount: null,
            solDomain: null,
            solDomains: null,
            isHeavyEntity,
            warning: err.message,
            profile: walletProfileFor(addr, null) ?? null,
          }),
        );
      }
    })();
    return;
  }
  if (req.method === 'GET' && (req.url === '/api/narratives' || (req.url ?? '').startsWith('/api/narratives?'))) {
    const wm = /[?&]window=(\d+)([smhd])?/.exec(req.url ?? '');
    let windowMs = LAUNCH_HISTORY_MS;
    if (wm) {
      const n = Number(wm[1]);
      const unit = wm[2] ?? 'h';
      const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 3_600_000;
      windowMs = Math.min(LAUNCH_HISTORY_MS, Math.max(60_000, n * mult));
    }
    const cutoff = Date.now() - windowMs;
    pruneLaunchHistory();
    // Merge launchHistory with current `state` snapshots so live tokens carry
    // the freshest metrics; re-classify on read so worker-side rule changes
    // apply to records that were captured under the old rules.
    const byCat = new Map();
    const cloneKeysSeen = new Set();
    let total = 0;
    for (const [mint, hist] of launchHistory) {
      const t = new Date(hist.createdAt).getTime();
      if (t < cutoff) continue;
      const live = snapshotOf(mint);
      const snap = live ?? hist;
      // Drop clones: same dev relaunching same symbol = noise.
      const key = `${snap.creatorWallet ?? ''}::${(snap.symbol ?? '').toLowerCase().trim()}`;
      if (key !== '::' && cloneKeysSeen.has(key)) continue;
      cloneKeysSeen.add(key);
      const cat = categorize(snap.name ?? '', snap.symbol ?? '') || snap.category || 'Other';
      const tagged = { ...snap, category: cat };
      const arr = byCat.get(cat) ?? [];
      arr.push(tagged);
      byCat.set(cat, arr);
      total++;
    }
    const rows = [...byCat.entries()]
      .map(([category, list]) => {
        const sorted = list.slice().sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0));
        return {
          category,
          count: list.length,
          percentage: total > 0 ? Math.round((list.length / total) * 100) : 0,
          tokens: sorted.slice(0, 50),
        };
      })
      .sort((a, b) => b.count - a.count);
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ windowMs, total, rows }));
  }
  const cm = req.method === 'GET' && /^\/api\/candles\/([^/?]+)/.exec(req.url ?? '');
  if (cm) {
    const mint = decodeURIComponent(cm[1]);
    const tfMatch = /[?&]tf=(\d+)/.exec(req.url ?? '');
    const tfMin = tfMatch ? Math.max(1, Math.min(240, Number(tfMatch[1]))) : 1;
    (async () => {
      try {
        const result = await getCandlesFor(mint, tfMin);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ source: result.source, candles: result.candles }));
      } catch (err) {
        console.warn('[worker] candles error:', err.message);
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'upstream failed' }));
      }
    })();
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

const wss = new WebSocketServer({ server: httpServer });
const backfill = []; // ring buffer of recent { type:'token.created', data } envelopes

// 24h rolling launch history for the /api/narratives endpoint. Keyed by mint;
// each entry holds the latest known token snapshot so we can serve a
// category breakdown that survives MAX_TRACKED eviction.
const LAUNCH_HISTORY_MS = 24 * 60 * 60 * 1000;
const LAUNCH_HISTORY_MAX = 20_000;
const LAUNCH_LOG_FILE =
  process.env.LAUNCH_LOG_FILE ?? path.join(os.homedir(), '.pumpradar-launches.jsonl');
const launchHistory = new Map();

// Restore launchHistory from disk on boot so narrative/24h numbers
// don't reset to zero every deploy. File format: one JSON line per launch
// snapshot. Anything older than LAUNCH_HISTORY_MS is dropped on load.
(function loadLaunchHistory() {
  try {
    if (!fs.existsSync(LAUNCH_LOG_FILE)) return;
    const raw = fs.readFileSync(LAUNCH_LOG_FILE, 'utf8');
    const cutoff = Date.now() - LAUNCH_HISTORY_MS;
    let loaded = 0;
    for (const line of raw.split('\n')) {
      if (!line) continue;
      try {
        const snap = JSON.parse(line);
        if (!snap?.mintAddress) continue;
        const t = new Date(snap.createdAt).getTime();
        if (!Number.isFinite(t) || t < cutoff) continue;
        // last write wins (later lines = patches/newer snapshots)
        launchHistory.set(snap.mintAddress, snap);
        loaded++;
      } catch {}
    }
    console.log(`[worker] loaded ${loaded} launches from disk (kept ${launchHistory.size} unique)`);
  } catch (err) {
    console.warn('[worker] failed to load launch history:', err.message);
  }
})();

let launchWriteQueue = Promise.resolve();
function appendLaunchToDisk(snap) {
  launchWriteQueue = launchWriteQueue
    .then(() => fs.promises.appendFile(LAUNCH_LOG_FILE, JSON.stringify(snap) + '\n'))
    .catch((err) => console.warn('[worker] launch log write failed:', err.message));
}

// Periodic rewrite to compact the file (drop expired entries + dedupe).
// Runs every 30 minutes, much less I/O than appending the whole map.
async function compactLaunchLog() {
  try {
    const cutoff = Date.now() - LAUNCH_HISTORY_MS;
    const lines = [];
    for (const snap of launchHistory.values()) {
      const t = new Date(snap.createdAt).getTime();
      if (!Number.isFinite(t) || t < cutoff) continue;
      lines.push(JSON.stringify(snap));
    }
    const tmp = LAUNCH_LOG_FILE + '.tmp';
    await fs.promises.writeFile(tmp, lines.join('\n') + (lines.length ? '\n' : ''));
    await fs.promises.rename(tmp, LAUNCH_LOG_FILE);
  } catch (err) {
    console.warn('[worker] launch log compaction failed:', err.message);
  }
}
setInterval(compactLaunchLog, 30 * 60_000).unref();

function pruneLaunchHistory() {
  const cutoff = Date.now() - LAUNCH_HISTORY_MS;
  for (const [mint, snap] of launchHistory) {
    const t = new Date(snap.createdAt).getTime();
    if (t < cutoff) launchHistory.delete(mint);
  }
  // hard cap to keep memory bounded
  if (launchHistory.size > LAUNCH_HISTORY_MAX) {
    const sorted = [...launchHistory.entries()].sort(
      (a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime(),
    );
    const drop = launchHistory.size - LAUNCH_HISTORY_MAX;
    for (let i = 0; i < drop; i++) launchHistory.delete(sorted[i][0]);
  }
}
setInterval(pruneLaunchHistory, 60_000).unref();

function recordLaunch(token) {
  if (!token || !token.mintAddress) return;
  const snap = { ...token };
  launchHistory.set(token.mintAddress, snap);
  appendLaunchToDisk(snap);
}

function patchLaunchHistory(mint, patch) {
  const cur = launchHistory.get(mint);
  if (!cur) return;
  const next = { ...cur, ...patch };
  launchHistory.set(mint, next);
  // Patches are frequent (every trade). Don't write them line-by-line —
  // the periodic compactLaunchLog will persist current state.
}

function broadcast(envelope) {
  const msg = JSON.stringify(envelope);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
  if (envelope?.type === 'token.created' && envelope.data) {
    recordLaunch(envelope.data);
  } else if (envelope?.type === 'token.updated' && envelope.data?.mintAddress) {
    const { mintAddress, ...patch } = envelope.data;
    patchLaunchHistory(mintAddress, patch);
  }
}

function patchBackfill(mint, patch) {
  for (const env of backfill) {
    if (env.data.mintAddress === mint) Object.assign(env.data, patch);
  }
}

wss.on('connection', (client) => {
  const send = (obj) => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(obj));
  };
  // replay recent launches + any "promising" (near-graduation) tokens so the
  // feed and the graduating page aren't near-empty on first paint
  const seen = new Set();
  for (const env of backfill) {
    seen.add(env.data.mintAddress);
    send(env);
  }
  for (const mint of promising) {
    if (seen.has(mint)) continue;
    const snap = snapshotOf(mint);
    if (snap) send({ type: 'token.created', data: snap });
  }
  client.on('message', (raw) => {
    // the frontend sends {type:'subscribe',...} (ignored — we stream everything)
    // and {type:'get-token', mint} to fetch a single token's snapshot + history.
    let m;
    try {
      m = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (m && m.type === 'get-token' && typeof m.mint === 'string') {
      const st = state.get(m.mint);
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'token.detail',
            mint: m.mint,
            found: Boolean(st),
            data: st ? snapshotOf(m.mint) : null,
            history: st ? st.history : [],
          }),
        );
      }
    }
  });
  client.on('error', () => {});
});

httpServer.listen(PORT, () => {
  console.log(`[worker] http+ws server listening on :${PORT}`);
});

/* ---------- upstream PumpPortal connection ---------- */

let upstream = null;

function handleCreate(d) {
  const vSol = Number(d.vSolInBondingCurve ?? 0);
  const vTok = Number(d.vTokensInBondingCurve ?? 0);
  const name =
    String(d.name ?? '').trim() || String(d.symbol ?? '').trim() || String(d.mint).slice(0, 6);
  const symbol = String(d.symbol ?? '').trim() || '???';
  const devPct = devPctFromInitialBuy(d.initialBuy);
  const marketCapUsd = mcUsd(d.marketCapSol);
  const curve = curveProgress(vSol);

  // Dev's initial buy happens in the create transaction itself — count it so
  // brand-new tokens don't show "0/0 buys/sells" while clearly having a buyer.
  const initialBuyTokens = Number(d.initialBuy ?? 0);
  const initialSol = Number(d.solAmount ?? 0);
  const hasInitialBuy = initialBuyTokens > 0;
  const initialBuys = hasInitialBuy ? 1 : 0;
  const initialVolUsd = hasInitialBuy && initialSol > 0 ? Math.round(initialSol * solUsd) : 0;

  const { riskScore, riskLevel } = riskFromState(devPct, 1, 0, initialBuys);

  const token = {
    mintAddress: d.mint,
    name,
    symbol,
    imageUrl: null,
    creatorWallet: String(d.traderPublicKey ?? ''),
    createdAt: new Date().toISOString(),
    graduatedAt: null,
    isComplete: false,
    category: categorize(name, symbol),
    keywords: [],
    riskScore,
    riskLevel,
    marketCapUsd,
    priceSol: vTok > 0 ? vSol / vTok : 0,
    holdersCount: 1,
    bondingCurveProgress: curve,
    volume24hUsd: initialVolUsd,
    devHoldingPct: Number(devPct.toFixed(1)),
    buys1h: initialBuys,
    sells1h: 0,
    hasSmartMoney: false,
    isFresh: true,
  };

  const env = { type: 'token.created', data: token };
  broadcast(env);
  backfill.push(env);
  if (backfill.length > BACKFILL_SIZE) backfill.shift();

  state.set(d.mint, {
    name,
    symbol,
    category: token.category,
    imageUrl: null,
    createdAt: token.createdAt,
    creatorWallet: token.creatorWallet,
    buys: initialBuys,
    sells: 0,
    traders: new Set(d.traderPublicKey ? [String(d.traderPublicKey)] : []),
    volumeUsd: initialVolUsd,
    devPct,
    marketCapUsd,
    priceSol: token.priceSol,
    curve,
    alertedGraduating: false,
    history: [{ t: Date.now(), mc: marketCapUsd, curve }],
  });
  trackMint(d.mint);
  if (curve >= PROMISING_CURVE) promoteMint(d.mint);

  if (upstream && upstream.readyState === WebSocket.OPEN) {
    // Send the full keys list of every mint we still care about. PumpPortal's
    // subscribeTokenTrade has historically behaved as "replace" in some
    // versions, so defensively re-asserting the whole set on each create keeps
    // every tracked token subscribed.
    const allMints = [...new Set([...tracked, ...promising])];
    try {
      upstream.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: allMints }));
    } catch {}
  }

  // best-effort: resolve the token's image from its metadata URI, then patch
  if (d.uri) {
    fetchTokenImage(d.uri)
      .then((imageUrl) => {
        if (!imageUrl) return;
        const st = state.get(d.mint);
        if (!st) return;
        st.imageUrl = imageUrl;
        broadcast({ type: 'token.updated', data: { mintAddress: d.mint, imageUrl } });
        patchBackfill(d.mint, { imageUrl });
      })
      .catch(() => {});
  }
}

function handleTrade(d) {
  totalTradesSeen += 1;
  const st = state.get(d.mint);
  if (!st) {
    totalTradesDropped += 1;
    return;
  }

  if (d.txType === 'buy') st.buys += 1;
  else st.sells += 1;
  if (d.traderPublicKey) st.traders.add(String(d.traderPublicKey));
  const solAmount = Number(d.solAmount ?? 0);
  if (Number.isFinite(solAmount) && solAmount > 0) st.volumeUsd += solAmount * solUsd;
  st.marketCapUsd = mcUsd(d.marketCapSol);
  st.curve = curveProgress(d.vSolInBondingCurve);
  const vSol = Number(d.vSolInBondingCurve ?? 0);
  const vTok = Number(d.vTokensInBondingCurve ?? 0);
  if (vTok > 0) st.priceSol = vSol / vTok;
  st.history.push({ t: Date.now(), mc: st.marketCapUsd, curve: st.curve });
  if (st.history.length > HISTORY_MAX) st.history.shift();
  if (st.curve >= PROMISING_CURVE) promoteMint(d.mint);
  if (st.curve >= GRAD_THRESHOLD) recordGraduatingEvent(d.mint);

  const holders = st.traders.size; // dev already counted (added on create)
  const { riskScore, riskLevel } = riskFromState(st.devPct, holders, st.sells, st.buys);

  const patch = {
    marketCapUsd: st.marketCapUsd,
    bondingCurveProgress: st.curve,
    holdersCount: holders,
    buys1h: st.buys,
    sells1h: st.sells,
    volume24hUsd: Math.round(st.volumeUsd),
    riskScore,
    riskLevel,
  };
  broadcast({ type: 'token.updated', data: { mintAddress: d.mint, ...patch } });
  patchBackfill(d.mint, patch);

  if (!st.alertedGraduating && st.curve >= GRADUATING_ALERT_THRESHOLD) {
    st.alertedGraduating = true;
    broadcast({
      type: 'alert',
      data: {
        id: `grad-${d.mint}`,
        type: 'about_to_graduate',
        mintAddress: d.mint,
        symbol: st.symbol,
        message: `${Math.round(st.curve * 100)}% bonding curve · about to graduate`,
        walletCount: holders,
        totalSolVolume: Math.round(st.volumeUsd / solUsd),
        createdAt: new Date().toISOString(),
      },
    });
  }
}

function handleMigrate(d) {
  const st = state.get(d.mint);
  broadcast({
    type: 'alert',
    data: {
      id: `mig-${d.signature ?? d.mint ?? Date.now()}`,
      type: 'about_to_graduate',
      mintAddress: d.mint ?? '',
      symbol: st?.symbol ?? String(d.symbol ?? '').trim() ?? '???',
      message: 'Graduated to Raydium 🎓',
      walletCount: st ? st.traders.size : 0,
      totalSolVolume: st ? Math.round(st.volumeUsd / solUsd) : 0,
      createdAt: new Date().toISOString(),
    },
  });
}

function connectUpstream() {
  upstreamConnectAttempts += 1;
  upstream = new WebSocket(PUMPPORTAL_WS, {
    headers: {
      'user-agent': 'Mozilla/5.0 (pumpradar-worker/0.1)',
      origin: 'https://pumpportal.fun',
    },
  });

  upstream.on('open', () => {
    upstreamLastConnectedAt = Date.now();
    console.log('[worker] connected to PumpPortal');
    upstream.send(JSON.stringify({ method: 'subscribeNewToken' }));
    upstream.send(JSON.stringify({ method: 'subscribeMigration' }));
    // On reconnect, re-subscribe to every mint we still track — otherwise the
    // worker silently stops receiving trade events for older tokens.
    const allMints = [...new Set([...tracked, ...promising])];
    if (allMints.length > 0) {
      try {
        upstream.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: allMints }));
        console.log(`[worker] resubscribed to ${allMints.length} tracked mints`);
      } catch (err) {
        console.warn('[worker] resubscribe failed:', err.message);
      }
    }
  });

  upstream.on('message', (raw) => {
    let d;
    try {
      d = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!d || typeof d !== 'object') return;

    // log the first N raw messages verbatim so we can see what PumpPortal sends
    if (rawSamplesLogged < RAW_SAMPLE_LIMIT) {
      rawSamplesLogged += 1;
      console.log(`[upstream raw #${rawSamplesLogged}]`, JSON.stringify(d).slice(0, 600));
    }

    // also keep the last few messages around in memory so /health can return them
    const label = String(d.txType ?? d.type ?? d.method ?? d.event ?? '<none>');
    seenMsgTypes.set(label, (seenMsgTypes.get(label) ?? 0) + 1);
    if (label === '<none>' || recentUpstreamSamples.length < RECENT_SAMPLE_KEEP) {
      recentUpstreamSamples.push({ label, body: JSON.stringify(d).slice(0, 400) });
      while (recentUpstreamSamples.length > RECENT_SAMPLE_KEEP) recentUpstreamSamples.shift();
    }

    // PumpPortal returns this notice when an un-funded client tries trade subscriptions
    if (
      !upstreamRequiresApiKey &&
      typeof d.message === 'string' &&
      /api key/i.test(d.message) &&
      /(subscribeTokenTrade|subscribeAccountTrade)/i.test(d.message)
    ) {
      upstreamRequiresApiKey = true;
      console.warn(
        '[worker] PumpPortal requires a funded API key for trade subscriptions — set PUMPPORTAL_API_KEY. See worker/README.md.',
      );
    }

    if (!d.mint) return;

    // primary handlers (current PumpPortal format)
    if (d.txType === 'create') return void handleCreate(d);
    if (d.txType === 'buy' || d.txType === 'sell') return void handleTrade(d);
    if (d.txType === 'migrate') return void handleMigrate(d);

    // tolerate alternative field names (defensive — in case the upstream renames)
    const txt = (d.type ?? d.event ?? '').toString().toLowerCase();
    if (txt === 'buy' || txt === 'sell') {
      return void handleTrade({ ...d, txType: txt });
    }
    if (typeof d.is_buy === 'boolean' && d.mint) {
      return void handleTrade({ ...d, txType: d.is_buy ? 'buy' : 'sell' });
    }
  });

  upstream.on('close', (code, reason) => {
    upstreamLastCloseCode = code;
    upstreamLastCloseReason = reason ? reason.toString().slice(0, 200) : '';
    upstreamLastDisconnectedAt = Date.now();
    console.warn(
      `[worker] PumpPortal closed code=${code} reason="${upstreamLastCloseReason}"; reconnecting in ${RECONNECT_DELAY_MS}ms`,
    );
    setTimeout(connectUpstream, RECONNECT_DELAY_MS);
  });

  upstream.on('error', (err) => {
    upstreamLastErrorMsg = err.message ? err.message.slice(0, 200) : 'error';
    console.warn('[worker] PumpPortal error:', err.message);
    upstream.close();
  });
}

connectUpstream();

// Safety net: periodically re-send the full subscribeTokenTrade keys list. Even
// if PumpPortal silently drops a per-token subscription, this puts it back.
setInterval(() => {
  if (!upstream || upstream.readyState !== WebSocket.OPEN) return;
  const allMints = [...new Set([...tracked, ...promising])];
  if (allMints.length === 0) return;
  try {
    upstream.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: allMints }));
  } catch {
    // best-effort
  }
}, 15_000);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
