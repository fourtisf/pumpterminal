'use client';

import { useMemo } from 'react';
import type { NarrativeStat, Token } from '@/types';
import { getCategoryColor } from '@/lib/utils';
import { MOCK_NARRATIVES } from '@/lib/mock-data';

interface NarrativeHeatProps {
  tokens?: Token[];
  live?: boolean;
}

function computeNarratives(tokens: Token[]): NarrativeStat[] {
  const counts = new Map<Token['category'], number>();
  for (const t of tokens) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  const total = tokens.length || 1;
  return [...counts.entries()]
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / total) * 100),
      colorVar: getCategoryColor(category),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function NarrativeHeat({ tokens, live = false }: NarrativeHeatProps): JSX.Element {
  const narratives = useMemo(() => {
    if (live && tokens && tokens.length > 0) return computeNarratives(tokens);
    return MOCK_NARRATIVES;
  }, [live, tokens]);

  const maxPct = Math.max(1, ...narratives.map((n) => n.percentage));

  return (
    <PanelSection title="NARRATIVE HEAT · LIVE FEED" count={live ? 'LIVE' : 'DEMO'}>
      {narratives.length === 0 ? (
        <div className="font-mono text-[10px] text-text-muted">Waiting for launches…</div>
      ) : (
        <div className="flex flex-col gap-2">
          {narratives.map((narrative) => (
            <div
              key={narrative.category}
              className="flex items-center gap-2.5 font-mono text-[11px]"
            >
              <span className="w-[60px] text-text-dim">{narrative.category}</span>
              <div className="flex-1 h-2 bg-bg-elev rounded-sm overflow-hidden relative">
                <div
                  className="h-full rounded-sm transition-[width] duration-700"
                  style={{
                    width: `${Math.max(4, (narrative.percentage / maxPct) * 100)}%`,
                    background: narrative.colorVar,
                  }}
                />
              </div>
              <span className="w-9 text-right text-text font-semibold">
                {narrative.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelSection>
  );
}

function PanelSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mb-7">
      <div className="font-mono text-[10px] text-text-muted uppercase tracking-[0.2em] mb-3 flex items-center justify-between">
        <span>{title}</span>
        {count && (
          <span className="text-green bg-green/[0.08] px-1.5 py-0.5 rounded-[3px] text-[9px]">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
