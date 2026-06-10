/**
 * Base URL for worker HTTP calls made from the browser.
 *
 * Production: we proxy through a same-origin Next.js route (/api/worker/*).
 * This avoids mixed-content blocking when the frontend is HTTPS and the
 * worker is plain HTTP on the same VPS — fetches like `${base}/api/wallet/x`
 * become `/api/worker/wallet/x`, which the Next.js handler forwards to the
 * worker server-side over localhost.
 *
 * Returns null only when the frontend is in pure-demo mode (NEXT_PUBLIC_WS_URL
 * not set AND we're rendering server-side without a window object) so callers
 * can skip backend-only features.
 */
export function backendHttpBase(): string | null {
  const ws = process.env.NEXT_PUBLIC_WS_URL;
  // Demo / no-backend mode: nothing to proxy to.
  if (!ws && typeof window === 'undefined') return null;
  if (!ws) return null;
  // We always go through the same-origin proxy. The Next.js route handler
  // resolves the worker URL server-side, so the browser never needs to
  // know about ports or IPs.
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/worker`;
  }
  // SSR: relative path resolved at fetch time.
  return '/api/worker';
}
