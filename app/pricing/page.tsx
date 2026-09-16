import type { Metadata } from 'next';
import { PricingPage } from '@/components/simulator/pricing-page';

export const metadata: Metadata = {
  title: 'TwinChain Pricing — Free Today, Pro Coming Soon',
  description:
    'Use TwinChain free today for supply chain modeling and disruption simulation. Advanced Pro capabilities are planned.',
  openGraph: {
    title: 'TwinChain Pricing — Free Today, Pro Coming Soon',
    description:
      'Explore the current Free experience and planned Pro capabilities.',
  },
  twitter: {
    title: 'TwinChain Pricing — Free Today, Pro Coming Soon',
    description: 'Free today. Advanced Pro capabilities are planned.',
  },
};

export default function Pricing() {
  return <PricingPage />;
}
