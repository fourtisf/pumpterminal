import type { SmartMoneyAlert, Token } from '@/types';
import { NarrativeHeat } from './NarrativeHeat';
import { SmartMoneyAlerts } from './SmartMoneyAlerts';
import { GraduatingPanel } from './GraduatingPanel';
import { RoastCta } from './RoastCta';

interface RightPanelProps {
  tokens?: Token[];
  alerts?: SmartMoneyAlert[];
  live?: boolean;
}

export function RightPanel({ tokens, alerts, live = false }: RightPanelProps): JSX.Element {
  return (
    <aside className="hidden xl:block border-l border-border bg-bg p-5 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto">
      <NarrativeHeat tokens={tokens} live={live} />
      <SmartMoneyAlerts alerts={alerts} live={live} />
      <GraduatingPanel tokens={tokens} live={live} />
      <RoastCta />
    </aside>
  );
}
