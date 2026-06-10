import { create } from 'zustand';
import type { FeedFilters } from '@/types';

interface FiltersStore extends FeedFilters {
  setSortBy: (sort: FeedFilters['sortBy']) => void;
  setCategory: (cat: FeedFilters['category']) => void;
  setMinMarketCap: (val: number) => void;
  setMaxAgeMinutes: (val: number) => void;
  toggleHasTwitter: () => void;
  toggleHasTelegram: () => void;
  toggleSmartMoneyOnly: () => void;
  toggleLowRiskOnly: () => void;
  toggleHideBundled: () => void;
  reset: () => void;
}

const DEFAULT_FILTERS: FeedFilters = {
  sortBy: 'new',
  category: 'all',
  minMarketCap: 0,
  maxAgeMinutes: 120,
  hasTwitter: false,
  hasTelegram: false,
  smartMoneyOnly: false,
  lowRiskOnly: false,
  hideBundled: false,
};

export const useFiltersStore = create<FiltersStore>((set) => ({
  ...DEFAULT_FILTERS,
  setSortBy: (sortBy) => set({ sortBy }),
  setCategory: (category) => set({ category }),
  setMinMarketCap: (minMarketCap) => set({ minMarketCap }),
  setMaxAgeMinutes: (maxAgeMinutes) => set({ maxAgeMinutes }),
  toggleHasTwitter: () => set((s) => ({ hasTwitter: !s.hasTwitter })),
  toggleHasTelegram: () => set((s) => ({ hasTelegram: !s.hasTelegram })),
  toggleSmartMoneyOnly: () => set((s) => ({ smartMoneyOnly: !s.smartMoneyOnly })),
  toggleLowRiskOnly: () => set((s) => ({ lowRiskOnly: !s.lowRiskOnly })),
  toggleHideBundled: () => set((s) => ({ hideBundled: !s.hideBundled })),
  reset: () => set(DEFAULT_FILTERS),
}));
