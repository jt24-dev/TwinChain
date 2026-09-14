import { Dashboard } from '@/components/simulator/dashboard';
import { ProductBoundary } from '@/components/simulator/product-boundary';
export default function Home() {
  return (
    <ProductBoundary>
      <Dashboard />
    </ProductBoundary>
  );
}
