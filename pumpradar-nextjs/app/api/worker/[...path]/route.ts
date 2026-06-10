import { NextRequest } from 'next/server';

// Server-side worker URL. Defaults to localhost:4000 (when the Next.js app
// and the worker run on the same VPS, which is the standard deployment).
// Override via WORKER_URL=http://... in the frontend's .env if the worker is
// elsewhere.
const WORKER_URL = (process.env.WORKER_URL ?? 'http://localhost:4000').replace(/\/$/, '');

async function proxy(req: NextRequest, ctx: { params: { path: string[] } }): Promise<Response> {
  const pathSegs = ctx.params.path ?? [];
  const search = req.nextUrl.search;
  // Callers pass the full path including the worker's '/api/' prefix
  // (e.g. /api/worker/api/ticker), so we just forward without re-adding it.
  const url = `${WORKER_URL}/${pathSegs.map(encodeURIComponent).join('/')}${search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      accept: req.headers.get('accept') ?? 'application/json',
      'content-type': req.headers.get('content-type') ?? 'application/json',
    },
    cache: 'no-store',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }
  try {
    const res = await fetch(url, init);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'proxy failed' }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const OPTIONS = proxy;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
