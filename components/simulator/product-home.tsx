import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { SupplyNetwork } from '@/lib/networks';
export function ProductHome({
  networks,
  onDemo,
  onBuild,
  onImport,
  onOpen,
}: {
  networks: SupplyNetwork[];
  onDemo: () => void;
  onBuild: () => void;
  onImport: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <main className="product-home">
      <span className="eyebrow">BUILD · STRESS-TEST · UNDERSTAND</span>
      <h2>
        See where your supply chain
        <br />
        can bend—and where it breaks.
      </h2>
      <p className="home-intro">
        Build or import a supply chain network, test a facility shutdown, and
        explore downstream delays, inventory buffers and projected stockouts.
      </p>
      <div className="entry-actions">
        <article>
          <span>01 / EXPLORE</span>
          <h3>A connected global network</h3>
          <p>
            Try the Shanghai closure and compare mitigation responses with
            illustrative sample data.
          </p>
          <Button onClick={onDemo}>Try Demo Network</Button>
        </article>
        <article>
          <span>02 / CREATE</span>
          <h3>Start with your connections</h3>
          <p>
            Place facilities and connect directional routes. Add operational
            detail when you’re ready.
          </p>
          <Button variant="outline" onClick={onBuild}>
            Build a Network
          </Button>
        </article>
        <article>
          <span>03 / IMPORT</span>
          <h3>Bring your network into view</h3>
          <p>
            Use Facilities and Routes worksheets, paired CSV files, or restore a
            simulator JSON backup.
          </p>
          <Button variant="outline" onClick={onImport}>
            Import a Network
          </Button>
        </article>
      </div>
      <p className="home-workflow">
        Build or Import → Simulate Disruption → Analyze Impact
      </p>
      <section aria-label="Saved networks" className="saved-network-list">
        <h3>Your saved networks</h3>
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
            No Custom Networks yet. Build one or import a file to get started.
          </p>
        )}
      </section>
      <PrivacyNote />
    </main>
  );
}
export function PrivacyNote() {
  return (
    <p className="privacy-note">
      Files are processed in your browser and are not uploaded. Custom Networks
      are saved only in this browser, on this device; they don’t sync. Clearing
      browser data may remove them. Export JSON backups to keep a copy.
    </p>
  );
}
export function AboutProduct({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="product-info-dialog">
        <DialogTitle>About the simulator</DialogTitle>
        <DialogDescription>
          Build, visualize and stress-test supply chain networks.
        </DialogDescription>
        <p>
          This portfolio project explores resilience through deterministic
          downstream propagation, aggregate inventory depletion, projected
          stockouts and illustrative KPIs. It is not a forecasting or enterprise
          planning system.
        </p>
        <p>
          Shutdown impact starts on Day 0. Normal inbound routes retain their
          share of supply; blocked or affected routes do not. Comparable route
          capacities can weight that share. The model does not transfer upstream
          buffers, track goods in transit, or model SKUs and replenishment.
        </p>
        <p>
          Missing inventory data uses topology-based risk. Simulated inventory
          never overwrites starting values. Demo data is fictional; mitigation
          comparison is available on the Demo Network.
        </p>
        <PrivacyNote />
      </DialogContent>
    </Dialog>
  );
}
