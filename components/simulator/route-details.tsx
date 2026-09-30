import { Button } from '@/components/ui/button';
import type { ImpactedRoute, ImpactedFacility } from '@/lib/simulation/model';
import { disruptionLabels, type Disruption } from '@/lib/simulation/disruption';
import { OperationsDetails } from './operational-data';
import { RouteModeIndicator } from './route-mode-indicator';
export function RouteDetails({
  route,
  facilities,
  disruption,
  onDismiss,
}: {
  route: ImpactedRoute;
  facilities: ImpactedFacility[];
  disruption?: Disruption;
  onDismiss: () => void;
}) {
  const name = (id: string) => facilities.find((f) => f.id === id)?.name ?? id;
  return (
    <aside className="facility-inspector" aria-label="Selected route details">
      <div className="inspector-title">
        <h3>
          {name(route.from)} → {name(route.to)}
        </h3>
        <Button variant="ghost" onClick={onDismiss}>
          Dismiss route
        </Button>
      </div>
      <div className="route-detail-meta">
        <RouteModeIndicator mode={route.mode} />
        <span className={`route-state-chip ${route.status}`}>
          {route.status === 'operational'
            ? 'Normal'
            : route.status === 'blocked'
              ? 'Blocked'
              : 'Affected'}
        </span>
      </div>
      <OperationsDetails kind="route" data={route} />
      {disruption?.type === 'route-closure' &&
        disruption.routeId === route.id && (
          <p>
            {disruptionLabels[disruption.type]} · selected connection
            unavailable for {disruption.durationDays} days. Other routes remain
            available.
          </p>
        )}
      {route.alternate && <p>Selected alternate mitigation connection</p>}
    </aside>
  );
}
