import {
  facilities,
  routes,
  type Facility,
  type FacilityType,
  type Route,
} from './data/network.ts';
import type { SimulationResult } from './simulation/model.ts';
import {
  validateOperations,
  operationValues,
  type FacilityOperations,
  type RouteOperations,
} from './operations.ts';

export interface SupplyNetwork {
  id: string;
  name: string;
  kind: 'demo' | 'custom';
  facilities: Facility[];
  routes: Route[];
}
export const facilityTypes: readonly FacilityType[] = [
  'Supplier',
  'Factory',
  'Port',
  'Distribution center',
  'Customer market',
];
export const transportModes: readonly Route['mode'][] = [
  'Ocean',
  'Truck',
  'Rail',
  'Air',
  'Road',
  'Feeder',
];
export const demoNetwork: SupplyNetwork = {
  id: 'demo',
  name: 'Demo Network',
  kind: 'demo',
  facilities,
  routes,
};
export type NetworkView = Pick<
  SimulationResult,
  'active' | 'facilities' | 'routes'
>;
export function normalNetworkView(network: SupplyNetwork): NetworkView {
  return {
    active: false,
    facilities: network.facilities.map((f) => ({
      ...f,
      status: 'operational',
      impact: null,
    })),
    routes: network.routes.map((r) => ({ ...r, status: 'operational' })),
  };
}
function text(
  value: unknown,
  label: string,
  required = true,
): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length > 160 ||
    (required && !value.trim())
  )
    throw new Error(
      `${label} must be ${required ? 'non-empty and ' : ''}160 characters or fewer.`,
    );
}
export function validateNetwork(network: SupplyNetwork): void {
  if (!network || typeof network !== 'object')
    throw new Error('Invalid network.');
  text(network.id, 'Network ID');
  text(network.name, 'Network name');
  if (
    !['demo', 'custom'].includes(network.kind) ||
    !Array.isArray(network.facilities) ||
    !Array.isArray(network.routes)
  )
    throw new Error('Invalid network structure.');
  const ids = new Set<string>();
  for (const f of network.facilities) {
    if (!f || typeof f !== 'object') throw new Error('Invalid facility.');
    validateOperations(f, 'facility');
    text(f.id, 'Facility ID');
    text(f.name, 'Facility name');
    text(f.region, 'Location', false);
    text(f.city, 'City', false);
    if (f.country !== undefined) text(f.country, 'Country', false);
    if (ids.has(f.id)) throw new Error('Facility IDs must be unique.');
    ids.add(f.id);
    if (!facilityTypes.includes(f.type) || f.status !== 'operational')
      throw new Error('Invalid facility type or status.');
    if (
      !Number.isFinite(f.latitude) ||
      Math.abs(f.latitude) > 90 ||
      !Number.isFinite(f.longitude) ||
      Math.abs(f.longitude) > 180
    )
      throw new Error('Invalid facility coordinates.');
  }
  const routeIds = new Set<string>(),
    connections = new Set<string>();
  for (const r of network.routes) {
    if (!r || typeof r !== 'object') throw new Error('Invalid route.');
    validateOperations(r, 'route');
    text(r.id, 'Route ID');
    if (routeIds.has(r.id)) throw new Error('Route IDs must be unique.');
    routeIds.add(r.id);
    if (!ids.has(r.from) || !ids.has(r.to))
      throw new Error('Select an existing origin and destination.');
    if (r.from === r.to)
      throw new Error('Origin and destination must be different facilities.');
    if (!transportModes.includes(r.mode))
      throw new Error('Choose a supported transportation mode.');
    const connection = JSON.stringify([r.from, r.to, r.mode]);
    if (connections.has(connection))
      throw new Error(
        'This directional route and transportation mode already exist.',
      );
    connections.add(connection);
  }
}
export function createNetwork(id: string): SupplyNetwork {
  const network: SupplyNetwork = {
    id,
    name: 'Untitled Network',
    kind: 'custom',
    facilities: [],
    routes: [],
  };
  if (id === 'demo') throw new Error('The Demo Network ID is reserved.');
  validateNetwork(network);
  return network;
}
export type NetworkEdit =
  | { type: 'rename'; name: string }
  | { type: 'add-facility'; facility: Facility }
  | {
      type: 'edit-facility';
      id: string;
      changes: FacilityOperations &
        Partial<
          Pick<
            Facility,
            'name' | 'type' | 'region' | 'city' | 'latitude' | 'longitude'
          >
        >;
    }
  | { type: 'delete-facility'; id: string }
  | { type: 'add-route'; route: Route }
  | {
      type: 'edit-route';
      id: string;
      changes: RouteOperations & Partial<Pick<Route, 'mode' | 'from' | 'to'>>;
    }
  | { type: 'delete-route'; id: string };
