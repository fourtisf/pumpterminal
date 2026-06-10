interface SparklineProps {
  values: number[];
  height?: number;
  /** when true, render as discrete bars (good for activity counts) */
  bars?: boolean;
  className?: string;
}

const GREEN = '#00ff88';
const RED = '#ff3d5a';
const BLUE = '#4dabff';

export function Sparkline({ values, height = 96, bars = false, className }: SparklineProps): JSX.Element {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) {
    return (
      <div className={className}>
        <div className="font-mono text-[10px] text-text-muted">Not enough data yet — give it a moment.</div>
      </div>
    );
  }

  const W = 600;
  const H = height;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const x = (i: number) => (i / (clean.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / range) * (H - 6) - 3;

  if (bars) {
    const bw = (W / clean.length) * 0.7;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} style={{ height: H, width: '100%' }}>
        {clean.map((v, i) => {
          const top = y(v);
          return <rect key={i} x={x(i) - bw / 2} y={top} width={bw} height={H - top} fill={BLUE} rx={1} />;
        })}
      </svg>
    );
  }

  const up = clean[clean.length - 1]! >= clean[0]!;
  const stroke = up ? GREEN : RED;
  const linePts = clean.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const areaPts = `0,${H} ${linePts} ${W},${H}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} style={{ height: H, width: '100%' }}>
      <polygon points={areaPts} fill={stroke} fillOpacity={0.12} />
      <polyline
        points={linePts}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
