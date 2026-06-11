'use client';

import { useState } from 'react';
import { CONTRACT_ADDRESS, PUMPFUN_COIN_URL, shortCa } from '@/lib/ca';

/**
 * The official contract-address chip: click the address to copy the full
 * CA (terminal-style COPIED ✓ feedback), or jump straight to pump.fun.
 */
export function CaChip(): JSX.Element {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (http / old browser) — show the full CA instead
      window.prompt('Contract address:', CONTRACT_ADDRESS);
    }
  };

  return (
    <div className="inline-flex items-stretch border border-green/40 bg-green/[0.06] font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-green shadow-[0_0_18px_rgba(0,255,102,0.12)]">
      <button
        type="button"
        onClick={copy}
        title={`${CONTRACT_ADDRESS} — click to copy`}
        className="inline-flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-green/10 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-dot" />
        {copied ? (
          'COPIED ✓'
        ) : (
          <>
            CA&nbsp;·&nbsp;
            <span className="normal-case tracking-normal">{shortCa()}</span>
            &nbsp;⧉
          </>
        )}
      </button>
      <a
        href={PUMPFUN_COIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on pump.fun"
        className="inline-flex items-center px-3 border-l border-green/30 hover:bg-green/10 transition-colors"
      >
        pump.fun ↗
      </a>
    </div>
  );
}
