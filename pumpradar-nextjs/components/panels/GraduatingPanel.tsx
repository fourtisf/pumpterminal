'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { GraduatingToken, Token } from '@/types';
import { MOCK_GRADUATING } from '@/lib/mock-data';

interface GraduatingPanelProps {
  tokens?: Token[];
  live?: boolean;
}

const NEAR_GRADUATION = 0.5;

function computeGraduating(tokens: Token[]): GraduatingToken[] {
  return tokens
    .filter((t) => !t.isComplete && t.bondingCurveProgress >= NEAR_GRADUATION)
    .map((t) => ({ mintAddress: t.mintAddress, symbol: t.symbol, progress: t.bondingCurveProgress }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 6);
}

export function GraduatingPanel({ tokens, live = false }: GraduatingPanelProps): JSX.Element {
  const rows = useMemo(() => {
    if (live && tokens) return computeGraduating(tokens);
    return MOCK_GRADUATING;
  }, [live, tokens]);

  return (
    <div className="mb-7">
      <div className="term-panel-title">
        <span>ABOUT_TO_GRADUATE</span>
        <span className="text-green bg-green/[0.08] border border-green/20 px-1.5 py-0.5 text-[9px]">
          {rows.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="font-mono text-[10px] text-text-muted">No tokens near graduation right now.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((token) => (
            <Link
              key={token.mintAddress}
              href={`/token/${token.mintAddress}`}
              className="block bg-bg-elev border border-border rounded p-2.5 px-3 font-mono cursor-pointer transition-all duration-150 hover:border-green no-underline"
            >
              <div className="flex justify-between mb-1.5 text-[11px]">
                <span className="text-text font-bold">${token.symbol}</span>
                <span className="text-green">{Math.round(token.progress * 100)}%</span>
              </div>
              <div className="h-1 bg-bg-elev-2 rounded-sm overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${token.progress * 100}%`,
                    background: 'linear-gradient(90deg, #00c24e, #00ff66)',
                    boxShadow: '0 0 6px rgba(0,255,102,0.4)',
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
