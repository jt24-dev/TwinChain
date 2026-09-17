import type { Route } from '@/lib/data/network';
import { ROUTE_MODE_VISUALS, routeModeClass } from '@/lib/route-visuals';

export function RouteModeSample({ mode }: { mode: Route['mode'] }) {
  return (
    <svg className="route-mode-sample" viewBox="0 0 34 8" aria-hidden="true">
      <path className={routeModeClass(mode)} d="M1 4 H33" pathLength="34" />
    </svg>
  );
}

export function RouteModeIndicator({ mode }: { mode: Route['mode'] }) {
  const visual = ROUTE_MODE_VISUALS[mode];
  return (
    <span className="route-mode-chip" title={visual.description}>
      <RouteModeSample mode={mode} />
      <span>Mode: {visual.label}</span>
    </span>
  );
}
