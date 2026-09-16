import { Button } from '@/components/ui/button';
import { ProductFooter } from './product-navigation';
import type { SupplyNetwork } from '@/lib/networks';
import {
  ArrowRight,
  Boxes,
  FileSpreadsheet,
  Globe2,
  Network,
  ShieldAlert,
  Workflow,
} from 'lucide-react';
import { ProductPreview } from './product-preview';
export function ProductHome({
  networks,
  onDemo,
  onBuild,
  onImport,
  onOpen,
  onAbout,
}: {
  networks: SupplyNetwork[];
  onDemo: () => void;
  onBuild: () => void;
  onImport: () => void;
  onOpen: (id: string) => void;
  onAbout: () => void;
}) {
  return (
    <main className="product-home" id="home-top">
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="home-overline">
            SUPPLY CHAIN RESILIENCE INTELLIGENCE
          </span>
          <h2 id="hero-title">
            Stress-test your supply chain <em>before the real world does.</em>
          </h2>
          <p className="home-intro">
            Build or import your network. Simulate a disruption. See how risk,
            inventory buffers, and service impact unfold downstream.
          </p>
          <div className="hero-actions">
            <Button className="home-button" onClick={onDemo}>
              Try Demo <ArrowRight aria-hidden="true" />
            </Button>
            <Button className="home-button" variant="outline" onClick={onBuild}>
              Build Your Network
            </Button>
          </div>
          <p className="hero-footnote">
            Start in your browser. No account required.
          </p>
        </div>
        <ProductPreview />
      </section>

      <section className="home-entry" aria-label="Enter TwinChain">
        <article>
          <Globe2 aria-hidden="true" />
          <div>
            <h3>Explore the example</h3>
            <p>
              A configured network with stockouts and mitigation comparison.
              Illustrative data, ready to explore.
            </p>
            <Button variant="link" onClick={onDemo}>
              Try Demo <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </article>
        <article>
          <Network aria-hidden="true" />
          <div>
            <h3>Make it your network</h3>
            <p>
              Place facilities, connect routes, and add the operational details
              that matter.
            </p>
            <Button variant="link" onClick={onBuild}>
              Build Network <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </article>
        <article>
          <FileSpreadsheet aria-hidden="true" />
          <div>
            <h3>Start with your data</h3>
            <p>
              Import Excel or paired CSV files, or pick up where you left off
              with a JSON backup.
            </p>
            <Button variant="link" onClick={onImport}>
              Import Network <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </article>
      </section>

      <section
        aria-label="Saved networks"
        className="saved-network-list home-saved"
      >
        <h3>
          Continue your work <span>Saved on this device</span>
        </h3>
        {networks.length ? (
          <div>
            {networks.map((n) => (
              <Button key={n.id} variant="outline" onClick={() => onOpen(n.id)}>
                {n.name} · {n.facilities.length} facilities
              </Button>
            ))}
          </div>
        ) : (
          <p>
            Your saved networks will appear here. Build or import one to begin.
          </p>
        )}
      </section>

      <section
        className="home-section"
        id="product"
        aria-labelledby="product-title"
      >
        <div className="section-heading">
          <span className="home-overline">
            FROM CONNECTIONS TO CONSEQUENCES
          </span>
          <h2 id="product-title">A clearer view of what happens next.</h2>
          <p>
            For supply chain teams, analysts, and learners exploring the
            dependencies behind operational risk.
          </p>
        </div>
        <div className="resilience-loop">
          {[
            ['Build', 'Map your facilities and the flow between them.'],
            ['Break', 'Test a shutdown before you face one.'],
            ['Understand', 'Trace delays, exposure, and inventory depletion.'],
            ['Respond', 'Compare available responses in the Demo Network.'],
          ].map(([title, copy], index) => (
            <div key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
        <div className="capability-grid">
          {[
            {
              icon: Globe2,
              title: 'Your network, in context',
              copy: 'Model suppliers, factories, ports, distribution centers, and markets on a geographic map. Inspect every facility and directional route.',
              detail: 'Visual network modeling',
            },
            {
              icon: FileSpreadsheet,
              title: 'From spreadsheet to supply chain',
              copy: 'Import Excel or paired CSV files with validation and a preview before saving. Edit imported networks with the same visual builder.',
              detail: 'Excel · CSV · JSON backups',
            },
            {
              icon: ShieldAlert,
              title: 'Follow the disruption downstream',
              copy: 'Shut down any facility and trace affected dependencies, estimated delays, and the resulting service and cost impact.',
              detail: 'Explainable scenario analysis',
            },
            {
              icon: Boxes,
              title: 'See where the buffer runs out',
              copy: 'Use inventory and demand to estimate stockouts and protection. Inspect capacity, transit time, reliability, and other stored operational data.',
              detail: 'Inventory & operational context',
            },
          ].map(({ icon: Icon, title, copy, detail }) => (
            <article key={title}>
              <Icon aria-hidden="true" />
              <span className="capability-label">{detail}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="home-section how-section"
        id="how-it-works"
        aria-labelledby="how-title"
      >
        <div className="section-heading">
          <span className="home-overline">HOW TWINCHAIN WORKS</span>
          <h2 id="how-title">One network. Three steps to insight.</h2>
        </div>
        <ol className="workflow-steps">
          <li>
            <span>01</span>
            <h3>Build or import</h3>
            <p>
              Start on the map or bring in your facilities and routes. Add
              inventory and demand where you have them.
            </p>
          </li>
          <li>
            <span>02</span>
            <h3>Run a scenario</h3>
            <p>
              Select a facility and shutdown duration. TwinChain follows its
              downstream dependencies.
            </p>
          </li>
          <li>
            <span>03</span>
            <h3>Understand the impact</h3>
            <p>
              Inspect risk, projected stockouts, and business KPIs. Explore
              mitigation comparison in the Demo Network.
            </p>
          </li>
        </ol>
        <Button variant="link" onClick={onAbout}>
          Understand the methodology <ArrowRight aria-hidden="true" />
        </Button>
      </section>

      <section className="home-use-cases" aria-labelledby="uses-title">
        <div>
          <Workflow aria-hidden="true" />
          <h2 id="uses-title">Make risk easier to explain.</h2>
          <p>
            A shared view for exploring assumptions, discussing tradeoffs, and
            learning how supply chains respond.
          </p>
        </div>
        <ul>
          <li>Resilience & scenario exploration</li>
          <li>Network design discussions</li>
          <li>Training & education</li>
          <li>Operational risk communication</li>
        </ul>
      </section>

      <ProductFooter onAbout={onAbout} />
    </main>
  );
}
