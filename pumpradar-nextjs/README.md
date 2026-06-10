# Pump Terminal Web — Next.js 14

Live Feed page converted from HTML prototype to production-ready React components.

## Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode, `noUncheckedIndexedAccess` on)
- **Tailwind CSS** with custom design tokens
- **Zustand** for client state (filters)
- **next/font** with self-hosted fonts (no FOUC)

## Quick Start

```bash
cd pumpradar-web
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000 — redirects to `/live`.

The app runs in **mock mode** by default (no backend needed). New fake tokens stream into the feed every 3-8 seconds. When the ingestion worker is live, set `NEXT_PUBLIC_WS_URL` in `.env.local` and the hook auto-switches.

## Folder Structure

```
pumpradar-web/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── page.tsx                  # Redirects to /live
│   └── live/page.tsx             # Live Feed page composition
├── components/
│   ├── layout/
│   │   ├── Topbar.tsx            # Logo, nav, status pill, wallet btn
│   │   └── TickerTape.tsx        # Scrolling price ticker
│   ├── feed/
│   │   ├── FilterSidebar.tsx     # Left sidebar with all filters
│   │   ├── FeedHeader.tsx        # Title + pause/auto controls
│   │   ├── StatsStrip.tsx        # 4-block aggregate stats
│   │   ├── FeedGrid.tsx          # 2-col grid of token cards
│   │   └── TokenCard.tsx         # Single token card (the workhorse)
│   └── panels/
│       ├── RightPanel.tsx        # Composes the right side
│       ├── NarrativeHeat.tsx     # Category heat bars
│       ├── SmartMoneyAlerts.tsx  # Live smart money alerts feed
│       ├── GraduatingPanel.tsx   # About-to-graduate tokens
│       └── RoastCta.tsx          # Wallet Roast entry CTA
├── hooks/
│   └── use-live-feed.ts          # WebSocket subscription with mock fallback
├── lib/
│   ├── utils.ts                  # Formatters, cn(), helpers
│   ├── filters-store.ts          # Zustand store for feed filters
│   └── mock-data.ts              # Dev fixtures
├── types/
│   └── index.ts                  # Domain types (Token, Trade, etc.)
└── styles/
    └── globals.css               # Tailwind + custom component classes
```

## Design System

CSS variables live in `tailwind.config.ts` under `colors`. The palette is intentionally tight: one dominant accent (`green`), three secondary (`red`, `blue`, `purple`), three tertiary (`amber`, `pink` for category badges). Don't introduce new colors — pick from this list.

**Fonts** are loaded via `next/font` in `app/layout.tsx`:
- `font-display` (Major Mono Display) — logo, page titles
- `font-mono` (JetBrains Mono) — all numbers, data, labels
- `font-sans` (Space Grotesk) — body, UI text

**Component classes** in `globals.css`:
- `.logo-mark` — the animated logo box (reused across topbar + roast cards)
- `.status-dot` — pulsing green dot
- `.badge` + variants (`.badge-ai`, `.badge-meme`, etc.) — category pills

## Adding the Other Pages

The same patterns apply for the other three pages:

| HTML prototype  | Next.js route        | Components to extract |
|-----------------|---------------------|----------------------|
| `landing.html`  | `app/page.tsx` (new) | `<Hero>`, `<Features>`, `<HowItWorks>`, `<PricingGrid>` |
| `token.html`    | `app/token/[mint]/page.tsx` | `<TokenHeader>`, `<PriceChart>`, `<BondingCurveCard>`, `<HoldersTable>`, `<TradesTable>`, `<RiskCard>` |
| `roast.html`    | `app/roast/[address]/page.tsx` | `<RoastInput>`, `<RoastCard>` (use Satori for OG image generation), `<ShareButtons>`, `<ShowcaseGrid>` |

When adding the landing page, change `app/page.tsx` from redirect to the actual landing content.

## Wiring Up the Real Backend

The WebSocket hook lives in `hooks/use-live-feed.ts`. When the ingestion worker exposes a WS endpoint:

1. Set `NEXT_PUBLIC_WS_URL=wss://your-worker.com/ws` in `.env.local`
2. The hook auto-connects, subscribes to `token.created` channel
3. Expects messages in the `WsMessage` shape defined in `types/index.ts`

For paginated/historical data, add API route handlers under `app/api/`:

```ts
// app/api/tokens/route.ts
export async function GET(req: NextRequest) {
  // Query Postgres via Prisma, return JSON
}
```

## Performance Notes

- `<TokenCard>` is memoizable (no internal state except age tick) — wrap in `React.memo` if feed grows past 200 visible items
- Age tick uses 1s `setInterval` per card; for >100 visible cards, lift the timer to the parent and pass `now` down
- Mock mode duplicates seed tokens — fine for dev; the WS path is the real one

## Routes

| Route | Source |
|-------|--------|
| `/` | landing page (hero, features, live signals, pricing teaser) |
| `/live` | live feed + filters + right panel + stats |
| `/trending` | feed ranked by traded volume |
| `/narratives` | category breakdown of the feed |
| `/graduating` | feed filtered to bonding curve ≥ 50% |
| `/token/[mint]` | live token view with market-cap chart (history from worker) |
| `/roast`, `/roast/[address]` | wallet roast — RPC-backed activity + degen index + share |
| `/wallet`, `/wallet/[address]` | wallet lookup — balance, recent tx, activity chart |
| `/pricing` | Free vs Pro, client-side Pro preview toggle, waitlist |
| `/watchlist` | starred tokens (Pro-gated; star comes from each TokenCard) |

When `NEXT_PUBLIC_WS_URL` points at `../worker`, the feed, narrative heat,
graduation panels, alerts, stats, and the other feed-derived pages all switch
from mock to real pump.fun data automatically (the UI tags itself `LIVE` vs
`DEMO`).

## Known TODOs

1. Token detail page is a lightweight live view; the full version (price chart /
   holders table / trades) needs the indexer + DB — see HTML prototype `token.html`
2. `/wallet` and `/roast/[address]` are placeholders — the wallet P&L indexer +
   AI roast generation are a later pipeline phase
3. Auth + Pro tier gates not implemented (Phase 3 per technical spec)
4. `hasTwitter` / `hasTelegram` filters key off `Token.twitterUrl` / `telegramUrl`,
   which neither the mock pool nor the current worker populate — they only start
   matching once the ingestion worker supplies socials (hence both default to `false`)
5. `hasSmartMoney`, true on-chain holder counts, and rolling-window (1h/24h) stats
   need wallet-reputation data + an on-chain indexer; the worker sends neutral
   defaults / best-effort proxies (e.g. unique traders as a holder proxy)
6. "Connect Wallet" is a CTA only — no Solana wallet adapter wired yet
