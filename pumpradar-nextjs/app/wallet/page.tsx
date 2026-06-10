'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { isLikelyAddress } from '@/lib/solana';

export default function WalletPage(): JSX.Element {
  const router = useRouter();
  const [addr, setAddr] = useState('');
  const valid = isLikelyAddress(addr);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!valid) return;
    router.push(`/wallet/${encodeURIComponent(addr.trim())}`);
  };

  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-display text-3xl text-text mb-2 text-center">Wallet Lookup</h1>
        <p className="font-mono text-[11px] text-text-dim text-center mb-6 leading-relaxed">
          Paste any Solana address — balance, recent activity, and an on-chain activity chart from
          the public RPC.
        </p>
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="wallet address…"
            className="flex-1 bg-bg border border-border text-text px-3 py-2 font-mono text-[11px] rounded-none outline-none focus:border-green"
          />
          <button
            type="submit"
            disabled={!valid}
            className="bg-green text-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider rounded-none disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-dim"
          >
            Look up
          </button>
        </form>
        <p className="font-mono text-[10px] text-text-muted mt-4 leading-relaxed">
          Deep per-token P&amp;L, win rate, and a smart-money score need the wallet indexer + DB
          (later pipeline phase). For a roast instead, try{' '}
          <Link href="/roast" className="text-green hover:underline">
            /roast
          </Link>
          .
        </p>
      </main>
    </>
  );
}
