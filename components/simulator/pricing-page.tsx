'use client';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productLinks } from '@/lib/product-entry';
import { ProductHeader, ProductFooter } from './product-navigation';
import { AboutProduct } from './product-info';

const comparison = [
  {
    category: 'Network creation',
    rows: [
      ['Demo & visual network builder', 'Included', 'Available in Free'],
      ['Excel / CSV import & JSON backup', 'Included', 'Available in Free'],
    ],
  },
  {
    category: 'Simulation',
    rows: [
      [
        'Facility shutdown & downstream propagation',
        'Included',
        'Available in Free',
      ],
      [
        'Inventory depletion & projected stockouts',
        'Included',
        'Available in Free',
      ],
      [
        'Mitigation comparison',
        'Demo Network only',
        'Custom mitigation planned',
      ],
      ['Saved scenario history', 'Not available', 'Planned'],
    ],
  },
  {
    category: 'Data & storage',
    rows: [
      ['Local browser saving', 'Included', 'Available in Free'],
      ['Cloud saving & cross-device access', 'Not available', 'Planned'],
      ['Team sharing', 'Not available', 'Planned'],
    ],
  },
  {
    category: 'Analysis',
    rows: [
      ['Operational facility & route data', 'Included', 'Available in Free'],
      ['Advanced scenario comparison', 'Not available', 'Planned'],
      ['Analytical reports & exports', 'JSON backup only', 'Planned'],
      ['Trade / tariff intelligence', 'Not available', 'Future exploration'],
    ],
  },
];

export function PricingPage() {
  const [about, setAbout] = useState(false);
  return (
    <div className="app-shell home-shell">
      <ProductHeader pricing onAbout={() => setAbout(true)} />
      <main className="product-home pricing-page">
        <section className="pricing-intro" aria-labelledby="pricing-title">
          <span className="home-overline">PRICING & PRODUCT PLANS</span>
          <h2 id="pricing-title">
            Start with the network you have.
            <br />
            <em>Explore what comes next.</em>
          </h2>
          <p>
            TwinChain is free to use today. A future Pro tier is planned to
            extend how you save, share, and analyze your work.
          </p>
        </section>
        <section className="plan-grid" aria-label="TwinChain plans">
          <article className="plan-card" aria-labelledby="free-title">
            <div className="plan-heading">
              <h3 id="free-title">Free</h3>
              <span>Available today</span>
            </div>
            <p className="plan-position">
              The complete current browser experience.
            </p>
            <p className="plan-availability">No subscription. No sign-up.</p>
            <Button
              className="home-button"
              nativeButton={false}
              render={<a href={productLinks.app} />}
            >
              Open TwinChain <ArrowRight aria-hidden="true" />
            </Button>
            <h4>Included today</h4>
            <ul className="plan-features">
              {[
                'Demo Network and visual Custom Networks',
                'Excel / CSV import and JSON backup / restore',
                'Facility shutdowns and downstream propagation',
                'Inventory depletion and projected stockouts',
                'Operational facility and route data',
                'Local browser saving',
                'Demo mitigation comparison',
              ].map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="plan-note">
              Networks stay in this browser. Export JSON backups to keep a
              portable copy.
            </p>
          </article>
          <article className="plan-card plan-pro" aria-labelledby="pro-title">
            <div className="plan-heading">
              <h3 id="pro-title">Pro</h3>
              <span>Coming Soon</span>
            </div>
            <p className="plan-position">
              More continuity. Deeper decision support.
            </p>
            <p className="plan-availability">
              Pricing and availability will be announced as TwinChain expands.
            </p>
            <Button
              className="home-button"
              nativeButton={false}
              variant="outline"
              render={<a href="#planned-features" />}
            >
              View Planned Features <ArrowRight aria-hidden="true" />
            </Button>
            <h4 id="planned-features">
              Planned directions · not available today
            </h4>
            <ul className="plan-features planned-features">
              {[
                'Cloud saving and cross-device access',
                'Saved scenario history and advanced comparison',
                'Advanced custom mitigation and operational analysis',
                'Analytical reports and exports',
                'Team sharing and collaboration',
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="plan-note">
              These are product directions, not a committed release schedule.
              Trade and tariff intelligence is a longer-term area of
              exploration. No Pro accounts or paid plans are available.
            </p>
          </article>
        </section>
        <section
          className="pricing-comparison home-section"
          aria-labelledby="comparison-title"
        >
          <div className="section-heading">
            <span className="home-overline">TODAY & AHEAD</span>
            <h2 id="comparison-title">What’s available. What’s planned.</h2>
            <p>
              All current features remain accessible for free. Future Pro scope
              may change.
            </p>
          </div>
          <table>
            <caption className="sr-only">
              Current Free features and future Pro directions. Pro is not
              available.
            </caption>
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">
                  Free <small>Available today</small>
                </th>
                <th scope="col">
                  Pro <small>Coming Soon</small>
                </th>
              </tr>
            </thead>
            {comparison.map((group) => (
              <tbody key={group.category}>
                <tr className="comparison-category">
                  <th colSpan={3} scope="rowgroup">
                    {group.category}
                  </th>
                </tr>
                {group.rows.map(([name, free, pro]) => (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    <td>{free}</td>
                    <td>{pro}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </section>
        <section
          className="pricing-faq home-section"
          aria-labelledby="faq-title"
        >
          <div className="section-heading">
            <span className="home-overline">A FEW PRACTICAL DETAILS</span>
            <h2 id="faq-title">Questions, answered.</h2>
          </div>
          {[
            [
              'Is TwinChain free today?',
              'Yes. The current browser-based product is available without an account or paid subscription.',
            ],
            [
              'Where are my networks stored?',
              'In your browser on this device. They do not sync across devices. Export JSON backups before clearing browser data.',
            ],
            [
              'Will Pro require payment?',
              'Pro is intended as a future paid tier, but pricing, scope, and availability have not been announced. There is no checkout or subscription to purchase today.',
            ],
            [
              'Does TwinChain upload imported files?',
              'No. Excel, CSV, and JSON imports are processed locally in your browser.',
            ],
            [
              'Is TwinChain enterprise planning software?',
              'TwinChain is an evolving resilience modeling platform for exploration and learning. Its simplified assumptions and illustrative KPIs do not replace an enterprise planning system.',
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
          <Button variant="link" onClick={() => setAbout(true)}>
            Read the methodology <ArrowRight aria-hidden="true" />
          </Button>
        </section>
        <ProductFooter pricing onAbout={() => setAbout(true)} />
      </main>
      {about && <AboutProduct onClose={() => setAbout(false)} />}
    </div>
  );
}
