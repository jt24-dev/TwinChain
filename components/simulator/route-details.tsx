import { Button } from '@/components/ui/button';
import type { ImpactedRoute, ImpactedFacility } from '@/lib/simulation/model';
import { OperationsDetails } from './operational-data';
export function RouteDetails({
  route,
  facilities,
  onDismiss,
}: {
  route: ImpactedRoute;
  facilities: ImpactedFacility[];
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
      <p>
        {route.mode} ·{' '}
        {route.status === 'operational'
          ? 'Normal'
          : route.status === 'blocked'
            ? 'Blocked'
            : 'Affected'}
      </p>
      <OperationsDetails kind="route" data={route} />
    </aside>
  );
}
