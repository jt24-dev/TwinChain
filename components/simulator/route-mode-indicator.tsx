import type { Route } from '@/lib/data/network';
import { ROUTE_MODE_VISUALS, routeModeClass } from '@/lib/route-visuals';
import {
  Plane,
  Route as Road,
  Ship,
  TrainFront,
  Truck,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';

const modeIcons: Record<Route['mode'], LucideIcon> = {
  Ocean: Ship,
  Truck,
  Rail: TrainFront,
  Air: Plane,
  Road,
  Feeder: Waypoints,
};

export function RouteModeGlyph({
  mode,
  size = 12,
}: {
  mode: Route['mode'];
  size?: number;
}) {
  const Icon = modeIcons[mode];
  return <Icon className="route-mode-glyph" width={size} height={size} />;
}

export function RouteModeSample({ mode }: { mode: Route['mode'] }) {
  return (
    <svg className="route-mode-sample" viewBox="0 0 48 14" aria-hidden="true">
      <path className={routeModeClass(mode)} d="M1 7 H47" pathLength="46" />
      {(mode === 'Ocean' || mode === 'Truck' || mode === 'Rail') && (
        <path
          className={`route-mode-accent ${routeModeClass(mode)}`}
          d="M1 7 H47"
          pathLength="46"
        />
      )}
      <g className={`route-mode-sample-glyph ${routeModeClass(mode)}`}>
        <circle cx="24" cy="7" r="6" />
        <foreignObject x="18" y="1" width="12" height="12">
          <RouteModeGlyph mode={mode} size={10} />
        </foreignObject>
      </g>
    </svg>
  );
}

export function RouteModeMarker({
  mode,
  x,
  y,
  scale,
  status,
  alternate,
  selected,
}: {
  mode: Route['mode'];
  x: number;
  y: number;
  scale: number;
  status: 'operational' | 'affected' | 'blocked';
  alternate?: boolean;
  selected?: boolean;
}) {
  return (
    <g
      className={`route-mode-marker ${routeModeClass(mode)} ${status} ${alternate ? 'alternate' : ''} ${selected ? 'selected' : ''}`}
      transform={`translate(${x} ${y}) scale(${1 / scale})`}
      aria-hidden="true"
    >
      <circle className="route-mode-marker-shell" r="8" />
      <foreignObject x="-6" y="-6" width="12" height="12">
        <RouteModeGlyph mode={mode} size={12} />
      </foreignObject>
    </g>
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
