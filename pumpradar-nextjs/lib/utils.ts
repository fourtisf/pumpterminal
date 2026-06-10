import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TokenCategory } from '@/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* ---------- Number formatters ---------- */

export function formatUsd(value: number, opts: { compact?: boolean } = {}): string {
  const { compact = true } = opts;
  if (!Number.isFinite(value)) return '$0';

  if (compact) {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  }

  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function formatPrice(price: number): string {
  if (price === 0) return '$0';
  if (price >= 1) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(9)}`;
}

export function formatPct(value: number, opts: { signed?: boolean } = {}): string {
  const { signed = false } = opts;
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

/* ---------- Time formatters ---------- */

export function formatAge(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remSec = seconds % 60;
    return remSec > 0 && minutes < 10
      ? `${minutes}m ${remSec}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function isAgeFresh(timestamp: string | Date): boolean {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return Date.now() - date.getTime() < 60_000;
}

/* ---------- Address shorteners ---------- */

export function shortenAddress(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

/* ---------- Category styling ---------- */

const CATEGORY_BADGE_CLASS: Record<TokenCategory, string> = {
  AI: 'badge-ai',
  Tech: 'badge-tech',
  Meme: 'badge-meme',
  Animal: 'badge-animal',
  Political: 'badge-political',
  Celebrity: 'badge-celeb',
  Utility: 'badge-tech',
  Religious: 'badge-meme',
  Food: 'badge-amber',
  Sports: 'badge-tech',
  Other: 'badge-tech',
};

export function getCategoryBadgeClass(category: TokenCategory): string {
  return CATEGORY_BADGE_CLASS[category] ?? 'badge-tech';
}

const CATEGORY_COLOR: Record<TokenCategory, string> = {
  AI: '#36c6ff',
  Meme: '#ff6bcb',
  Animal: '#ffb000',
  Political: '#ff4d4d',
  Celebrity: '#b87cff',
  Tech: '#00ff66',
  Utility: '#00ff66',
  Religious: '#ff6bcb',
  Food: '#ffb000',
  Sports: '#36c6ff',
  Other: '#79917f',
};

export function getCategoryColor(category: TokenCategory): string {
  return CATEGORY_COLOR[category] ?? '#79917f';
}

/* ---------- Avatar fallback gradient ---------- */

const GRADIENTS = [
  'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
  'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
];

export function getAvatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx]!;
}
