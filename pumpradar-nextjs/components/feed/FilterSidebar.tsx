'use client';

import { useMemo } from 'react';
import { useFiltersStore } from '@/lib/filters-store';
import { formatUsd, getCategoryColor } from '@/lib/utils';
import type { Token, TokenCategory } from '@/types';

const MAX_MC_FILTER = 100_000;
const MAX_AGE_FILTER_MIN = 360;

function formatAgeLabel(minutes: number): string {
  if (minutes <= 0) return 'ANY';
  if (minutes % 60 === 0) return `${minutes / 60}H`;
  if (minutes < 60) return `${minutes}M`;
  return `${Math.floor(minutes / 60)}H ${minutes % 60}M`;
}

interface CategoryItem {
  key: TokenCategory | 'all';
  label: string;
}

const CATEGORY_ROWS: readonly CategoryItem[] = [
  { key: 'all', label: 'All' },
  { key: 'AI', label: 'AI / AGI' },
  { key: 'Meme', label: 'Meme' },
  { key: 'Animal', label: 'Animal' },
  { key: 'Political', label: 'Political' },
  { key: 'Celebrity', label: 'Celebrity' },
  { key: 'Tech', label: 'Tech' },
] as const;

interface FilterSidebarProps {
  /** live tokens — used to render real category counts; sidebar shows zeros until populated */
  tokens?: readonly Token[];
}

export function FilterSidebar({ tokens }: FilterSidebarProps = {}): JSX.Element {
  const {
    sortBy,
    category,
    minMarketCap,
    maxAgeMinutes,
    hasTwitter,
    hasTelegram,
    smartMoneyOnly,
    lowRiskOnly,
    hideBundled,
    setSortBy,
    setCategory,
    setMinMarketCap,
    setMaxAgeMinutes,
    toggleHasTwitter,
    toggleHasTelegram,
    toggleSmartMoneyOnly,
    toggleLowRiskOnly,
    toggleHideBundled,
  } = useFiltersStore();

  const counts = useMemo(() => {
    const out = new Map<TokenCategory | 'all', number>();
    out.set('all', tokens?.length ?? 0);
    if (tokens && tokens.length > 0) {
      for (const t of tokens) {
        out.set(t.category, (out.get(t.category) ?? 0) + 1);
      }
    }
    return out;
  }, [tokens]);

  return (
    <aside className="hidden lg:block border-r border-border py-5 bg-bg sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto">
      {/* Sort */}
      <Section label="Sort By">
        <div className="flex gap-1 px-2">
          {(['new', 'volume', 'market_cap'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`flex-1 border rounded-none p-1.5 font-mono text-[10px] cursor-pointer transition-all duration-100 ${
                sortBy === opt
                  ? 'bg-text text-bg border-text'
                  : 'bg-bg-elev border-border text-text-dim hover:text-text'
              }`}
            >
              {opt === 'new' ? 'NEW' : opt === 'volume' ? 'VOL' : 'MC'}
            </button>
          ))}
        </div>
      </Section>

      {/* Categories */}
      <Section label="Categories">
        {CATEGORY_ROWS.map((cat) => (
          <FilterRow
            key={cat.key}
            active={category === cat.key}
            onClick={() => setCategory(cat.key)}
            label={cat.label}
            count={counts.get(cat.key) ?? 0}
            dotColor={
              cat.key === 'all'
                ? '#79917f'
                : getCategoryColor(cat.key as TokenCategory)
            }
          />
        ))}
      </Section>

      <Section label="Market Cap">
        <div className="p-2">
          <label className="flex justify-between font-mono text-[10px] text-text-dim mb-2">
            MIN <span className="text-green">{minMarketCap > 0 ? formatUsd(minMarketCap) : 'ANY'}</span>
          </label>
          <input
            type="range"
            min={0}
            max={MAX_MC_FILTER}
            step={1000}
            value={minMarketCap}
            onChange={(e) => setMinMarketCap(Number(e.target.value))}
            className="w-full appearance-none bg-border h-0.5 rounded-sm outline-none accent-green"
          />
        </div>
      </Section>

      <Section label="Age">
        <div className="p-2">
          <label className="flex justify-between font-mono text-[10px] text-text-dim mb-2">
            MAX <span className="text-green">{formatAgeLabel(maxAgeMinutes)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={MAX_AGE_FILTER_MIN}
            step={5}
            value={maxAgeMinutes}
            onChange={(e) => setMaxAgeMinutes(Number(e.target.value))}
            className="w-full appearance-none bg-border h-0.5 rounded-sm outline-none accent-green"
          />
        </div>
      </Section>

      {/* Boolean filters */}
      <Section label="Filters">
        <Checkbox checked={hasTwitter} onChange={toggleHasTwitter} label="Has Twitter" />
        <Checkbox checked={hasTelegram} onChange={toggleHasTelegram} label="Has Telegram" />
        <Checkbox checked={smartMoneyOnly} onChange={toggleSmartMoneyOnly} label="Smart money buy" />
        <Checkbox checked={lowRiskOnly} onChange={toggleLowRiskOnly} label="Low risk only" />
        <Checkbox checked={hideBundled} onChange={toggleHideBundled} label="Hide bundled" />
      </Section>
    </aside>
  );
}

/* ---------- Sub-components ---------- */

function Section({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="px-4 pb-6">
      <div className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em] mb-2.5 px-2 flex items-center gap-1.5 before:content-[''] before:w-1 before:h-1 before:bg-text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

interface FilterRowProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dotColor: string;
}

function FilterRow({ active, onClick, label, count, dotColor }: FilterRowProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-[7px] rounded font-mono text-xs transition-all duration-100 ${
        active
          ? 'bg-green/[0.06] text-green'
          : 'text-text-dim hover:bg-bg-elev hover:text-text'
      }`}
    >
      <span className="flex items-center">
        <span
          className="inline-block w-2 h-2 rounded-sm mr-2"
          style={{ background: dotColor }}
        />
        {label}
      </span>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-none ${
          active ? 'bg-green/10 text-green' : 'bg-bg-elev text-text-muted'
        }`}
      >
        {count.toLocaleString('en-US')}
      </span>
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}): JSX.Element {
  return (
    <label className="flex items-center gap-2 px-2 py-1.5 font-mono text-[11px] text-text-dim cursor-pointer hover:text-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-green"
      />
      {label}
    </label>
  );
}
