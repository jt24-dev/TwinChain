import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TwinChain — Supply Chain Resilience Intelligence',
  icons: { icon: '/favicon.svg' },
  description:
    'Build, import, and stress-test supply chain networks with disruption simulation, inventory analysis, and downstream impact modeling.',
  openGraph: {
    title: 'TwinChain — Supply Chain Resilience Intelligence',
    description:
      'Build or import a network. Simulate disruption. Understand inventory buffers, stockouts, and business impact.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'TwinChain — Supply Chain Resilience Intelligence',
    description: 'Build, visualize, and stress-test supply chain networks.',
  },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0c141d',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
