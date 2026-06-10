import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PUMP TERMINAL — pump.fun trading terminal';
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
          fontFamily: 'monospace',
        }}
      >
        {/* top row: logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <svg width="84" height="84" viewBox="0 0 32 32">
            <rect
              x="1.5"
              y="1.5"
              width="29"
              height="29"
              fill="rgba(0,255,102,0.10)"
              stroke="#00ff66"
              strokeWidth="1.6"
            />
            <line x1="1.5" y1="8.5" x2="30.5" y2="8.5" stroke="#00ff66" strokeOpacity="0.4" strokeWidth="1" />
            <rect x="4" y="4.2" width="2" height="2" fill="#00ff66" fillOpacity="0.9" />
            <rect x="7.5" y="4.2" width="2" height="2" fill="#00ff66" fillOpacity="0.45" />
            <path d="M 7 14 L 12.5 18.5 L 7 23" stroke="#00ff66" strokeWidth="2.2" fill="none" />
            <rect x="16" y="20.6" width="8.5" height="3" fill="#00ff66" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '46px', letterSpacing: '0.06em', color: '#d8f0dd', fontWeight: 700, display: 'flex' }}>
              PUMP<span style={{ color: '#00ff66' }}>_</span>TERMINAL<span style={{ color: '#00ff66' }}>▌</span>
            </div>
            <div style={{ fontSize: '18px', letterSpacing: '0.25em', color: '#48584c', textTransform: 'uppercase' }}>
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
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontFamily: 'monospace',
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
