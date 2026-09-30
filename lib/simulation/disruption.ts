import type { Facility, Route } from '../data/network.ts';
import type { FacilityInventory, SkuSourcing } from '../sku-inventory.ts';
import { applyInventoryImpact } from './inventory.ts';
import { customBaseline, runFacilityShutdown } from './facility-shutdown.ts';
import {
  IMPACT_MODEL,
  type ImpactedFacility,
  type ImpactedRoute,
  type SimulationResult,
} from './model.ts';

/** Serializable inputs shared by the UI, saved scenarios, and future commands. */
export type Disruption =
  | { type: 'facility-shutdown'; facilityId: string; durationDays: number }
  | { type: 'shipment-delay'; facilityId: string; durationDays: number }
  | { type: 'route-closure'; routeId: string; durationDays: number }
  | {
      type: 'capacity-reduction';
      facilityId: string;
      durationDays: number;
      remainingCapacityPercent: number;
    };

export const disruptionLabels: Record<Disruption['type'], string> = {
  'facility-shutdown': 'Facility Shutdown',
  'shipment-delay': 'Shipment Delay',
  'route-closure': 'Route Closure',
  'capacity-reduction': 'Capacity Reduction',
};

export function parseDisruption(value: unknown): Disruption {
  if (!value || typeof value !== 'object')
    throw new Error('Disruption input is required.');
  const input = value as Record<string, unknown>;
  // Earlier saved scenarios have no type. They always represented shutdowns.
  const type = input.type ?? 'facility-shutdown';
  const days = input.durationDays;
  if (!Number.isInteger(days) || (days as number) < 1 || (days as number) > 90)
    throw new Error('Disruption duration must be 1–90 whole days.');
  if (type === 'route-closure') {
    if (typeof input.routeId !== 'string' || !input.routeId.trim())
      throw new Error('Select an existing route.');
    return { type, routeId: input.routeId, durationDays: days as number };
  }
  if (
    type !== 'facility-shutdown' &&
    type !== 'shipment-delay' &&
    type !== 'capacity-reduction'
  )
    throw new Error('Unsupported disruption type.');
  if (typeof input.facilityId !== 'string' || !input.facilityId.trim())
    throw new Error('Select an existing facility.');
  if (type === 'capacity-reduction') {
    const remaining = input.remainingCapacityPercent;
    if (
      typeof remaining !== 'number' ||
      !Number.isFinite(remaining) ||
      remaining < 0 ||
      remaining > 100
    )
      throw new Error('Remaining capacity must be from 0% to 100%.');
    return {
      type,
      facilityId: input.facilityId,
      durationDays: days as number,
      remainingCapacityPercent: remaining,
    };
  }
  return { type, facilityId: input.facilityId, durationDays: days as number };
}

// Illustrative partial-flow assumptions. Delay is temporary: flow resumes after its window.
export const PARTIAL_FLOW_MODEL = {
  maximumServicePenalty: 40,
  affectedRouteCostPerDay: 1200,
  closedRouteCostPerDay: 4000,
  exposedFacilityCostPerDay: 300,
  delayCostPerDay: 200,
  capacityCostPerDay: 350,
} as const;

