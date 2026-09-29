import type { Metadata } from 'next';
import { HowItWorksPage } from '@/components/simulator/how-it-works-page';

export const metadata: Metadata = {
  title: 'How TwinChain Works — From Network to Scenario Comparison',
  description:
    'See how TwinChain moves from building or importing a network through disruption analysis, mitigation, saving, and scenario comparison.',
};

export default function HowItWorks() {
  return <HowItWorksPage />;
}
