import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pump Terminal — pump.fun trading terminal';
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
            'radial-gradient(ellipse at top, rgba(0,255,102,0.18) 0%, #050a07 60%)',
          color: '#d8f0dd',
          fontFamily: 'sans-serif',
        }}
      >
        {/* top row: logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <svg width="84" height="84" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="rim" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00c24e" />
                <stop offset="55%" stopColor="#00ff66" />
                <stop offset="100%" stopColor="#5eead4" />
              </linearGradient>
              <linearGradient id="line" x1="6" y1="22" x2="22" y2="8" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00ff66" />
                <stop offset="100%" stopColor="#5eead4" />
              </linearGradient>
            </defs>
            <rect x="1.4" y="1.4" width="29.2" height="29.2" rx="8.8" fill="#071009" />
            <rect x="1.4" y="1.4" width="29.2" height="29.2" rx="8.8" stroke="url(#rim)" strokeWidth="1.5" />
            <path d="M 6.6 20.8 H 11.6 L 14 23.4 L 21.2 9.2" stroke="url(#line)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="21.2" cy="9.2" r="2" fill="#00ff66" />
            <circle cx="21.2" cy="9.2" r="0.9" fill="#eafff2" />
            <path d="M 23.6 16.2 H 25.6" stroke="#00ff66" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '46px', letterSpacing: '-0.02em', color: '#d8f0dd', fontWeight: 700, display: 'flex' }}>
              PumpTerminal
            </div>
            <div style={{ fontSize: '18px', letterSpacing: '0.25em', color: '#5a6b60', textTransform: 'uppercase' }}>
              pump.fun trading terminal · v0.1
            </div>
          </div>
        </div>

        {/* headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontSize: '84px',
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          >
            Hunt the next <span style={{ color: '#00ff66' }}>100x</span>
            <br />
            before anyone else.
          </div>
          <div style={{ fontSize: '24px', color: '#79917f', letterSpacing: '0.02em', maxWidth: '900px' }}>
            A trading terminal for every pump.fun launch — narrative heat, bonding-curve
            tracker, graduation alerts, wallet roasts. All live. One terminal.
          </div>
        </div>

        {/* bottom row: chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {['● LIVE FEED', 'NARRATIVE HEAT', 'GRADUATION ALERTS', 'WALLET ROAST'].map((label) => (
            <div
              key={label}
              style={{
                padding: '10px 18px',
                border: '1px solid rgba(0,255,102,0.35)',
                color: '#00ff66',
                fontSize: '18px',
                letterSpacing: '0.18em',
              }}
            >
              {label}
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: '20px', color: '#48584c', letterSpacing: '0.18em' }}>
            pumpterminal.click
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
