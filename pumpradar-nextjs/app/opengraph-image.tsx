import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PumpRadar — Live PumpFun Intelligence';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage(): Response {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '70px',
          background:
            'radial-gradient(ellipse at top, rgba(0,255,136,0.18) 0%, #0a0b0d 60%)',
          color: '#e8eaed',
          fontFamily: 'monospace',
        }}
      >
        {/* top row: logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <svg width="84" height="84" viewBox="0 0 32 32">
            <rect
              x="1.25"
              y="1.25"
              width="29.5"
              height="29.5"
              rx="7"
              fill="rgba(0,255,136,0.10)"
              stroke="#00ff88"
              strokeWidth="1.6"
            />
            <path
              d="M 16 4.5 A 11.5 11.5 0 0 1 27.5 16"
              stroke="#00ff88"
              strokeWidth="1.3"
              strokeOpacity="0.4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 16 9 A 7 7 0 0 1 23 16"
              stroke="#00ff88"
              strokeWidth="1.3"
              strokeOpacity="0.7"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="16" cy="16" r="2.4" fill="#00ff88" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '46px', letterSpacing: '0.06em', color: '#e8eaed', fontWeight: 700 }}>
              PUMPRADAR
            </div>
            <div style={{ fontSize: '18px', letterSpacing: '0.25em', color: '#4a525c', textTransform: 'uppercase' }}>
              live pumpfun intelligence · v0.1
            </div>
          </div>
        </div>

        {/* headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontSize: '88px',
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontFamily: 'sans-serif',
            }}
          >
            Hunt the next <span style={{ color: '#00ff88' }}>100x</span>
            <br />
            before anyone else.
          </div>
          <div style={{ fontSize: '24px', color: '#8a929c', letterSpacing: '0.02em', maxWidth: '900px' }}>
            Real-time radar for every pump.fun launch — narrative heat, bonding-curve tracker,
            graduation alerts, wallet roasts. All live. One terminal.
          </div>
        </div>

        {/* bottom row: chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {['● LIVE FEED', 'NARRATIVE HEAT', 'GRADUATION ALERTS', 'WALLET ROAST'].map((label) => (
            <div
              key={label}
              style={{
                padding: '10px 18px',
                border: '1px solid rgba(0,255,136,0.35)',
                color: '#00ff88',
                fontSize: '18px',
                letterSpacing: '0.18em',
                borderRadius: '6px',
              }}
            >
              {label}
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '20px', color: '#4a525c', letterSpacing: '0.18em' }}>
            pumpradar.click
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
