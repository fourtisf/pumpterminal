'use client';

import { useTickerPrices } from '@/hooks/use-ticker-prices';

export function TickerTape(): JSX.Element {
  const { items } = useTickerPrices();
  // Double the array for seamless infinite scroll
  const loop = [...items, ...items];

  return (
    <div className="bg-bg-elev border-b border-border h-8 overflow-hidden relative">
      <div className="flex items-center gap-6 sm:gap-8 px-4 sm:px-5 h-full whitespace-nowrap animate-ticker-scroll">
        {loop.map((item, idx) => (
          <span
            key={`${item.sym}-${idx}`}
            className="inline-flex items-center gap-2 font-mono text-[11px] text-text-dim"
          >
            <span className="text-text font-semibold">{item.sym}</span>
            <span>{item.value}</span>
            <span className={item.direction === 'up' ? 'text-green' : 'text-red'}>
              {item.pct}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
