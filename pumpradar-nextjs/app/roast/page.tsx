import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { TickerTape } from '@/components/layout/TickerTape';
import { RoastCta } from '@/components/panels/RoastCta';

export default function RoastPage(): JSX.Element {
  return (
    <>
      <Topbar />
      <TickerTape />
      <main className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-display text-3xl text-text mb-2 text-center">Wallet Roast</h1>
        <p className="font-mono text-[11px] text-text-dim text-center mb-6">
          Paste a wallet, get roasted on how badly it trades.
        </p>
        <RoastCta />
        <Link href="/live" className="block text-center mt-2 font-mono text-[11px] text-green hover:underline">
          ← Back to Live Feed
        </Link>
      </main>
    </>
  );
}
