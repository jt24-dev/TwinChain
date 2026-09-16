import { Button } from '@/components/ui/button';
import type { SupplyNetwork } from '@/lib/networks';

export function WorkspaceHome({
  networks,
  onOpen,
  onCreate,
  onImport,
  onDemo,
}: {
  networks: SupplyNetwork[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
  onDemo: () => void;
}) {
  return (
    <main className="workspace-home">
      <div className="overview-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE · v0.13A</div>
          <h2>Choose your next network.</h2>
          <p>Continue a saved network, build your own, or import your data.</p>
        </div>
      </div>
      <div className="workspace-actions">
        <Button onClick={onCreate}>Create New Network</Button>
        <Button variant="outline" onClick={onImport}>
          Import Network
        </Button>
        <Button variant="outline" onClick={onDemo}>
          Try Demo Network
        </Button>
      </div>
      <section aria-labelledby="saved-title">
        <h3 id="saved-title">Saved networks</h3>
        {networks.length ? (
          <ul className="workspace-saved">
            {networks.map((n) => (
              <li key={n.id}>
                <div>
                  <strong>{n.name}</strong>
                  <p>
                    {n.facilities.length} facilities · {n.routes.length} routes
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => onOpen(n.id)}
                  aria-label={`Open ${n.name}`}
                >
                  Open network
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="privacy-note">
            No saved Custom Networks yet. Create or import one to get started.
          </p>
        )}
      </section>
      <p className="privacy-note">
        Saved in this browser only. Export JSON backups to keep a portable copy.
      </p>
    </main>
  );
}
