interface LogoProps {
  size?: number;
  className?: string;
  /** disable animations (useful in og images / static contexts) */
  static?: boolean;
}

/**
 * PumpRadar mark — a radar dish (concentric arcs) with a target dot pulsing
 * at the centre. Stroke uses the brand green; the background fill is a tiny
 * green tint so the mark stays visible on the dark base. Inline SVG so it
 * scales perfectly at every size and lets us animate the centre.
 */
export function Logo({ size = 28, className, static: isStatic = false }: LogoProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="PumpRadar"
      className={className}
    >
      <defs>
        <filter id="pr-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="pr-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#00ff88" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* frame */}
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="7"
        fill="url(#pr-bg)"
        stroke="#00ff88"
        strokeWidth="1.6"
      />

      {/* outer radar arc (top-right quadrant) */}
      <path
        d="M 16 4.5 A 11.5 11.5 0 0 1 27.5 16"
        stroke="#00ff88"
        strokeWidth="1.3"
        strokeOpacity="0.32"
        strokeLinecap="round"
      />

      {/* mid radar arc */}
      <path
        d="M 16 9 A 7 7 0 0 1 23 16"
        stroke="#00ff88"
        strokeWidth="1.3"
        strokeOpacity="0.6"
        strokeLinecap="round"
      />

      {/* inner pulse ring (animated) */}
      {!isStatic && (
        <circle cx="16" cy="16" r="2.5" fill="none" stroke="#00ff88" strokeWidth="1">
          <animate attributeName="r" values="2.5;9;2.5" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.55;0;0.55" dur="2.6s" repeatCount="indefinite" />
        </circle>
      )}

      {/* centre target dot */}
      <circle cx="16" cy="16" r="2.4" fill="#00ff88" filter="url(#pr-glow)" />
    </svg>
  );
}
