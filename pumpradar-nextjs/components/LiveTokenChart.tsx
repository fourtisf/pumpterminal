'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { HistoryPoint } from '@/hooks/use-token-detail';
import { useTokenCandles, type Candle } from '@/hooks/use-token-candles';
import { formatUsd } from '@/lib/utils';

interface LiveTokenChartProps {
  mint: string;
  /** live trade history streamed via the worker WebSocket (preferred source) */
  history: readonly HistoryPoint[];
  height?: number;
}

const TIMEFRAMES: readonly { label: string; minutes: number }[] = [
  { label: '15s', minutes: 0.25 },
  { label: '1m', minutes: 1 },
  { label: '5m', minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '1h', minutes: 60 },
];

const GREEN = '#00ff88';
const RED = '#ff3d5a';
const GRID = '#1f2429';
const AXIS = '#8a929c';
const BG = 'transparent';

/** Bucket raw trade ticks into OHLC candles by `bucketMs`. */
function aggregate(history: readonly HistoryPoint[], bucketMs: number): Candle[] {
  if (history.length === 0) return [];
  const buckets = new Map<number, Candle>();
  for (const p of history) {
    if (!Number.isFinite(p.mc) || p.mc <= 0) continue;
    const k = Math.floor(p.t / bucketMs) * bucketMs;
    const existing = buckets.get(k);
    if (!existing) {
      buckets.set(k, { t: k, open: p.mc, high: p.mc, low: p.mc, close: p.mc, volume: 0 });
    } else {
      if (p.mc > existing.high) existing.high = p.mc;
      if (p.mc < existing.low) existing.low = p.mc;
      existing.close = p.mc;
    }
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

function mergeCandles(backfill: readonly Candle[], live: readonly Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of backfill) map.set(c.t, c);
  for (const c of live) map.set(c.t, c);
  return [...map.values()].sort((a, b) => a.t - b.t);
}

export function LiveTokenChart({ mint, history, height = 440 }: LiveTokenChartProps): JSX.Element {
  const [tfIdx, setTfIdx] = useState(1); // default 1m
  const tfMinutes = TIMEFRAMES[tfIdx]!.minutes;
  const bucketMs = Math.max(1000, Math.round(tfMinutes * 60_000));

  const liveCandles = useMemo(() => aggregate(history, bucketMs), [history, bucketMs]);
  const backfillTfMin = Math.max(1, Math.round(tfMinutes));
  const skipBackfill = tfMinutes < 1;
  const { candles: backfill, source: backfillSource } = useTokenCandles(skipBackfill ? '' : mint, backfillTfMin, 4000);

  const candles = useMemo(
    () => (backfill.length > 0 ? mergeCandles(backfill, liveCandles) : liveCandles),
    [backfill, liveCandles],
  );

  const [tickPulse, setTickPulse] = useState(0);
  useEffect(() => {
    if (history.length === 0) return;
    setTickPulse((n) => n + 1);
  }, [history.length]);

  const last = candles[candles.length - 1];
  const bodyHeight = height - 36 - 32;

  return (
    <div
      className="bg-bg border border-border rounded-md overflow-hidden flex flex-col"
      style={{ minHeight: height }}
    >
      <Header last={last} tfIdx={tfIdx} setTfIdx={setTfIdx} hasData={candles.length > 0} />
      {candles.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height: bodyHeight }}>
          <div className="text-center font-mono text-[11px] text-text-muted px-6 leading-relaxed max-w-md">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green animate-pulse-dot" />
              live · waiting for the next trade
            </span>
            <br />
            <span className="block mt-2 text-text-dim/80">
              Most pump.fun tokens get one buy and go quiet. The chart fills in instantly when
              someone buys or sells.
            </span>
          </div>
        </div>
      ) : (
        <ChartBody candles={candles} height={bodyHeight} />
      )}
      <Footer
        mint={mint}
        count={candles.length}
        source={
          candles.length === 0
            ? 'live'
            : backfillSource === 'geckoterminal'
              ? 'geckoterminal + live'
              : backfill.length > 0
                ? 'pump.fun + live'
                : 'live'
        }
        pulse={tickPulse}
      />
    </div>
  );
}

