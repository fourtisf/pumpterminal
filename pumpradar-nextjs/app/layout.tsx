import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { SOCIAL } from '@/lib/social';
import '@/styles/globals.css';

// Single typeface, terminal-style — hierarchy comes from weight/size/color.
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pumpterminal.click'),
  title: {
    default: 'PUMP TERMINAL — pump.fun trading terminal',
    template: '%s · PUMP TERMINAL',
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
    title: 'PUMP TERMINAL — every pump.fun launch, live',
    description:
      'A trading terminal for pump.fun. Real-time launch feed, narrative heat, bonding-curve tracker, graduation alerts, wallet roasts. All live. One terminal.',
    url: 'https://pumpterminal.click',
    siteName: 'Pump Terminal',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PUMP TERMINAL — every pump.fun launch, live',
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
    <html lang="en" className={jetbrains.variable}>
      <body>{children}</body>
    </html>
  );
}
