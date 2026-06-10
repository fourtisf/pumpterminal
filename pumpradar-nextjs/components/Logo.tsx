interface LogoProps {
  size?: number;
  className?: string;
  /** disable animations (useful in og images / static contexts) */
  static?: boolean;
}

/**
 * Pump Terminal mark — a sharp-cornered terminal window with a `>` prompt
 * and a blinking block cursor. Stroke uses the brand phosphor green; the
 * fill is a faint green tint so the mark stays visible on the dark base.
 * Inline SVG so it scales perfectly at every size and lets us animate the
 * cursor.
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
      aria-label="Pump Terminal"
      className={className}
    >
      <defs>
        <filter id="pt-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="pt-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00ff66" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#00ff66" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* window frame — hard corners */}
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        fill="url(#pt-bg)"
        stroke="#00ff66"
        strokeWidth="1.6"
      />

      {/* title bar */}
      <line x1="1.5" y1="8.5" x2="30.5" y2="8.5" stroke="#00ff66" strokeOpacity="0.4" strokeWidth="1" />
      <rect x="4" y="4.2" width="2" height="2" fill="#00ff66" fillOpacity="0.9" />
      <rect x="7.5" y="4.2" width="2" height="2" fill="#00ff66" fillOpacity="0.45" />

      {/* prompt chevron */}
      <path
        d="M 7 14 L 12.5 18.5 L 7 23"
        stroke="#00ff66"
        strokeWidth="2.2"
        fill="none"
        filter="url(#pt-glow)"
      />

      {/* block cursor (blinks unless static) */}
      <rect x="16" y="20.6" width="8.5" height="3" fill="#00ff66" filter="url(#pt-glow)">
        {!isStatic && (
          <animate
            attributeName="opacity"
            values="1;1;0;0"
            keyTimes="0;0.5;0.5;1"
            dur="1.1s"
            repeatCount="indefinite"
          />
        )}
      </rect>
    </svg>
  );
}
