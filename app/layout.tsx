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
  title: 'Supply Chain Resilience Simulator',
  icons: { icon: '/favicon.svg' },
  description:
    'Build, visualize, and stress-test supply chain networks. Explore downstream disruption, inventory buffers, projected stockouts, and business impact.',
  openGraph: {
    title: 'Supply Chain Resilience Simulator',
    description:
      'Build or import a network. Simulate disruption. Understand inventory buffers, stockouts, and business impact.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Supply Chain Resilience Simulator',
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