/** Shared partial-flow path for the three non-shutdown types. No automatic rerouting. */
export function runDisruption(
  nodes: readonly Facility[],
  routes: readonly Route[],
  rawInput: Disruption,
  profile: 'custom' | 'demo' = 'custom',
  inventoryRecords?: FacilityInventory[],
  skuSourcing?: SkuSourcing[],
): SimulationResult {
  const input = parseDisruption(rawInput);
  if (input.type === 'facility-shutdown') {
    const result = runFacilityShutdown(
      nodes,
      routes,
      input,
      profile,
      inventoryRecords,
      skuSourcing,
    );
    return result;
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const routeById = new Map(routes.map((route) => [route.id, route]));
  if (nodeById.size !== nodes.length || routeById.size !== routes.length)
    throw new Error('Network IDs must be unique.');
  for (const route of routes)
    if (!nodeById.has(route.from) || !nodeById.has(route.to))
      throw new Error(`Route ${route.id} references an unknown facility.`);
  const targetRoute =
    input.type === 'route-closure' ? routeById.get(input.routeId) : undefined;
  const targetId =
    input.type === 'route-closure' ? targetRoute?.to : input.facilityId;
  if (!targetId || !nodeById.has(targetId))
    throw new Error(
      input.type === 'route-closure' ? 'Unknown route.' : 'Unknown facility.',
    );
  const initialAvailability =
    input.type === 'capacity-reduction'
      ? input.remainingCapacityPercent / 100
      : 0;
  if (initialAvailability === 1) {
    const base = customBaseline(nodes, routes);
    return {
      active: true,
      disruption: input,
      facilities: nodes.map((node) => ({
        ...node,
        status: 'operational',
        impact: null,
      })),
      routes: routes.map((route) => ({ ...route, status: 'operational' })),
      atRiskFacilityIds: [],
      blockedRouteIds: [],
      affectedRouteIds: [],
      kpis: base,
    };
  }
  const outgoing = new Map<string, Route[]>();
  const inbound = new Map<string, Route[]>();
  for (const route of routes) {
    outgoing.set(route.from, [...(outgoing.get(route.from) ?? []), route]);
    inbound.set(route.to, [...(inbound.get(route.to) ?? []), route]);
  }
  const hops = new Map<string, number>([[targetId, 0]]);
  const queue = [targetId];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const route of outgoing.get(current) ?? []) {
      if (hops.has(route.to)) continue;
      hops.set(route.to, hops.get(current)! + 1);
      queue.push(route.to);
    }
  }
  const routeFactor = (route: Route) =>
    input.type === 'route-closure' && route.id === input.routeId ? 0 : 1;
  const availability = new Map<string, number>();
  for (const id of queue) {
    if (id === targetId && input.type !== 'route-closure') {
      availability.set(id, initialAvailability);
      continue;
    }
    const incoming = inbound.get(id) ?? [];
    const weighted =
      incoming.length > 0 &&
      incoming.every(
        (route) => route.routeCapacity !== undefined && route.routeCapacity > 0,
      );
    const total = incoming.reduce(
      (sum, route) => sum + (weighted ? route.routeCapacity! : 1),
      0,
    );
    const available = incoming.reduce((sum, route) => {
      // Only forward edges in the shortest-path traversal propagate risk; back edges
      // in a cycle use normal flow and cannot repeatedly amplify loss.
      const upstream =
        (hops.get(route.from) ?? Infinity) < hops.get(id)!
          ? (availability.get(route.from) ?? 1)
          : 1;
      return (
        sum +
        (weighted ? route.routeCapacity! : 1) * upstream * routeFactor(route)
      );
    }, 0);
    availability.set(id, total ? available / total : 1);
  }
  const source = nodeById.get(targetId)!;
  const facilities: ImpactedFacility[] = nodes.map((node) => {
    const loss = 1 - (availability.get(node.id) ?? 1);
    if (loss <= 0.000001)
      return { ...node, status: 'operational', impact: null };
    const distance = hops.get(node.id) ?? 0;
    const severity =
      loss >= 0.75 && distance <= 1
        ? 'high'
        : loss >= 0.35 && distance <= 2
          ? 'medium'
          : 'low';
    const delay =
      input.type === 'shipment-delay'
        ? input.durationDays * IMPACT_MODEL.delayRetentionPerHop ** distance
        : input.durationDays *
          loss *
          IMPACT_MODEL.delayRetentionPerHop ** distance;
    return {
      ...node,
      status: 'at risk',
      impact: {
        severity,
        hops: distance,
        sourceFacilityId: targetId,
        sourceName: source.name,
        disruptionType: input.type,
        supplyAvailability: 1 - loss,
        additionalDelayDays: Math.round(delay * 10) / 10,
      },
    };
  });
  const impactedRoutes: ImpactedRoute[] = routes.map((route) => ({
    ...route,
    supplyAvailability: routeFactor(route),
    status:
      routeFactor(route) === 0
        ? 'blocked'
        : (availability.get(route.from) ?? 1) < 0.999999
          ? 'affected'
          : 'operational',
  }));
  const blockedRouteIds = impactedRoutes
    .filter((r) => r.status === 'blocked')
    .map((r) => r.id);
  const affectedRouteIds = impactedRoutes
    .filter((r) => r.status === 'affected')
    .map((r) => r.id);
  const exposed = facilities.filter((f) => f.impact);
  const atRiskFacilityIds = exposed.map((f) => f.id);
  const base = customBaseline(nodes, routes);
  const lossWeight = exposed.reduce(
    (sum, f) =>
      sum +
      (1 - f.impact!.supplyAvailability!) *
        (f.impact!.severity === 'disrupted'
          ? 3
          : IMPACT_MODEL.severityWeight[f.impact!.severity]),
    0,
  );
  const penalty =
    ((lossWeight / Math.max(1, nodes.length * 3)) *
      PARTIAL_FLOW_MODEL.maximumServicePenalty *
      input.durationDays) /
    IMPACT_MODEL.referenceDurationDays;
  const typeCost =
    input.type === 'shipment-delay'
      ? PARTIAL_FLOW_MODEL.delayCostPerDay
      : input.type === 'capacity-reduction'
        ? PARTIAL_FLOW_MODEL.capacityCostPerDay * (1 - initialAvailability)
        : 0;
  const result: SimulationResult = {
    disruption: input,
    active: true,
    facilities,
    routes: impactedRoutes,
    atRiskFacilityIds,
    blockedRouteIds,
    affectedRouteIds,
    ...(inventoryRecords?.length
      ? { inventoryRecords: inventoryRecords.map((record) => ({ ...record })) }
      : {}),
    ...(skuSourcing?.length
      ? { skuSourcing: skuSourcing.map((source) => ({ ...source })) }
      : {}),
    kpis: {
      facilitiesAtRisk: atRiskFacilityIds.length,
      serviceLevel: Math.round(
        Math.max(IMPACT_MODEL.serviceLevelFloor, base.serviceLevel - penalty),
      ),
      leadTime: Math.round(
        base.leadTime +
          exposed.reduce((sum, f) => sum + f.impact!.additionalDelayDays, 0) /
            Math.max(1, nodes.length),
      ),
      logisticsCost:
        base.logisticsCost +
        input.durationDays *
          (blockedRouteIds.length * PARTIAL_FLOW_MODEL.closedRouteCostPerDay +
            affectedRouteIds.length *
              PARTIAL_FLOW_MODEL.affectedRouteCostPerDay +
            atRiskFacilityIds.length *
              PARTIAL_FLOW_MODEL.exposedFacilityCostPerDay +
            typeCost),
    },
  };
  return applyInventoryImpact(result, input.durationDays, profile);
}
