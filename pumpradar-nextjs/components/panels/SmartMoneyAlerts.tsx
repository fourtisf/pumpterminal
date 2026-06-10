'use client';

import Link from 'next/link';
import type { SmartMoneyAlert } from '@/types';
import { formatAge } from '@/lib/utils';
import { MOCK_ALERTS } from '@/lib/mock-data';

interface SmartMoneyAlertsProps {
  alerts?: SmartMoneyAlert[];
  live?: boolean;
}

export function SmartMoneyAlerts({ alerts, live = false }: SmartMoneyAlertsProps): JSX.Element {
  const usingLive = live;
  const rows = usingLive ? (alerts ?? []) : MOCK_ALERTS;
  const title = usingLive ? 'LIVE ALERTS' : 'SMART MONEY ALERTS';

  return (
    <div className="mb-7">
      <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.2em] mb-3 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-green bg-green/[0.08] px-1.5 py-0.5 rounded-none text-[9px]">
          {usingLive ? 'LIVE' : `${rows.length} NEW`}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="font-mono text-[10px] text-text-muted">
          Watching the bonding curves… alerts fire when a token nears graduation.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((alert) => (
            <Link
              key={alert.id}
              href={`/token/${alert.mintAddress}`}
              className="block bg-bg-elev border border-border border-l-2 border-l-purple rounded p-2.5 px-3 font-mono cursor-pointer transition-all duration-150 hover:border-border-bright hover:border-l-purple no-underline"
            >
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-bold text-text">${alert.symbol}</span>
                <span className="text-[9px] text-text-muted">{formatAge(alert.createdAt)} ago</span>
              </div>
              <div className="text-[10px] text-text-dim leading-relaxed">{alert.message}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
