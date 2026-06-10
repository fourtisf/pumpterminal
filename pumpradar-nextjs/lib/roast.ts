import type { WalletSnapshot, TokenHolding } from './solana';

/**
 * Deterministic roast derived from public signals: SOL balance, recent activity
 * volume/recency, and (when available) SPL holdings via the worker proxy. Same
 * address → same roast.
 */

export type Archetype =
  | 'Sniper'
  | 'Bagholder'
  | 'Jeet'
  | 'Diamond'
  | 'Whale Dumper'
  | 'Degen Aper'
  | 'Tourist'
  | 'Bot Suspect';

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface RoastResult {
  degenScore: number;
  tier: Tier;
  tierColor: string;
  tierLabel: string;
  archetype: Archetype;
  archetypeEmoji: string;
  archetypeLine: string;
  verdict: string;
  burns: string[];
  pumpfunCount: number;
  disclaimer: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}
function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

const ARCHETYPES: Record<Archetype, { emoji: string; line: string }> = {
  Sniper: {
    emoji: '🎯',
    line: 'Hits launches in the first 60s. Other people are exit liquidity.',
  },
  Bagholder: {
    emoji: '💎',
    line: 'Sits on every coin until it’s vapor. Conviction or denial — same chart.',
  },
  Jeet: {
    emoji: '🪂',
    line: 'Sells the 2x like it owes money. Misses the 100x every single time.',
  },
  Diamond: {
    emoji: '🔷',
    line: 'Rare. Holds through chop, eats the dump, somehow wins anyway.',
  },
  'Whale Dumper': {
    emoji: '🐳',
    line: 'Big bag. Bigger sell button. The chart you see is them.',
  },
  'Degen Aper': {
    emoji: '🦍',
    line: 'Buys before reading the ticker. Sometimes it works.',
  },
  Tourist: {
    emoji: '🧳',
    line: 'Three trades a month, two of them losses. Crypto as a hobby.',
  },
  'Bot Suspect': {
    emoji: '🤖',
    line: 'Inhuman tx cadence. Either copy-trade bot or actual NPC.',
  },
};

const TIERS: Record<Tier, { color: string; label: string }> = {
  S: { color: '#ffb000', label: 'Elite trader — on the leaderboard or close to it.' },
  A: { color: '#00ff66', label: 'Solid edge. Knows what they’re doing.' },
  B: { color: '#a3ff9c', label: 'Above average. Catches the occasional banger.' },
  C: { color: '#7ab8ff', label: 'Mid. Aggressively, irredeemably mid.' },
  D: { color: '#ff8a47', label: 'Underwater more often than not.' },
  F: { color: '#ff4d4d', label: 'Rugged, jeeted, and broke. The trifecta.' },
};

const VERDICTS = [
  'Certified exit-liquidity provider',
  'Professional bag holder',
  'Speedrunning bankruptcy (any%)',
  'Touch grass — immediately',
  'Mid. Aggressively mid.',
  'Born to ape, forced to cope',
];

const BROKE_BURNS = [
  'Balance lower than your conviction. Both rounding errors.',
  'This wallet has seen more exit liquidity than profit.',
  'Gas fees are the only thing this address consistently pays.',
];
const ACTIVE_BURNS = [
  'Touching grass would 10x your portfolio. You won’t.',
  'You ape so fast the bonding curve files a restraining order.',
  'Every block, a new mistake. Consistency is a virtue, technically.',
];
const QUIET_BURNS = [
  'Bag-holding so hard it counts as cardio.',
  'Diamond hands or just forgot the seed phrase? The chart can’t tell.',
];
const RICH_BURNS = [
  'Okay, whale. Try not to dump on the people reading this.',
  'You could buy the dip. You will instead buy the top.',
];

