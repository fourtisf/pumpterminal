'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Command {
  label: string;
  hint?: string;
  href: string;
}

const COMMANDS: Command[] = [
  { label: 'LIVE FEED', hint: 'F1', href: '/live' },
  { label: 'TRENDING', hint: 'F2', href: '/trending' },
  { label: 'NARRATIVES', hint: 'F3', href: '/narratives' },
  { label: 'GRADUATING', hint: 'F4', href: '/graduating' },
  { label: 'WALLET LOOKUP', hint: 'F5', href: '/wallet' },
  { label: 'WALLET ROAST', hint: 'F6', href: '/roast' },
  { label: 'PRICING', hint: 'F7', href: '/pricing' },
  { label: 'WATCHLIST', hint: 'F8', href: '/watchlist' },
  { label: 'SETTINGS', href: '/settings' },
  { label: 'API DOCS', href: '/api' },
  { label: 'HOME', href: '/' },
];

const FKEY_ROUTES: Record<string, string> = {
  F1: '/live',
  F2: '/trending',
  F3: '/narratives',
  F4: '/graduating',
  F5: '/wallet',
  F6: '/roast',
  F7: '/pricing',
  F8: '/watchlist',
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

/**
 * Global keyboard layer: F1–F8 jump straight to their pages (the topbar
 * keycaps are real), Ctrl/Cmd+K opens a terminal-style command palette.
 */
export function CommandPalette(): JSX.Element | null {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      // F-key navigation works everywhere except while typing
      if (FKEY_ROUTES[e.key] && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(false);
        router.push(FKEY_ROUTES[e.key]!);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      // focus after the dialog paints
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!open) return null;

  const run = (cmd: Command | undefined): void => {
    if (!cmd) return;
    setOpen(false);
    router.push(cmd.href);
  };

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-start justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] cursor-default"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-md mt-[16vh] bg-bg-elev border border-green/30 shadow-[0_0_60px_-12px_rgba(0,255,102,0.35),6px_6px_0_0_rgba(0,255,102,0.12)]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-text-dim">
            <span className="text-green mr-1.5">▣</span>COMMAND
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-text-muted border border-border px-1 py-px">
            ESC
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 border-b border-border">
          <span className="text-green font-mono text-sm" aria-hidden>
            &gt;
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelected((s) => Math.min(s + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelected((s) => Math.max(s - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                run(results[selected]);
              }
            }}
            placeholder="jump to..."
            aria-label="Search commands"
            className="flex-1 bg-transparent py-2.5 font-mono text-[12px] text-text placeholder:text-text-muted outline-none"
          />
        </div>

        <ul className="max-h-72 overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-3 py-3 font-mono text-[10px] text-text-muted">no match</li>
          )}
          {results.map((cmd, i) => (
            <li key={cmd.href}>
              <button
                type="button"
                onClick={() => run(cmd)}
                onMouseEnter={() => setSelected(i)}
                className={`w-full flex items-center justify-between px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-left ${
                  i === selected ? 'bg-green/10 text-green' : 'text-text-dim'
                }`}
              >
                <span>
                  <span className={`mr-2 ${i === selected ? 'text-green' : 'text-transparent'}`}>
                    ▶
                  </span>
                  {cmd.label}
                </span>
                {cmd.hint && (
                  <span className="text-[8px] text-text-muted border border-border px-1 py-px">
                    {cmd.hint}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
