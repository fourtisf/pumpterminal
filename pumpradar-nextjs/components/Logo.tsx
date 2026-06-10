interface LogoProps {
  size?: number;
  className?: string;
  /** kept for API compatibility — the mark is static by design now */
  static?: boolean;
}

/**
 * Pump Terminal mark — a gradient disc (phosphor green → cyan) with a
 * price line breaking upward. Modern SaaS-style round mark; the color
 * carries the brand so the wordmark next to it stays plain and bold.
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
        <linearGradient id="pt-disc" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#00c24e" />
          <stop offset="55%" stopColor="#00ff66" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
      </defs>

      <circle cx="16" cy="16" r="14.5" fill="url(#pt-disc)" />
      {/* subtle top-light for depth */}
      <ellipse cx="12" cy="9" rx="9" ry="5.5" fill="#ffffff" opacity="0.18" />

      {/* price line breaking up */}
      <path
        d="M 8.5 20.5 L 13.5 15 L 16.5 17.8 L 23.5 10.5"
        stroke="#03130a"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 19.6 10.5 L 23.5 10.5 L 23.5 14.4"
        stroke="#03130a"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