function pickArchetype(s: WalletSnapshot, holdingsUsd: number, txPerDay: number, idleDays: number): Archetype {
  if (txPerDay >= 50) return 'Bot Suspect';
  if (s.balanceSol >= 100 && holdingsUsd >= 50_000) return 'Whale Dumper';
  if (idleDays > 14 && s.signatureCount <= 12) return 'Tourist';
  if (idleDays > 30) return 'Bagholder';
  if (s.signatureCount < 5) return 'Tourist';
  if (txPerDay >= 15 && s.balanceSol < 1) return 'Jeet';
  if (txPerDay >= 8) return 'Degen Aper';
  if (s.balanceSol >= 20 && txPerDay < 3) return 'Diamond';
  if (s.signatureCount >= 30 && idleDays <= 2) return 'Sniper';
  return 'Degen Aper';
}

function pickTier(degenScore: number, holdingsUsd: number, balanceSol: number, pumpfunCount: number): Tier {
  // Score blends degenScore + capital + pumpfun exposure
  let score = degenScore;
  if (holdingsUsd >= 50_000) score += 25;
  else if (holdingsUsd >= 10_000) score += 15;
  else if (holdingsUsd >= 1_000) score += 8;
  if (balanceSol >= 50) score += 15;
  else if (balanceSol >= 10) score += 8;
  else if (balanceSol < 0.05) score -= 20;
  score += Math.min(15, pumpfunCount * 3);

  if (score >= 110) return 'S';
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function roastWallet(s: WalletSnapshot): RoastResult {
  const seed = hash(s.address);
  const broke = s.balanceSol < 0.05;
  const rich = s.balanceSol >= 50;
  const now = Math.floor(Date.now() / 1000);
  const idleDays = s.newestTs ? (now - s.newestTs) / 86400 : 999;
  const veryActive = s.signatureCount >= 60 || (s.hasMore && s.signatureCount >= 80);
  const quiet = s.signatureCount <= 8;
  const span = s.oldestTs && s.newestTs ? Math.max(1, (s.newestTs - s.oldestTs) / 86400) : 1;
  const txPerDay = s.signatureCount / span;

  const holdings: TokenHolding[] = s.holdings ?? [];
  const holdingsUsd = s.holdingsTotalUsd ?? holdings.reduce((sum, h) => sum + h.usdValue, 0);
  const pumpfunCount = holdings.filter((h) => h.pumpfunTracked).length;

  let degenScore = 30;
  degenScore += Math.min(35, s.signatureCount / 3);
  if (broke) degenScore += 18;
  if (rich) degenScore -= 15;
  if (idleDays <= 1) degenScore += 12;
  if (quiet) degenScore -= 10;
  if (pumpfunCount >= 3) degenScore += 10;
  degenScore = Math.max(3, Math.min(99, Math.round(degenScore)));

  const archetype = pickArchetype(s, holdingsUsd, txPerDay, idleDays);
  const tier = pickTier(degenScore, holdingsUsd, s.balanceSol, pumpfunCount);

  const burns: string[] = [];
  if (broke) burns.push(pick(BROKE_BURNS, seed));
  if (rich) burns.push(pick(RICH_BURNS, seed >> 2));
  if (veryActive) burns.push(pick(ACTIVE_BURNS, seed >> 4));
  if (quiet) burns.push(pick(QUIET_BURNS, seed >> 6));
  if (burns.length === 0) burns.push(pick([...ACTIVE_BURNS, ...QUIET_BURNS], seed >> 8));
  if (idleDays > 30 && !quiet) {
    burns.push(`Last move ${Math.round(idleDays)} days ago. Did you finally take profit, or just give up?`);
  }
  if (pumpfunCount >= 3) {
    burns.push(`Holding ${pumpfunCount} pump.fun tokens we’re tracking right now. We see you.`);
  }

  return {
    degenScore,
    tier,
    tierColor: TIERS[tier].color,
    tierLabel: TIERS[tier].label,
    archetype,
    archetypeEmoji: ARCHETYPES[archetype].emoji,
    archetypeLine: ARCHETYPES[archetype].line,
    verdict: pick(VERDICTS, seed >> 1),
    burns,
    pumpfunCount,
    disclaimer:
      'Snapshot from SOL balance + last 100 signatures + SPL holdings (DexScreener pricing). Token P&L / win-rate needs the full indexer — not built yet.',
  };
}
