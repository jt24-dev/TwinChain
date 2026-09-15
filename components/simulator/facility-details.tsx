import { X, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImpactedFacility } from '@/lib/simulation/model';
import { facilityStatusLabel } from './impact-display';
import { OperationsDetails } from './operational-data';
import { InventoryDetails } from './inventory-impact';
export function FacilityDetails({
  facility,
  active,
  onDismiss,
}: {
  facility?: ImpactedFacility;
  active: boolean;
  onDismiss: () => void;
}) {
  return (
    <aside
      className="facility-inspector"
      aria-label="Selected facility details"
      aria-live="polite"
    >
      {facility ? (
        <>
          <div className="inspector-title">
            <div>
              <span className="inspector-eyebrow">SELECTED FACILITY</span>
              <h3>{facility.name}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss facility details"
              onClick={onDismiss}
            >
              <X size={16} />
            </Button>
          </div>
          <div className="inspector-fields">
            <span>{facility.type}</span>
            <span>
              {[facility.region, facility.city, facility.country]
                .filter(Boolean)
                .join(' · ') || 'Location not labeled'}
            </span>
            <span
              className={`inspector-status ${facility.status.replace(' ', '-')} risk-${facility.impact?.severity ?? 'normal'}`}
            >
              {facility.status === 'operational'
                ? `● ${facilityStatusLabel(facility)}`
                : facility.status === 'at risk'
                  ? `▲ ${facilityStatusLabel(facility)}`
                  : '■ Disrupted'}
            </span>
          </div>
          <OperationsDetails kind="facility" data={facility} />
          <p className="coordinate-context">
            {facility.latitude.toFixed(4)}° latitude ·{' '}
            {facility.longitude.toFixed(4)}° longitude
          </p>
          <InventoryDetails facility={facility} />
          <p>
            {!active
              ? 'No active disruption.'
              : facility.status === 'disrupted'
                ? `Source: ${facility.impact?.sourceName} · 0 hops · Shutdown: ${facility.impact?.additionalDelayDays} days. Estimated local delay: +${facility.impact?.additionalDelayDays} days. Connected routes are blocked.`
                : facility.mitigation
                  ? `Source: ${facility.impact?.sourceName} · ${facility.impact?.hops} ${facility.impact?.hops === 1 ? 'hop' : 'hops'} downstream · Delay: +${facility.mitigation.originalDelayDays} → +${facility.impact?.additionalDelayDays} days · ${facility.mitigation.name}`
                  : facility.status === 'at risk'
                    ? `Source: ${facility.impact?.sourceName} · ${facility.impact?.hops} ${facility.impact?.hops === 1 ? 'hop' : 'hops'} downstream · Estimated delay: +${facility.impact?.additionalDelayDays} days`
                    : 'Not marked at risk in this scenario.'}
          </p>
        </>
      ) : (
        <div className="inspector-empty">
          <MousePointer2 size={18} />
          <div>
            <strong>Inspect a facility</strong>
            <p>
              Select any facility to keep its location and disruption status in
              view.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
