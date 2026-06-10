'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { FilterSidebar } from '@/components/feed/FilterSidebar';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { StatsStrip } from '@/components/feed/StatsStrip';
import { FeedGrid } from '@/components/feed/FeedGrid';
import { RightPanel } from '@/components/panels/RightPanel';
import { useLiveFeed } from '@/hooks/use-live-feed';
import { useWatchAlerts } from '@/hooks/use-watch-alerts';
import { useProStore } from '@/lib/pro-store';
import { downloadCsv, tokensToCsv } from '@/lib/csv';
import { SOCIAL } from '@/lib/social';

export default function LivePage(): JSX.Element {
  const [paused, setPaused] = useState(false);
  const [cols, setCols] = useState<1 | 2>(2);
  const [view, setView] = useState<'cards' | 'rows'>('cards');
  const { tokens, alerts, live } = useLiveFeed({ paused });
  useWatchAlerts(tokens);
  const isPro = useProStore((s) => s.isPro);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem('pt.feedview');
    if (saved === 'rows' || saved === 'cards') setView(saved);
  }, []);

  const toggleView = (): void => {
    setView((v) => {
      const next = v === 'cards' ? 'rows' : 'cards';
      window.localStorage.setItem('pt.feedview', next);
      return next;
    });
  };

  const handleExport = (): void => {
    if (tokens.length === 0) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCsv(`pumpterminal-feed-${stamp}.csv`, tokensToCsv(tokens));
  };

  return (
    <>
      <Topbar />
      <TickerTape />

      <main className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_320px] min-h-[calc(100vh-88px)]">
        <FilterSidebar tokens={tokens} />

        <section className="p-4 sm:p-6 min-w-0">
          <FeedHeader
            totalLaunches={live ? tokens.length : 2847}
            smartMoneyBuys={live ? alerts.length : 34}
            secondaryLabel={live ? 'GRADUATION ALERTS' : 'SMART MONEY BUYS'}
            scopeLabel={live ? 'LIVE · PUMPFUN' : 'LAST 60 MIN'}
            paused={paused}
            onPauseToggle={setPaused}
            cols={cols}
            onCycleCols={() => setCols((c) => (c === 1 ? 2 : 1))}
            view={view}
            onToggleView={toggleView}
            onExport={mounted && isPro ? handleExport : undefined}
          />
          <StatsStrip tokens={tokens} live={live} />
          <FeedGrid tokens={tokens} cols={cols} view={view} loading={live && tokens.length === 0} />
        </section>

        <RightPanel tokens={tokens} alerts={alerts} live={live} />
      </main>

      <footer className="border-t border-border bg-bg-elev py-2 px-5 font-mono text-[9px] text-text-muted flex items-center justify-between gap-3 uppercase tracking-wider">
        <span>PUMP_TERMINAL · MAINNET BETA</span>
        <span className="hidden md:inline">NOT FINANCIAL ADVICE · TRADE AT YOUR OWN RISK</span>
        <a
          href={SOCIAL.x.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-green whitespace-nowrap"
          aria-label="Pump Terminal on X"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18.244 2H21l-6.52 7.45L22 22h-6.84l-4.78-6.27L4.8 22H2l7-8L1.5 2H8.5l4.32 5.71L18.244 2zm-2.4 18h1.74L7.24 4H5.36l10.484 16z" />
          </svg>
          {SOCIAL.x.handle}
        </a>
      </footer>
    </>
  );
}
