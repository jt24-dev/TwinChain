'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Boxes,
  FileSpreadsheet,
  History,
  Network,
  ShieldAlert,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productLinks } from '@/lib/product-entry';
import { AboutProduct } from './product-info';
import { ProductFooter, ProductHeader } from './product-navigation';

const capabilities = [
  {
    icon: Network,
    label: 'BUILD & IMPORT',
    title: 'Model the network you depend on',
    copy: 'Create facilities and directional routes on the map, or import Excel, paired CSV, and JSON backup data. Imported networks use the same builder and simulator as networks created by hand.',
  },
  {
    icon: ShieldAlert,
    label: 'DISRUPTION SIMULATION',
    title: 'Trace a shutdown downstream',
    copy: 'Shut down a facility for a chosen duration. TwinChain follows downstream dependencies and calculates route status, facility risk, delay, service, and cost impact with deterministic rules.',
  },
  {
    icon: Boxes,
    label: 'INVENTORY & STOCKOUTS',
    title: 'See where buffers run out',
    copy: 'Add aggregate or SKU-level inventory and demand to estimate stockout timing, protected locations, and places where more data is needed.',
  },
  {
    icon: Workflow,
    label: 'MITIGATION',
    title: 'Compare practical responses',
    copy: 'Explore mitigation in the Demo Network and apply targeted responses in Custom Networks. Compare the resulting operational impact with the unmitigated scenario.',
  },
  {
    icon: History,
    label: 'SAVE & REOPEN',
    title: 'Keep a local scenario history',
    copy: 'Save scenario inputs in your browser, reopen them against the same network, and retain a clear record of the disruption and response that produced each result.',
  },
  {
    icon: FileSpreadsheet,
    label: 'COMPARE',
    title: 'Put scenario tradeoffs side by side',
    copy: 'Select compatible saved scenarios to compare KPIs and stockout outcomes without changing the underlying network or saved records.',
  },
];

export function ProductPage() {
  const [about, setAbout] = useState(false);
  return (
    <div className="app-shell home-shell">
      <ProductHeader current="product" onAbout={() => setAbout(true)} />
      <main className="product-home marketing-page">
        <section
          className="marketing-hero"
          aria-labelledby="product-page-title"
        >
          <span className="home-overline">THE TWINCHAIN PRODUCT</span>
          <h2 id="product-page-title">
            Turn a supply chain map into an <em>explainable risk model.</em>
          </h2>
          <p>
            TwinChain helps teams, analysts, and learners model dependencies,
            test facility shutdowns, and understand how operational impact can
            move through a network.
          </p>
          <div className="hero-actions">
            <Button
              className="home-button"
              nativeButton={false}
              render={<a href={productLinks.demo} />}
            >
              Try Demo <ArrowRight aria-hidden="true" />
            </Button>
            <Button
              className="home-button"
              variant="outline"
              nativeButton={false}
              render={<a href={productLinks.app} />}
            >
              Open App
            </Button>
          </div>
        </section>
        <section
          className="product-problem"
          aria-labelledby="product-problem-title"
        >
          <div>
            <span className="home-overline">FROM STRUCTURE TO CONSEQUENCE</span>
            <h2 id="product-problem-title">
              Make network risk easier to see and explain.
            </h2>
          </div>
          <p>
            A list of sites and routes does not show what happens when one of
            them stops. TwinChain connects network structure, operating data,
            inventory, and scenario results in one visual workspace so the
            assumptions and tradeoffs stay visible.
          </p>
        </section>
        <section className="home-section" aria-labelledby="capabilities-title">
          <div className="section-heading">
            <span className="home-overline">CURRENT CAPABILITIES</span>
            <h2 id="capabilities-title">
              A focused workflow for resilience analysis.
            </h2>
            <p>
              Every capability below is available in the current browser-based
              product. Files and saved work remain on this device.
            </p>
          </div>
          <div className="capability-grid marketing-capability-grid">
            {capabilities.map(({ icon: Icon, label, title, copy }) => (
              <article key={title}>
                <Icon aria-hidden="true" />
                <span className="capability-label">{label}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="marketing-cta" aria-labelledby="product-cta-title">
          <div>
            <span className="home-overline">EXPLORE A WORKING NETWORK</span>
            <h2 id="product-cta-title">
              Start with the Demo, then build your own.
            </h2>
            <p>
              No account is required. Your network data stays in your browser.
            </p>
          </div>
          <Button
            className="home-button"
            nativeButton={false}
            render={<a href={productLinks.demo} />}
          >
            Try Demo <ArrowRight aria-hidden="true" />
          </Button>
        </section>
        <ProductFooter current="product" onAbout={() => setAbout(true)} />
      </main>
      {about && <AboutProduct onClose={() => setAbout(false)} />}
    </div>
  );
}
