import type { Route } from './data/network.ts';

export interface RouteModeVisual {
  token: string;
  label: Route['mode'];
  description: string;
  glyph: 'ship' | 'truck' | 'train' | 'plane' | 'road' | 'feeder';
}

/** Shared semantic mapping for renderer, legend, and details. */
export const ROUTE_MODE_VISUALS = {
  Ocean: {
    token: 'ocean',
    label: 'Ocean',
    description: 'Heavy long-dash lane with ship marker',
    glyph: 'ship',
  },
  Truck: {
    token: 'truck',
    label: 'Truck',
    description: 'Heavy solid freight lane with truck marker',
    glyph: 'truck',
  },
  Rail: {
    token: 'rail',
    label: 'Rail',
    description: 'Track-and-tie lane with train marker',
    glyph: 'train',
  },
  Air: {
    token: 'air',
    label: 'Air',
    description: 'Light dot-dash arc with airplane marker',
    glyph: 'plane',
  },
  Road: {
    token: 'road',
    label: 'Road',
    description: 'Medium short-dash lane with road marker',
    glyph: 'road',
  },
  Feeder: {
    token: 'feeder',
    label: 'Feeder',
    description: 'Thin dotted connector with feeder marker',
    glyph: 'feeder',
  },
} as const satisfies Record<Route['mode'], RouteModeVisual>;

export const routeModeVisuals = Object.values(ROUTE_MODE_VISUALS);

export function routeModeClass(mode: Route['mode']) {
  return `mode-${ROUTE_MODE_VISUALS[mode].token}`;
}

/** Returns the midpoint of the longest visible subpath, avoiding map-seam jumps. */
export function routeMarkerPoint(path: string) {
  const subpaths: Array<Array<{ x: number; y: number }>> = [];
  const command = /([ML])(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  let current: Array<{ x: number; y: number }> = [];

  while ((match = command.exec(path))) {
    if (match[1] === 'M') {
      if (current.length) subpaths.push(current);
      current = [];
    }
    current.push({ x: Number(match[2]), y: Number(match[3]) });
  }
  if (current.length) subpaths.push(current);

  let best: Array<{ x: number; y: number }> | undefined;
  let bestLength = -1;
  for (const points of subpaths) {
    const length = points.slice(1).reduce((total, point, index) => {
      const previous = points[index];
      return total + Math.hypot(point.x - previous.x, point.y - previous.y);
    }, 0);
    if (length > bestLength) {
      best = points;
      bestLength = length;
    }
  }
  if (!best?.length) return null;
  if (bestLength <= 0) return best[0];

  const target = bestLength / 2;
  let travelled = 0;
  for (let index = 1; index < best.length; index++) {
    const previous = best[index - 1];
    const point = best[index];
    const segment = Math.hypot(point.x - previous.x, point.y - previous.y);
    if (travelled + segment >= target) {
      const ratio = (target - travelled) / segment;
      return {
        x: previous.x + (point.x - previous.x) * ratio,
        y: previous.y + (point.y - previous.y) * ratio,
      };
    }
    travelled += segment;
  }
  return best[best.length - 1] ?? null;
}
