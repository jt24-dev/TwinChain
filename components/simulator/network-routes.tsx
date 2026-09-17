import type { Facility } from '@/lib/data/network';
import type { ImpactedRoute } from '@/lib/simulation/model';
import { routeGeometry } from '@/lib/map-projection';
import { routeModeClass } from '@/lib/route-visuals';
import { useMemo } from 'react';
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
  const geometry = useMemo(() => {
    const byId = new Map(facilities.map((f) => [f.id, f]));
    return routes.map((r) => {
      const from = byId.get(r.from),
        to = byId.get(r.to);
      return {
        r,
        from,
        to,
        d:
          from && to
            ? routeGeometry(
                from,
                to,
                ['Ocean', 'Feeder', 'Air'].includes(r.mode),
              )
            : '',
      };
    });
  }, [facilities, routes]);
  return (
    <g>
      {geometry.map(({ r, from, to, d }) => {
        if (!from || !to) return null;
        const modeClass = routeModeClass(r.mode);
        return (
          <g
            key={r.id}
            data-route-id={r.id}
            data-route-status={r.status}
            data-alternate={r.alternate || undefined}
            data-transport-mode={r.mode}
          >
            <path
              d={d}
              fill="none"
              className={`route ${modeClass} ${r.status} ${r.alternate ? 'alternate' : ''} ${selectedRoute === r.id ? 'route-selected' : ''}`}
              markerEnd={onSelect ? 'url(#route-direction)' : undefined}
            >
              <title>{`${from.name} → ${to.name} · ${r.mode} · ${r.status}`}</title>
            </path>
            {r.status !== 'blocked' && (
              <path
                d={d}
                fill="none"
                className={`route-flow ${modeClass} ${r.status} ${r.alternate ? 'alternate' : ''}`}
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
