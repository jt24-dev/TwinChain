import type { Metadata } from 'next';
import { ProductPage } from '@/components/simulator/product-page';

export const metadata: Metadata = {
  title: 'TwinChain Product — Supply Chain Resilience Intelligence',
  description:
    'Model supply chain networks, simulate disruption, analyze inventory and stockouts, and compare mitigation scenarios with TwinChain.',
};

export default function Product() {
  return <ProductPage />;
}
