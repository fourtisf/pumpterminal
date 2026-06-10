'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RoastCta(): JSX.Element {
  const [address, setAddress] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!address.trim()) return;
    router.push(`/roast/${encodeURIComponent(address.trim())}`);
  };

  return (
    <div className="mb-7">
      <form
        onSubmit={handleSubmit}
        className="border border-red/30 rounded-md p-4 text-center relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(255, 77, 77, 0.1), rgba(255, 176, 0, 0.05))',
        }}
      >
        <div
          aria-hidden
          className="absolute -top-2 -right-2 text-[60px] opacity-10"
          style={{ transform: 'rotate(15deg)' }}
        >
          🔥
        </div>

        <div className="font-mono text-base font-bold text-text mb-1 tracking-tight">
          <span className="text-red">&gt;</span> Get Roasted
        </div>
        <div className="font-mono text-[10px] text-text-dim mb-3">
          See how badly you trade. Share to flex.
        </div>

        <div className="flex gap-1">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="paste wallet address..."
            className="flex-1 bg-bg border border-border text-text px-2.5 py-2 font-mono text-[10px] rounded-none outline-none focus:border-red"
          />
          <button
            type="submit"
            className="bg-red text-white border-none px-2.5 py-2 font-mono text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition-all duration-100 shadow-[2px_2px_0_0_rgba(255,77,77,0.25)] hover:bg-[#ff5570] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_0_rgba(255,77,77,0.3)] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_0_rgba(255,77,77,0.3)]"
          >
            ROAST
          </button>
        </div>
      </form>
    </div>
  );
}
