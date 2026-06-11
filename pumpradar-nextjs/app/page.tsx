import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { CaChip } from '@/components/CaChip';
import { LandingLive } from '@/components/landing/LandingLive';
import { LivePreview } from '@/components/landing/LivePreview';
import { SOCIAL } from '@/lib/social';

interface Feature {
  title: string;
  tag: string;
  body: string;
  icon: string;
  accent: 'green' | 'pink' | 'amber' | 'red' | 'purple' | 'blue';
}

const ACCENT_BG: Record<Feature['accent'], string> = {
  green: 'bg-green/10 border-green/30 text-green',
  pink: 'bg-pink/10 border-pink/30 text-pink',
  amber: 'bg-amber/10 border-amber/30 text-amber',
  red: 'bg-red/10 border-red/30 text-red',
  purple: 'bg-purple/10 border-purple/30 text-purple',
  blue: 'bg-blue/10 border-blue/30 text-blue',
};

const FEATURES: Feature[] = [
  {
    title: 'Real-time launch feed',
    tag: 'sub-second · websocket',
    body: 'Every pump.fun token, the moment it hits the chain. No polling, no refresh.',
    icon: '▶',
    accent: 'green',
  },
  {
    title: 'Narrative heat',
    tag: 'auto-classified',
    body: 'AI, animal, political, celebrity, tech — see which narrative is pumping right now.',
    icon: '◆',
    accent: 'pink',
  },
  {
    title: 'Bonding curve tracker',
    tag: 'graduation alerts',
    body: 'Watch every token climb its curve. Auto-alert at 80% so you exit before the dump.',
    icon: '▲',
    accent: 'amber',
  },
  {
    title: 'Risk + dev holding',
    tag: 'derived on-chain',
    body: 'Dev holding from the initial buy. Risk score from holders, dev %, sell pressure.',
    icon: '■',
    accent: 'red',
  },
  {
    title: 'Wallet roast',
    tag: 'shareable',
    body: 'Paste a wallet → degen index + activity chart + a burn card built for X.',
    icon: '◎',
    accent: 'purple',
  },
  {
    title: 'Per-token chart',
    tag: 'live history',
    body: 'Market-cap chart per token, backfilled from the worker and appended as trades land.',
    icon: '≡',
    accent: 'blue',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Open the feed',
    body: 'No signup, no wallet connect. Land on /live, the firehose is already flowing.',
  },
  {
    n: '02',
    title: 'Spot the pattern',
    body: 'Filter by narrative, sort by volume, watch the bonding curves climb in real time.',
  },
  {
    n: '03',
    title: 'Move first',
    body: 'Click through to pump.fun, ape with conviction — or panic, same outcome, faster.',
  },
];

