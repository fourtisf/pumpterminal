import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';

export default function ApiDocsPage(): JSX.Element {
  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.3em] mb-2">
          worker endpoints · v0.1
        </div>
        <h1 className="font-sans text-3xl font-semibold tracking-tight mb-3">
          The <span className="text-green">API</span>.
        </h1>
        <p className="font-mono text-[12px] text-text-dim leading-relaxed mb-8">
          The Pump Terminal worker exposes the same HTTP + WebSocket surface the web app uses. Open
          during beta — no auth, no rate limits, expect occasional breakage. Set <code className="text-text">NEXT_PUBLIC_WS_URL</code>
          {' '}to your own worker for full control.
        </p>

        <Endpoint
          method="GET"
          path="/health"
          desc="liveness + small counters."
          example={`curl ws://host:4000/health   # well, http:
curl http://host:4000/health
# → { ok: true, clients, tracked, promising, upstream, solUsd }`}
        />

        <Endpoint
          method="GET"
          path="/api/token/:mint"
          desc="full snapshot + bounded market-cap history for one token. 404 if it has rolled out of the worker's window."
          example={`curl http://host:4000/api/token/<MINT>
# → { found: true, token: Token, history: [{ t, mc, curve }, …] }`}
        />

        <Endpoint
          method="POST"
          path="/api/waitlist"
          desc="capture an email for the Pro waitlist. Stored to a flat file on the worker."
          example={`curl -X POST http://host:4000/api/waitlist \\
  -H 'content-type: application/json' \\
  -d '{"email":"you@example.com"}'
# → { ok: true }`}
        />

        <Endpoint
          method="WS"
          path="/"
          desc="upgrades to a WebSocket. On connect, the worker replays its recent-launch backfill + any near-graduation tokens, then streams events live."
          example={`# events the server pushes:
{ type: 'token.created', data: Token }
{ type: 'token.updated', data: Partial<Token> & { mintAddress } }
{ type: 'alert',          data: SmartMoneyAlert }
{ type: 'token.detail',   mint, data, history }   // reply to get-token

# messages the client may send:
{ type: 'subscribe', channel: 'token.created' }   // currently a no-op (everything is streamed)
{ type: 'get-token', mint: '<MINT>' }             // request detail + history`}
        />

        <div className="mt-10 bg-bg-elev border border-amber/30 rounded-lg p-5">
          <div className="font-mono text-[10px] text-amber uppercase tracking-[0.2em] mb-2">
            roadmap
          </div>
          <p className="font-mono text-[11px] text-text-dim leading-relaxed">
            Pro will add API keys + per-account rate limits + endpoints for historical queries
            (graduations, top wallets, narrative time-series). All of that needs the indexer + DB
            phase. Join the waitlist on{' '}
            <Link href="/pricing" className="text-green hover:underline">
              /pricing
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  );
}

function Endpoint({
  method,
  path,
  desc,
  example,
}: {
  method: string;
  path: string;
  desc: string;
  example: string;
}): JSX.Element {
  const accent =
    method === 'GET'
      ? 'text-green border-green/40 bg-green/10'
      : method === 'POST'
        ? 'text-amber border-amber/40 bg-amber/10'
        : 'text-blue border-blue/40 bg-blue/10';
  return (
    <div className="mb-6 bg-bg-elev border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${accent}`}
        >
          {method}
        </span>
        <code className="font-mono text-[13px] text-text">{path}</code>
      </div>
      <p className="font-mono text-[11px] text-text-dim leading-relaxed mb-3">{desc}</p>
      <pre className="font-mono text-[11px] text-text-dim bg-bg border border-border rounded p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {example}
      </pre>
    </div>
  );
}
