import type { Token } from '@/types';

const CSV_COLUMNS: { key: keyof Token; label: string }[] = [
  { key: 'symbol', label: 'symbol' },
  { key: 'name', label: 'name' },
  { key: 'mintAddress', label: 'mint' },
  { key: 'category', label: 'category' },
  { key: 'createdAt', label: 'createdAt' },
  { key: 'marketCapUsd', label: 'marketCapUsd' },
  { key: 'priceSol', label: 'priceSol' },
  { key: 'holdersCount', label: 'holders' },
  { key: 'bondingCurveProgress', label: 'bondingCurveProgress' },
  { key: 'buys1h', label: 'buys' },
  { key: 'sells1h', label: 'sells' },
  { key: 'devHoldingPct', label: 'devHoldingPct' },
  { key: 'volume24hUsd', label: 'volumeUsd' },
  { key: 'riskScore', label: 'riskScore' },
  { key: 'riskLevel', label: 'riskLevel' },
  { key: 'creatorWallet', label: 'creator' },
];

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function tokensToCsv(tokens: readonly Token[]): string {
  const header = CSV_COLUMNS.map((c) => c.label).join(',');
  const rows = tokens.map((t) =>
    CSV_COLUMNS.map((c) => escapeCell(t[c.key])).join(','),
  );
  return [header, ...rows].join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
