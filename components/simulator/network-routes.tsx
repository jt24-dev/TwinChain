import type { Facility } from '@/lib/data/network';
import type { ImpactedRoute } from '@/lib/simulation/model';
import { facilityPoint } from '@/lib/map-projection';
export function NetworkRoutes({
  routes,
  facilities,
  demoLayout,
  selectedRoute,
  onSelect,
  selectionLabel = 'Edit route',
}: {
  routes: ImpactedRoute[];
  facilities: Facility[];
  demoLayout: boolean;
  selectedRoute?: string;
  onSelect?: (id: string) => void;
  selectionLabel?: string;
}) {
  const facilityById = Object.fromEntries(facilities.map((f) => [f.id, f]));
  return (
    <g>
      {routes.map((r) => {
        const from = facilityById[r.from],
          to = facilityById[r.to];
        if (!from || !to) return null;
        const [x1, y1] = facilityPoint(from, demoLayout),
          [x2, y2] = facilityPoint(to, demoLayout);
        const bend =
          r.mode === 'Ocean' ? Math.min(Math.abs(x2 - x1) * 0.25, 90) : 8;
        const d =
          demoLayout && r.id === 'r10'
            ? `M ${x1} ${y1} Q 340 365 220 300 Q 90 245 ${x2} ${y2}`
            : `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - bend} ${x2} ${y2}`;
        return (
          <g
            key={r.id}
            data-route-id={r.id}
            data-route-status={r.status}
            data-alternate={r.alternate || undefined}
          >
            <path
              d={d}
              fill="none"
              className={`route ${r.status} ${r.alternate ? 'alternate' : ''} ${selectedRoute === r.id ? 'route-selected' : ''}`}
              markerEnd={onSelect ? 'url(#route-direction)' : undefined}
            >
              <title>{`${from.name} → ${to.name} · ${r.mode} · ${r.status}`}</title>
            </path>
            {r.status !== 'blocked' && (
              <path
                d={d}
                fill="none"
                className={`route-flow ${r.status} ${r.alternate ? 'alternate' : ''}`}
              />
            )}
            {onSelect && (
              <path
                d={d}
                fill="none"
                className="route-hit"
                data-route-hit={r.id}
                role="button"
                tabIndex={0}
                aria-label={`${selectionLabel}: ${from.name} to ${to.name}, ${r.mode}`}
                aria-pressed={selectedRoute === r.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(r.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelect(r.id);
                  }
                }}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