export function editNetwork(
  network: SupplyNetwork,
  edit: NetworkEdit,
): SupplyNetwork {
  if (network.kind !== 'custom' || network.id === 'demo')
    throw new Error(
      'Demo Network is read-only. Create a custom network to build.',
    );
  let next = { ...network };
  switch (edit.type) {
    case 'rename':
      next.name = edit.name;
      break;
    case 'add-facility':
      next.facilities = [...network.facilities, { ...edit.facility }];
      break;
    case 'edit-facility':
    case 'delete-facility':
      if (!network.facilities.some((f) => f.id === edit.id))
        throw new Error('Facility no longer exists.');
      next.facilities =
        edit.type === 'edit-facility'
          ? network.facilities.map((f) =>
              f.id === edit.id ? { ...f, ...edit.changes } : f,
            )
          : network.facilities.filter((f) => f.id !== edit.id);
      if (edit.type === 'delete-facility')
        next.routes = network.routes.filter(
          (r) => r.from !== edit.id && r.to !== edit.id,
        );
      break;
    case 'add-route':
      next.routes = [...network.routes, { ...edit.route }];
      break;
    case 'edit-route':
    case 'delete-route':
      if (!network.routes.some((r) => r.id === edit.id))
        throw new Error('Route no longer exists.');
      next.routes =
        edit.type === 'edit-route'
          ? network.routes.map((r) =>
              r.id === edit.id ? { ...r, ...edit.changes } : r,
            )
          : network.routes.filter((r) => r.id !== edit.id);
  }
  validateNetwork(next);
  return next;
}

export interface SavedNetworks {
  version: 1;
  networks: SupplyNetwork[];
  activeNetworkId: string;
}
export const NETWORK_STORAGE_KEY = 'supply-chain-networks-v1';
export const emptySavedNetworks: SavedNetworks = {
  version: 1,
  networks: [],
  activeNetworkId: 'demo',
};
export function serializeNetworks(saved: SavedNetworks): string {
  return JSON.stringify(parseNetworks(JSON.stringify(saved)));
}
export function parseNetworks(raw: string): SavedNetworks {
  const saved = JSON.parse(raw) as SavedNetworks;
  if (!saved || saved.version !== 1 || !Array.isArray(saved.networks))
    throw new Error('Saved networks have an unsupported format.');
  const ids = new Set<string>();
  // Reconstruct only model fields. Stored objects cannot inject UI or simulation state.
  const networks = saved.networks.map((network) => {
    validateNetwork(network);
    if (
      network.kind !== 'custom' ||
      network.id === 'demo' ||
      ids.has(network.id)
    )
      throw new Error('Invalid saved network ID.');
    ids.add(network.id);
    return {
      id: network.id,
      name: network.name,
      kind: 'custom' as const,
      facilities: network.facilities.map((f) => ({
        ...operationValues(f, 'facility'),
        id: f.id,
        name: f.name,
        type: f.type,
        city: f.city,
        region: f.region,
        ...(f.country === undefined ? {} : { country: f.country }),
        latitude: f.latitude,
        longitude: f.longitude,
        status: 'operational' as const,
      })),
      routes: network.routes.map((r) => ({
        ...operationValues(r, 'route'),
        id: r.id,
        from: r.from,
        to: r.to,
        mode: r.mode,
      })),
    };
  });
  return {
    version: 1,
    networks,
    activeNetworkId: ids.has(saved.activeNetworkId)
      ? saved.activeNetworkId
      : 'demo',
  };
}

/** Atomic insertion shared by imported networks; validation completes before returning new state. */
export function addCustomNetwork(
  saved: SavedNetworks,
  network: SupplyNetwork,
): SavedNetworks {
  validateNetwork(network);
  if (
    network.kind !== 'custom' ||
    network.id === 'demo' ||
    saved.networks.some((n) => n.id === network.id)
  )
    throw new Error('Choose a new custom network ID.');
  return {
    ...saved,
    networks: [...saved.networks, network],
    activeNetworkId: network.id,
  };
}
