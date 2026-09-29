'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productLinks } from '@/lib/product-entry';
import { AboutProduct } from './product-info';
import { ProductFooter, ProductHeader } from './product-navigation';

const workflow = [
  [
    'Build / Import',
    'Place facilities and connect directional routes, or bring in Excel, paired CSV, or JSON backup data.',
  ],
  [
    'Disrupt',
    'Choose a facility and shutdown duration to define a clear, repeatable scenario.',
  ],
  [
    'Analyze',
    'Follow downstream exposure, delays, inventory depletion, projected stockouts, and business KPI changes.',
  ],
  [
    'Mitigate',
    'Apply an available response and recalculate the scenario so its effect remains visible and comparable.',
  ],
  [
    'Save',
    'Store the scenario inputs and result summary locally in the browser for later review.',
  ],
  [
    'Compare',
    'Select compatible saved scenarios and inspect their KPI and stockout tradeoffs side by side.',
  ],
];

export function HowItWorksPage() {
  const [about, setAbout] = useState(false);
  return (
    <div className="app-shell home-shell">
      <ProductHeader current="how-it-works" onAbout={() => setAbout(true)} />
      <main className="product-home marketing-page how-it-works-page">
        <section className="marketing-hero" aria-labelledby="how-page-title">
          <span className="home-overline">HOW TWINCHAIN WORKS</span>
          <h2 id="how-page-title">
            From network data to a <em>clear scenario comparison.</em>
          </h2>
          <p>
            TwinChain keeps the workflow visual and understandable. Each step
            builds on the same network, using deterministic calculations that
            can be inspected and explained.
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
          className="home-section workflow-page-section"
          aria-labelledby="workflow-title"
        >
          <div className="section-heading">
            <span className="home-overline">THE CURRENT PRODUCT FLOW</span>
            <h2 id="workflow-title">
              Six steps from setup to decision support.
            </h2>
            <p>
              Use the Demo Network for a guided example or use the same flow
              with a network you create or import.
            </p>
          </div>
          <ol className="workflow-steps workflow-journey">
            {workflow.map(([title, copy], index) => (
              <li key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </section>
        <section
          className="product-problem workflow-note"
          aria-labelledby="workflow-note-title"
        >
          <div>
            <span className="home-overline">WHAT THE RESULTS MEAN</span>
            <h2 id="workflow-note-title">
              A transparent model for exploration.
            </h2>
          </div>
          <p>
            Results are illustrative scenario outputs based on the network and
            operational assumptions you provide. Use About / Methodology to see
            how propagation, inventory, and KPIs are calculated.
          </p>
        </section>
        <section className="marketing-cta" aria-labelledby="workflow-cta-title">
          <div>
            <span className="home-overline">SEE THE FLOW IN ACTION</span>
            <h2 id="workflow-cta-title">Open the configured Demo Network.</h2>
            <p>
              Explore disruption, stockout, mitigation, save, and comparison
              behavior.
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
        <ProductFooter current="how-it-works" onAbout={() => setAbout(true)} />
      </main>
      {about && <AboutProduct onClose={() => setAbout(false)} />}
    </div>
  );
}
