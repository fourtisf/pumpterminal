'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TokenCategory } from '@/types';

export interface CategoryOverride {
  keyword: string;
  category: TokenCategory;
}

interface ProStore {
  isPro: boolean;
  watchlist: string[];
  waitlistEmail: string | null;
  notifyEnabled: boolean;
  overrides: CategoryOverride[];
  trustedCreators: string[];
  enablePreview: () => void;
  disablePreview: () => void;
  toggleWatch: (mint: string) => void;
  isWatched: (mint: string) => boolean;
  joinWaitlist: (email: string) => void;
  setNotifyEnabled: (v: boolean) => void;
  addOverride: (o: CategoryOverride) => void;
  removeOverride: (idx: number) => void;
  addTrustedCreator: (addr: string) => void;
  removeTrustedCreator: (addr: string) => void;
}

export const useProStore = create<ProStore>()(
  persist(
    (set, get) => ({
      isPro: false,
      watchlist: [],
      waitlistEmail: null,
      notifyEnabled: false,
      overrides: [],
      trustedCreators: [],
      enablePreview: () => set({ isPro: true }),
      disablePreview: () => set({ isPro: false }),
      toggleWatch: (mint) =>
        set((s) => ({
          watchlist: s.watchlist.includes(mint)
            ? s.watchlist.filter((m) => m !== mint)
            : [mint, ...s.watchlist].slice(0, 200),
        })),
      isWatched: (mint) => get().watchlist.includes(mint),
      joinWaitlist: (email) => set({ waitlistEmail: email }),
      setNotifyEnabled: (v) => set({ notifyEnabled: v }),
      addOverride: (o) => {
        const keyword = o.keyword.trim().toLowerCase();
        if (!keyword) return;
        set((s) => ({
          overrides: [
            { keyword, category: o.category },
            ...s.overrides.filter((x) => x.keyword !== keyword),
          ].slice(0, 100),
        }));
      },
      removeOverride: (idx) =>
        set((s) => ({ overrides: s.overrides.filter((_, i) => i !== idx) })),
      addTrustedCreator: (addr) => {
        const a = addr.trim();
        if (!a) return;
        set((s) => ({
          trustedCreators: s.trustedCreators.includes(a)
            ? s.trustedCreators
            : [a, ...s.trustedCreators].slice(0, 200),
        }));
      },
      removeTrustedCreator: (addr) =>
        set((s) => ({ trustedCreators: s.trustedCreators.filter((a) => a !== addr) })),
    }),
    { name: 'pumpradar.pro' },
  ),
);

/** Apply user overrides to a token's category. Returns the original if no rule matches. */
export function categoryFor(
  haystack: string,
  fallback: TokenCategory,
  overrides: CategoryOverride[],
): TokenCategory {
  if (!overrides.length) return fallback;
  const h = haystack.toLowerCase();
  for (const o of overrides) if (h.includes(o.keyword)) return o.category;
  return fallback;
}
