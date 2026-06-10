import { ImageResponse } from 'next/og';
import { backendHttpBase } from '@/lib/backend';
import { roastWallet } from '@/lib/roast';
import type { WalletSnapshot } from '@/lib/solana';

export const runtime = 'nodejs';
export const alt = 'Pump Terminal wallet roast';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Params {
  params: { address: string };
}

async function loadSnapshot(address: string): Promise<WalletSnapshot | null> {
  const base = backendHttpBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/wallet/${encodeURIComponent(address)}?limit=100&holdings=1`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as WalletSnapshot & { error?: string };
    if ((json as { error?: string }).error) return null;
    return json;
  } catch {
    return null;
  }
}

function shortAddr(a: string): string {
  return a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
}

export default async function RoastOgImage({ params }: Params): Promise<Response> {
  const address = decodeURIComponent(params.address);
  const snap = await loadSnapshot(address);
  const roast = snap ? roastWallet(snap) : null;

  const tierColor = roast?.tierColor ?? '#ff4d4d';
  const tier = roast?.tier ?? '?';
  const archetype = roast?.archetype ?? 'Unknown';
  const archetypeEmoji = roast?.archetypeEmoji ?? '🔥';
  const degen = roast?.degenScore ?? 0;
  const verdict = roast?.verdict ?? 'Roast pending.';
  const balance = snap ? `${snap.balanceSol.toFixed(2)} SOL` : '—';
  const holdingsUsd = snap?.holdingsTotalUsd ?? 0;
  const pumpfunCount = roast?.pumpfunCount ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px',
          background: `radial-gradient(ellipse at top right, ${tierColor}33, transparent 55%), radial-gradient(ellipse at bottom left, rgba(255,77,77,0.18), transparent 60%), #050a07`,
          color: '#d8f0dd',
          fontFamily: 'monospace',
        }}
      >
        {/* top */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <svg width="48" height="48" viewBox="0 0 32 32">
              <rect x="1.5" y="1.5" width="29" height="29" fill="rgba(0,255,102,0.10)" stroke="#00ff66" strokeWidth="1.6" />
              <path d="M 7 14 L 12.5 18.5 L 7 23" stroke="#00ff66" strokeWidth="2.2" fill="none" />
              <rect x="16" y="20.6" width="8.5" height="3" fill="#00ff66" />
            </svg>
            <div style={{ fontSize: '28px', letterSpacing: '0.06em', fontWeight: 700, display: 'flex' }}>
              PUMP<span style={{ color: '#00ff66' }}>_</span>TERMINAL
            </div>
          </div>
          <div style={{ fontSize: '20px', letterSpacing: '0.2em', color: '#79917f', textTransform: 'uppercase' }}>
            wallet roast
          </div>
        </div>

        {/* center: tier badge + archetype */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '50px', marginTop: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '220px',
              height: '220px',
              borderRadius: '0px',
              border: `6px solid ${tierColor}`,
              background: `${tierColor}15`,
              fontSize: '180px',
              fontWeight: 900,
              color: tierColor,
              fontFamily: 'sans-serif',
              boxShadow: `0 0 80px ${tierColor}66`,
            }}
          >
            {tier}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div style={{ fontSize: '22px', color: '#79917f', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
              {shortAddr(address)}
            </div>
            <div style={{ fontSize: '68px', fontWeight: 700, lineHeight: 1, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span>{archetypeEmoji}</span>
              <span>{archetype}</span>
            </div>
            <div style={{ fontSize: '28px', color: '#d8f0dd', maxWidth: '700px' }}>{verdict}</div>
          </div>
        </div>

        {/* bottom stats */}
        <div style={{ display: 'flex', gap: '14px', marginTop: 'auto' }}>
          {[
            { label: 'Degen index', value: `${degen}/100` },
            { label: 'Balance', value: balance },
            { label: 'Holdings', value: holdingsUsd > 0 ? `$${formatCompact(holdingsUsd)}` : '—' },
            { label: 'PumpFun bags', value: String(pumpfunCount) },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '18px 24px',
                border: '1px solid #16271c',
                background: 'rgba(20,22,26,0.7)',
                borderRadius: '0px',
                flex: 1,
              }}
            >
              <div style={{ fontSize: '14px', color: '#48584c', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#d8f0dd' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', fontSize: '18px', color: '#48584c', letterSpacing: '0.18em' }}>
          <span>pumpterminal.click</span>
          <span>roast your wallet →</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}