function Header({
  last,
  tfIdx,
  setTfIdx,
  hasData,
}: {
  last: Candle | undefined;
  tfIdx: number;
  setTfIdx: (n: number) => void;
  hasData: boolean;
}): JSX.Element {
  const up = last ? last.close >= last.open : true;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border flex-wrap">
      <div className="flex items-center gap-2 font-mono text-[11px] min-h-[18px]">
        {last ? (
          <>
            <span className="text-text-muted">O</span>
            <span className={up ? 'text-green' : 'text-red'}>{formatUsd(last.open)}</span>
            <span className="text-text-muted">H</span>
            <span className={up ? 'text-green' : 'text-red'}>{formatUsd(last.high)}</span>
            <span className="text-text-muted">L</span>
            <span className={up ? 'text-green' : 'text-red'}>{formatUsd(last.low)}</span>
            <span className="text-text-muted">C</span>
            <span className={up ? 'text-green' : 'text-red'}>{formatUsd(last.close)}</span>
            <span className={`ml-1 ${up ? 'text-green' : 'text-red'}`}>
              {(((last.close - last.open) / (last.open || 1)) * 100).toFixed(2)}%
            </span>
          </>
        ) : (
          <span className="text-text-muted uppercase tracking-wider">
            {hasData ? 'loading…' : 'live · awaiting first tick'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {TIMEFRAMES.map((opt, i) => (
          <button
            key={opt.label}
            onClick={() => setTfIdx(i)}
            className={`px-2 py-1 font-mono text-[10px] rounded transition-colors ${
              tfIdx === i
                ? 'bg-green text-black font-bold'
                : 'text-text-dim hover:text-text border border-border'
            }`}
            title={`${opt.label} candles`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Footer({
  mint,
  count,
  source,
  pulse,
}: {
  mint: string;
  count: number;
  source: string;
  pulse: number;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-border font-mono text-[9px] text-text-muted uppercase tracking-[0.15em]">
      <span className="inline-flex items-center gap-1.5">
        <span
          key={pulse}
          className="w-1.5 h-1.5 rounded-full bg-green animate-live-flash"
          style={{ boxShadow: '0 0 6px #00ff88' }}
        />
        live · {count} candle{count === 1 ? '' : 's'} · {source} · drag to pan · scroll to zoom
      </span>
      <a
        href={`https://pump.fun/${mint}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green hover:underline normal-case tracking-normal"
      >
        verify on pump.fun ↗
      </a>
    </div>
  );
}

function formatPriceLabel(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '$0';
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  // More precision below $10K so flat candles don't render five identical
  // y-axis labels like "$5.68K $5.68K $5.68K …"
  if (v >= 10_000) return `$${(v / 1000).toFixed(2)}K`;
  if (v >= 1_000) return `$${(v / 1000).toFixed(3)}K`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toPrecision(3)}`;
}

function ChartBody({ candles, height }: { candles: readonly Candle[]; height: number }): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  // Track which dataset we last pushed. Format: "<firstTimeSec>:<length>".
  // When firstTimeSec changes we treat it as a new dataset (timeframe switch
  // or full reload) and call setData + fitContent. Otherwise we just push
  // new/changed bars via update() so the user's pan + zoom survive polling.
  const lastSigRef = useRef<string | null>(null);

  // Mount once per height change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: BG },
        textColor: AXIS,
        fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
      },
      grid: {
        vertLines: { color: GRID, style: 1 },
        horzLines: { color: GRID, style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#4a525c', width: 1, style: 3, labelBackgroundColor: '#1f2429' },
        horzLine: { color: '#4a525c', width: 1, style: 3, labelBackgroundColor: '#1f2429' },
      },
      rightPriceScale: {
        borderColor: GRID,
        scaleMargins: { top: 0.1, bottom: 0.25 },
        autoScale: true,
      },
      timeScale: {
        borderColor: GRID,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 2,
        shiftVisibleRangeOnNewBar: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      localization: { priceFormatter: formatPriceLabel },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: GREEN,
      downColor: RED,
      borderUpColor: GREEN,
      borderDownColor: RED,
      wickUpColor: GREEN,
      wickDownColor: RED,
      priceFormat: { type: 'custom', minMove: 0.000001, formatter: formatPriceLabel },
      // When every bar is flat (1 trade, OHLC identical), lightweight-charts
      // collapses the y-range to a single value — six y-axis labels all read
      // the same number and the candle vanishes. Force a minimum ±1% spread
      // around the mid so the candle and grid stay readable until real range
      // appears.
      autoscaleInfoProvider: (orig: () => { priceRange?: { minValue: number; maxValue: number } } | null) => {
        const res = orig();
        if (!res || !res.priceRange) return res;
        const { minValue, maxValue } = res.priceRange;
        const mid = (minValue + maxValue) / 2;
        const spread = maxValue - minValue;
        const minSpread = Math.max(Math.abs(mid) * 0.02, 1);
        if (spread < minSpread) {
          return {
            ...res,
            priceRange: {
              minValue: mid - minSpread / 2,
              maxValue: mid + minSpread / 2,
            },
          };
        }
        return res;
      },
    });

    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: 'rgba(122,184,255,0.4)',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      visible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volSeriesRef.current = volSeries;
    lastSigRef.current = null;

    const onResize = (): void => {
      if (!el) return;
      chart.applyOptions({ width: el.clientWidth });
    };
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    if (ro) ro.observe(el);

    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
      lastSigRef.current = null;
    };
  }, [height]);

  // Data push: setData on first load / timeframe switch, .update() otherwise.
  // This is what preserves the user's pan + zoom across the 4s polling tick.
  useEffect(() => {
    const cs = candleSeriesRef.current;
    const vs = volSeriesRef.current;
    const chart = chartRef.current;
    if (!cs || !vs || !chart) return;

    // De-dupe and sort. Lightweight-charts requires strictly ascending time.
    const byTime = new Map<number, Candle>();
    for (const c of candles) {
      if (!Number.isFinite(c.t) || c.t <= 0) continue;
      const t = Math.floor(c.t / 1000);
      byTime.set(t, c); // latest wins on duplicate
    }
    const cleaned: Candle[] = [...byTime.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, c]) => c);

    if (cleaned.length === 0) {
      cs.setData([]);
      vs.setData([]);
      lastSigRef.current = null;
      return;
    }

    // Render-only padding: a single flat candle (O==H==L==C, brand-new
    // token, one trade so far) draws as a 1-pixel line and looks invisible.
    // For the *last* bar only, widen the wick by 0.15% so the candle body
    // shows. We don't mutate `cleaned` — the OHLC header still reads the
    // real high/low.
    const lastIdx = cleaned.length - 1;
    const candleData: CandlestickData[] = cleaned.map((c, i) => {
      const isFlat = c.open === c.high && c.high === c.low && c.low === c.close;
      if (i === lastIdx && isFlat && c.close > 0) {
        const pad = c.close * 0.0015;
        return {
          time: Math.floor(c.t / 1000) as UTCTimestamp,
          open: c.close,
          high: c.close + pad,
          low: c.close - pad,
          close: c.close,
        };
      }
      return {
        time: Math.floor(c.t / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      };
    });
    const volData: HistogramData[] = cleaned.map((c) => ({
      time: Math.floor(c.t / 1000) as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(0,255,136,0.4)' : 'rgba(255,61,90,0.4)',
    }));

    const firstT = candleData[0]!.time as number;
    const lastT = candleData[candleData.length - 1]!.time as number;
    const prevSig = lastSigRef.current;
    const prevParts = prevSig ? prevSig.split(':').map(Number) : null;
    const prevFirstT = prevParts ? prevParts[0]! : null;
    const prevLastT = prevParts ? prevParts[2] ?? -Infinity : -Infinity;
    const isFreshDataset = prevSig === null || prevFirstT !== firstT || lastT < prevLastT;

    try {
      if (isFreshDataset) {
        // First load, timeframe switch, or time went backward — rebuild.
        cs.setData(candleData);
        vs.setData(volData);
        if (cleaned.length === 1) {
          // fitContent on one bar collapses the time scale; set an explicit
          // visible range around the bar so it sits comfortably on the chart.
          const t = candleData[0]!.time as number;
          const halfWindow = 900; // 15 min on each side
          chart.timeScale().setVisibleRange({
            from: (t - halfWindow) as Time,
            to: (t + halfWindow / 2) as Time,
          });
        } else {
          chart.timeScale().fitContent();
        }
        chart.timeScale().applyOptions({ barSpacing: cleaned.length <= 3 ? 28 : 10 });
      } else {
        // Lightweight-charts .update() requires time >= series' last bar time.
        // Walk forward from the first bar whose time is >= prevLastT and push
        // each one. Same-time bars get rewritten; greater-time bars are
        // appended. Anything earlier than prevLastT is skipped (already set).
        let firstUpdateIdx = candleData.length;
        for (let i = 0; i < candleData.length; i++) {
          if ((candleData[i]!.time as number) >= prevLastT) {
            firstUpdateIdx = i;
            break;
          }
        }
        for (let i = firstUpdateIdx; i < candleData.length; i++) {
          cs.update(candleData[i]!);
          vs.update(volData[i]!);
        }
      }
      lastSigRef.current = `${firstT}:${candleData.length}:${lastT}`;
    } catch (err) {
      // If update() rejects for any unforeseen reason (data ordering quirk),
      // recover with a full setData rather than leaving the chart frozen.
      console.warn('[LiveTokenChart] update failed, falling back to setData:', err);
      cs.setData(candleData);
      vs.setData(volData);
      lastSigRef.current = `${firstT}:${candleData.length}:${lastT}`;
    }
  }, [candles]);

  return <div ref={containerRef} style={{ height, width: '100%' }} className="bg-bg" />;
}
