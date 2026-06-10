interface LogoProps {
  size?: number;
  className?: string;
  /** kept for API compatibility — the mark is static by design now */
  static?: boolean;
}

/**
 * Pump Terminal mark — a dark glass squircle with a gradient rim, holding
 * a green candle breaking out: full-height wick, glowing body, bright tick
 * at the top, faint price levels either side. Reads as "trading" at 96px
 * and still scans as a candle at 16px.
 */
export function Logo({ size = 28, className }: LogoProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Pump Terminal"
      className={className}
    >
      <defs>
        <linearGradient id="pt-rim" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00c24e" />
          <stop offset="55%" stopColor="#00ff66" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
        <linearGradient id="pt-body" x1="16" y1="12" x2="16" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="45%" stopColor="#00ff66" />
          <stop offset="100%" stopColor="#00c24e" />
        </linearGradient>
        <radialGradient id="pt-glow" cx="50%" cy="80%" r="90%">
          <stop offset="0%" stopColor="#00ff66" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#00ff66" stopOpacity="0" />
        </radialGradient>
        <clipPath id="pt-sq">
          <rect x="1.4" y="1.4" width="29.2" height="29.2" rx="8.8" />
        </clipPath>
        <filter id="pt-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* glass squircle */}
      <rect x="1.4" y="1.4" width="29.2" height="29.2" rx="8.8" fill="#071009" />
      <rect x="1.4" y="1.4" width="29.2" height="29.2" rx="8.8" fill="url(#pt-glow)" />
      <g clipPath="url(#pt-sq)">
        <ellipse cx="11" cy="3.4" rx="12" ry="3.2" fill="#ffffff" opacity="0.06" />
      </g>
      <rect
        x="1.4"
        y="1.4"
        width="29.2"
        height="29.2"
        rx="8.8"
        stroke="url(#pt-rim)"
        strokeWidth="1.3"
      />

      {/* faint price levels */}
      <path d="M 6.4 21.6 H 9.8" stroke="#00ff66" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 22.2 10.4 H 25.6" stroke="#00ff66" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />

      {/* wick */}
      <path d="M 16 6.2 V 25.4" stroke="#00ff66" strokeOpacity="0.55" strokeWidth="1.7" strokeLinecap="round" />

      {/* candle body (glow underneath) */}
      <rect x="12.6" y="12.4" width="6.8" height="10" rx="2" fill="#00ff66" opacity="0.45" filter="url(#pt-soft)" />
      <rect x="12.6" y="12.4" width="6.8" height="10" rx="2" fill="url(#pt-body)" />
      <rect x="13.5" y="13.3" width="2.2" height="3.4" rx="1.1" fill="#ffffff" opacity="0.35" />

      {/* breakout tick */}
      <circle cx="16" cy="6.2" r="3" fill="#00ff66" opacity="0.35" filter="url(#pt-soft)" />
      <circle cx="16" cy="6.2" r="1.7" fill="#00ff66" />
      <circle cx="16" cy="6.2" r="0.8" fill="#eafff2" />
    </svg>
  );
}
