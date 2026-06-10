import type { Metadata } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { TerminalChrome } from '@/components/layout/TerminalChrome';
import { SOCIAL } from '@/lib/social';
import '@/styles/globals.css';

// DegenZone-style type system: Inter for UI/body, Inter Tight for big
// display headings. JetBrains Mono survives only inside genuine terminal
// artifacts (the live tape) via the `font-term` utility.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pumpterminal.click'),
  title: {
    default: 'Pump Terminal — pump.fun trading terminal',
    template: '%s · Pump Terminal',
  },
  description:
    'The pump.fun trading terminal: every launch streamed the second it hits the chain — narrative heat, bonding-curve tracker, graduation alerts, wallet roasts.',
  applicationName: 'Pump Terminal',
  keywords: [
    'pump.fun',
    'pumpfun',
    'solana',
    'memecoin',
    'launchpad',
    'analytics',
    'real-time',
    'trading',
    'terminal',
    'bonding curve',
    'narrative',
  ],
  openGraph: {
    title: 'Pump Terminal — every pump.fun launch, live',
    description:
      'A trading terminal for pump.fun. Real-time launch feed, narrative heat, bonding-curve tracker, graduation alerts, wallet roasts. All live. One terminal.',
    url: 'https://pumpterminal.click',
    siteName: 'Pump Terminal',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pump Terminal — every pump.fun launch, live',
    description:
      'Every pump.fun launch, the second it hits the chain. Narrative heat, bonding curves, graduation alerts.',
    site: SOCIAL.x.handle,
    creator: SOCIAL.x.handle,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} ${jetbrains.variable}`}
    >
      <body>
        {children}
        <TerminalChrome />
      </body>
    </html>
  );
}
