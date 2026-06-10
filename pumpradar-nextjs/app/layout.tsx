import type { Metadata } from 'next';
import { JetBrains_Mono, Orbitron, Space_Grotesk } from 'next/font/google';
import { SOCIAL } from '@/lib/social';
import '@/styles/globals.css';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const displayFont = Orbitron({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pumpradar.click'),
  title: {
    default: 'PumpRadar — Live PumpFun Intelligence',
    template: '%s · PumpRadar',
  },
  description:
    'Real-time pump.fun radar: every launch the second it hits the chain, narrative heat, bonding-curve tracker, graduation alerts, wallet roasts.',
  applicationName: 'PumpRadar',
  keywords: [
    'pump.fun',
    'pumpfun',
    'solana',
    'memecoin',
    'launchpad',
    'analytics',
    'real-time',
    'trading',
    'bonding curve',
    'narrative',
  ],
  openGraph: {
    title: 'PumpRadar — Hunt the next 100x before anyone else',
    description:
      'Real-time radar for every pump.fun launch. Narrative heat, bonding-curve tracker, graduation alerts, wallet roasts. All live. One terminal.',
    url: 'https://pumpradar.click',
    siteName: 'PumpRadar',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PumpRadar — Hunt the next 100x',
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
      className={`${jetbrains.variable} ${displayFont.variable} ${spaceGrotesk.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
