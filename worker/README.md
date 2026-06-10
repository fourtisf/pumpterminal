# PumpRadar Worker — live data bridge

Minimal ingestion worker that turns the mock feed into a **real** one, with no
database. New-launch + migration events are free; trade events need a small
PumpPortal API key (see "PumpPortal API key" below).

```
PumpPortal public stream  ──▶  this worker  ──▶  browser (Next.js live feed)
   (new tokens + trades)        maps to WsMessage      ws://<host>:4000
```

It subscribes to [PumpPortal](https://pumpportal.fun/data-api/real-time)'s free
WebSocket (`subscribeNewToken`, per-token `subscribeTokenTrade`, `subscribeMigration`),
maps each event to the `WsMessage` shape in `../pumpradar-nextjs/types/index.ts`,
and rebroadcasts to every connected browser. New clients get the last ~30 launches
replayed so the feed is never empty.

It also runs a small HTTP server on the same port:

- `GET /health` — JSON status (clients, tracked tokens, upstream state, SOL/USD)
- `GET /api/token/:mint` — snapshot + market-cap history for one token

…and over the WS, a client can send `{"type":"get-token","mint":"…"}` to get a
`token.detail` reply (`{ data: Token, history: [{t,mc,curve}, …] }`) — that's what
powers the per-token chart on `/token/[mint]`.

## Run locally

```bash
cd worker
cp .env.example .env          # optional; defaults are fine
pnpm install                  # or: npm install
pnpm start                    # listens on ws://0.0.0.0:4000
```

## Run on the VPS (alongside the web app, with pm2)

```bash
cd ~/pumpradar/worker
pnpm install
pm2 start npm --name pumpradar-worker -- start      # or: pm2 start src/index.js --name pumpradar-worker
pm2 save
```

Open the port:

```bash
ufw allow 4000/tcp    # only if ufw is active; also open it in your VPS provider's firewall
```

## Point the web app at it

`NEXT_PUBLIC_WS_URL` is inlined at **build time**, so set it before rebuilding:

```bash
cd ~/pumpradar/pumpradar-nextjs
echo 'NEXT_PUBLIC_WS_URL=ws://<YOUR_VPS_IP>:4000' > .env.local
./node_modules/.bin/next build
pm2 restart pumpradar
```

Now the live feed streams real pump.fun launches. Leave `.env.local` empty (or
unset) to fall back to mock mode.

> If you later put the site behind HTTPS, the browser will block `ws://` from an
> `https://` page — terminate TLS for the worker too (e.g. nginx `proxy_pass` on a
> `wss://` location) and use `NEXT_PUBLIC_WS_URL=wss://...`.

## PumpPortal API key (for trade events)

PumpPortal gates `subscribeTokenTrade` and `subscribeAccountTrade` behind a
funded API key — without it, the worker still gets new-launch and migration
events, but every token's buys / sells counter stays at "1 / 0 since launch"
(just the dev's initial buy) and per-token charts only have the create tick.

To turn trades on:

1. Open <https://pumpportal.fun/trading-api> in a browser.
2. Generate a wallet (or paste your own) — pump.fun's flow walks you through.
3. Fund that wallet with **0.02 SOL or more** (~$2 at current prices). One-time minimum.
4. Copy the **real** API key shown after funding clears (it's a long random string —
   not the literal text `<paste-key-here>`).
5. Put it in `worker/.env` and restart:

```bash
# IMPORTANT: replace REAL_KEY_FROM_PUMPPORTAL with the actual key string.
# Do NOT keep the angle-bracket placeholder.
nano ~/pumpradar/worker/.env
#    add:  PUMPPORTAL_API_KEY=REAL_KEY_FROM_PUMPPORTAL
pm2 restart pumpradar-worker
curl -s http://localhost:4000/health | python3 -m json.tool
```

The worker auto-loads `worker/.env` at startup — no `--update-env` needed.

Verify in `/health`:

- `upstream.apiKeyConfigured: true`
- `upstream.requiresApiKey: false`
- `trades.seen` starts climbing within seconds

If `apiKeyConfigured: false` keeps showing up after edit + restart, run
`cat ~/pumpradar/worker/.env` — the `PUMPPORTAL_API_KEY=` line must contain
the real key, not the placeholder. Placeholder values (anything with `<`, `>`,
"paste", or "your-key") are rejected on purpose.

## What it does / doesn't do

- **Does:** real-time `token.created`; live `token.updated` for recently-seen
  tokens — market cap, bonding-curve %, buy/sell counts, unique-trader count
  (holders proxy), cumulative volume, and a derived risk score; dev-holding %
  estimated from the creator's initial buy; a naive keyword categorizer;
  "about to graduate" + "graduated" alerts; per-token state eviction +
  `unsubscribeTokenTrade` so memory stays bounded; auto-reconnect; SOL/USD
  refresh from CoinGecko; best-effort token image resolution from the metadata
  URI (patched in via a follow-up `token.updated`).
- **Doesn't (yet):** true on-chain holder counts, smart-money / KOL wallet
  tagging, time-windowed (rolling 1h/24h) stats, historical/paginated data,
  persistence. Those need the full pipeline (Helius +
  Postgres + Redis) from the technical spec. Fields the stream can't provide are
  sent as neutral defaults rather than fabricated numbers.
