/**
 * Core domain types — mirror the Postgres schema from technical spec.
 * Keep these in sync with packages/db/schema.prisma when the backend lands.
 */

export type TokenCategory =
  | 'AI'
  | 'Meme'
  | 'Animal'
  | 'Political'
  | 'Celebrity'
  | 'Tech'
  | 'Utility'
  | 'Religious'
  | 'Food'
  | 'Sports'
  | 'Other';

export type RiskLevel = 'low' | 'medium' | 'high';

export type WalletTag =
  | 'smart_money'
  | 'sniper'
  | 'whale'
  | 'kol'
  | 'insider'
  | 'bundler'
  | 'dev';

export type AlertType =
  | 'smart_money_cluster'
  | 'whale_buy'
  | 'about_to_graduate'
  | 'kol_entry';

export interface Token {
  mintAddress: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  description?: string;
  twitterUrl?: string | null;
  telegramUrl?: string | null;
  websiteUrl?: string | null;
  creatorWallet: string;
  createdAt: string; // ISO timestamp
  graduatedAt: string | null;
  isComplete: boolean;
  category: TokenCategory;
  subcategory?: string;
  keywords: readonly string[];
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  // Real-time metrics
  marketCapUsd: number;
  priceSol: number;
  holdersCount: number;
  bondingCurveProgress: number; // 0-1
  volume24hUsd: number;
  devHoldingPct: number;
  buys1h: number;
  sells1h: number;
  // Derived flags
  hasSmartMoney: boolean;
  isFresh: boolean; // < 60s old
}

export interface Trade {
  signature: string;
  mintAddress: string;
  walletAddress: string;
  side: 'BUY' | 'SELL';
  solAmount: number;
  tokenAmount: number;
  priceSol: number;
  marketCapAtTradeUsd: number;
  timestamp: string;
  walletTags?: readonly WalletTag[];
}

export interface SmartMoneyAlert {
  id: string;
  type: AlertType;
  mintAddress: string;
  symbol: string;
  message: string;
  walletCount: number;
  totalSolVolume: number;
  createdAt: string;
}

export interface GraduatingToken {
  mintAddress: string;
  symbol: string;
  progress: number; // 0-1
}

export interface NarrativeStat {
  category: TokenCategory;
  count: number;
  percentage: number;
  colorVar: string; // CSS color
}

export interface FeedFilters {
  sortBy: 'new' | 'volume' | 'market_cap';
  category: TokenCategory | 'all';
  minMarketCap: number;
  maxAgeMinutes: number;
  hasTwitter: boolean;
  hasTelegram: boolean;
  smartMoneyOnly: boolean;
  lowRiskOnly: boolean;
  hideBundled: boolean;
}

/* WebSocket message envelope sent from ingestion worker */
export type TokenUpdate = Partial<Token> & Pick<Token, 'mintAddress'>;

export type WsMessage =
  | { type: 'token.created'; data: Token }
  | { type: 'token.updated'; data: TokenUpdate }
  | { type: 'trade'; data: Trade }
  | { type: 'alert'; data: SmartMoneyAlert };
