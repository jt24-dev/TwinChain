import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
        <DialogTitle>About TwinChain</DialogTitle>
        <DialogDescription>
          Supply Chain Resilience Intelligence · Model assumptions and
          methodology.
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
