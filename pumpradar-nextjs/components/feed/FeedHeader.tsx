'use client';

import { cn } from '@/lib/utils';

interface FeedHeaderProps {
  totalLaunches: number;
  smartMoneyBuys: number;
  /** label for the secondary metric (defaults to the demo wording) */
  secondaryLabel?: string;
  /** scope label shown first (defaults to the demo wording) */
  scopeLabel?: string;
  paused: boolean;
  onPauseToggle: (paused: boolean) => void;
  cols: 1 | 2;
  onCycleCols: () => void;
  onExport?: () => void;
}

export function FeedHeader({
  totalLaunches,
  smartMoneyBuys,
  secondaryLabel = 'SMART MONEY BUYS',
  scopeLabel = 'LAST 60 MIN',
  paused,
  onPauseToggle,
  cols,
  onCycleCols,
  onExport,
}: FeedHeaderProps): JSX.Element {
  const handlePause = (): void => {
    onPauseToggle(!paused);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 pb-4 border-b border-border">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-[28px] font-normal tracking-tight mb-1">
          Live <span className="text-green">Feed</span>
        </h1>
        <div className="font-mono text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider flex items-center gap-2 sm:gap-3 flex-wrap">
          <span>{scopeLabel}</span>
          <span className="w-1 h-1 bg-text-muted rounded-full" />
          <span>{totalLaunches.toLocaleString('en-US')} LAUNCHES</span>
          <span className="w-1 h-1 bg-text-muted rounded-full" />
          <span>{smartMoneyBuys} {secondaryLabel}</span>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
        <CtrlButton active={!paused}>
          <span className="status-dot" />
          AUTO
        </CtrlButton>
        <CtrlButton active={paused} onClick={handlePause}>
          {paused ? '▶ RESUME' : '⏸ PAUSE'}
        </CtrlButton>
        <CtrlButton onClick={onCycleCols}>⚙ {cols} COL{cols > 1 ? 'S' : ''}</CtrlButton>
        {onExport && <CtrlButton onClick={onExport}>↓ CSV</CtrlButton>}
      </div>
    </div>
  );
}

function CtrlButton({
  active = false,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'border px-2.5 sm:px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider rounded cursor-pointer transition-all duration-100 inline-flex items-center gap-1.5 whitespace-nowrap',
        active
          ? 'text-green border-green bg-green/[0.05]'
          : 'bg-bg-elev border-border text-text-dim hover:text-text hover:border-border-bright',
      )}
    >
      {children}
    </button>
  );
}