export default function HomePage(): JSX.Element {
  return (
    <>
      <Topbar />
      <TickerTape />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,255,102,0.12) 0%, transparent 70%)',
          }}
        />
        <div aria-hidden className="grid-horizon" />
        <div className="relative max-w-4xl mx-auto px-5 pt-20 pb-12 text-center">
          <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.3em] mb-4">
            <span className="type-in">pump.fun trading terminal · v0.1</span>
          </div>
          <h1 className="rise rise-1 font-display font-extrabold text-5xl sm:text-[68px] tracking-[-0.03em] leading-[1.04]">
            Hunt the next{' '}
            <span className="text-green glow-green phosphor-flicker">100x</span>
            <br />
            before anyone else.
          </h1>
          <p className="rise rise-2 mt-6 font-mono text-[13px] text-text-dim max-w-xl mx-auto leading-relaxed">
            A trading terminal for every pump.fun launch. Narrative heat, bonding-curve tracker,
            graduation alerts, wallet roasts. All live. One terminal.
          </p>

          <div className="rise rise-3 mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/live" className="btn-term px-5 py-2.5 text-[12px]">
              ▶ Open the live feed
            </Link>
            <Link
              href="/pricing"
              className="border border-border-bright text-text px-5 py-2.5 font-mono text-[12px] uppercase tracking-wider rounded hover:border-green hover:text-green hover:shadow-[0_0_20px_rgba(0,255,102,0.12)] transition-all duration-150"
            >
              See pricing
            </Link>
          </div>

          <div className="rise rise-3 mt-5 flex justify-center">
            <CaChip />
          </div>

          {/* terminal window — real launches streaming above the fold */}
          <LandingLive />
        </div>
      </section>

      {/* LIVE PREVIEW — actual cards from the feed */}
      <LivePreview />

      {/* FEATURES */}
      <section className="max-w-5xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.3em] mb-2">
            what&apos;s in the box
          </div>
          <h2 className="font-sans text-3xl sm:text-4xl font-semibold tracking-tight">
            Built for traders who <span className="text-green">refresh F5</span>.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative bg-bg-elev border border-border rounded-lg p-5 transition-all duration-200 hover:border-border-bright hover:-translate-y-px"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-md flex items-center justify-center text-xl border ${ACCENT_BG[f.accent]} flex-shrink-0`}
                >
                  {f.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-sans text-[15px] font-semibold text-text leading-tight">
                    {f.title}
                  </div>
                  <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.15em] mt-1">
                    {f.tag}
                  </div>
                </div>
              </div>
              <p className="font-mono text-[11px] text-text-dim leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-5 pb-20">
        <div className="text-center mb-12">
          <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.3em] mb-2">
            how it works
          </div>
          <h2 className="font-sans text-3xl sm:text-4xl font-semibold tracking-tight">
            Three clicks from <span className="text-green">cold</span> to{' '}
            <span className="text-green">cooking</span>.
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="bg-bg-elev border border-border rounded-lg p-5 relative overflow-hidden hover:border-border-bright transition-colors"
            >
              <div className="font-display text-[64px] text-green/10 absolute -top-3 -right-1 select-none leading-none">
                {s.n}
              </div>
              <div className="relative">
                <div className="font-mono text-[9px] text-green uppercase tracking-[0.2em] mb-2">
                  step {s.n}
                </div>
                <div className="font-sans text-[15px] font-semibold text-text mb-2 leading-tight">
                  {s.title}
                </div>
                <p className="font-mono text-[11px] text-text-dim leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="max-w-3xl mx-auto px-5 pb-20 text-center">
        <div
          className="border border-green/30 rounded-lg p-8 relative overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(0,255,102,0.06) 0%, transparent 60%)',
          }}
        >
          <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.3em] mb-2">
            pro · early access
          </div>
          <h2 className="font-sans text-3xl font-semibold tracking-tight mb-3">
            Watchlists. Alerts. <span className="text-green">Edge.</span>
          </h2>
          <p className="font-mono text-[12px] text-text-dim leading-relaxed max-w-md mx-auto">
            Free is generous. Pro is unfair. Telegram alerts, smart-money tags, the API, no rate
            limits. <span className="text-amber">$9/mo for the first 100 traders.</span>
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/pricing"
              className="bg-amber text-black px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-wider rounded hover:brightness-110 hover:shadow-[0_0_16px_rgba(255,176,0,0.35)]"
            >
              ▶ See what&apos;s in Pro
            </Link>
            <Link href="/live" className="font-mono text-[11px] text-text-dim hover:text-green">
              or just try the free feed
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-bg-elev py-6 px-5 font-mono text-[10px] text-text-muted uppercase tracking-wider">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <span>PumpTerminal · v0.1 · mainnet beta</span>
          <span className="text-text-muted">not financial advice · trade at your own risk</span>
          <div className="flex items-center gap-4">
            <Link href="/live" className="hover:text-green">live</Link>
            <Link href="/pricing" className="hover:text-green">pricing</Link>
            <Link href="/roast" className="hover:text-green">roast</Link>
            <a
              href={SOCIAL.x.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-green"
              aria-label="Pump Terminal on X"
              title={SOCIAL.x.handle}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2H21l-6.52 7.45L22 22h-6.84l-4.78-6.27L4.8 22H2l7-8L1.5 2H8.5l4.32 5.71L18.244 2zm-2.4 18h1.74L7.24 4H5.36l10.484 16z" />
              </svg>
              {SOCIAL.x.handle}
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
