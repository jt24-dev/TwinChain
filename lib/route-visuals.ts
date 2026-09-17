import type { Route } from './data/network.ts';

export interface RouteModeVisual {
  token: string;
  label: Route['mode'];
  description: string;
}

/** Shared semantic mapping for renderer, legend, and details. */
export const ROUTE_MODE_VISUALS = {
  Ocean: {
    token: 'ocean',
    label: 'Ocean',
    description: 'Long-dash deep-sea lane',
  },
  Truck: {
    token: 'truck',
    label: 'Truck',
    description: 'Solid road-freight lane',
  },
  Rail: {
    token: 'rail',
    label: 'Rail',
    description: 'Track-style dash pattern',
  },
  Air: {
    token: 'air',
    label: 'Air',
    description: 'Light dot-dash aerial lane',
  },
  Road: { token: 'road', label: 'Road', description: 'Short-dash ground lane' },
  Feeder: {
    token: 'feeder',
    label: 'Feeder',
    description: 'Thin short-haul connector',
  },
} as const satisfies Record<Route['mode'], RouteModeVisual>;

export const routeModeVisuals = Object.values(ROUTE_MODE_VISUALS);

export function routeModeClass(mode: Route['mode']) {
  return `mode-${ROUTE_MODE_VISUALS[mode].token}`;
}
