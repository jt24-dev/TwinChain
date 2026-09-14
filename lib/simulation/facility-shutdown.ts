import type { Facility, Route } from '../data/network.ts';
import {
  baseline,
  IMPACT_MODEL,
  type KPIs,
  type SimulationResult,
} from './model.ts';
import { simulateDisruption } from './propagate-disruption.ts';
import { applyInventoryImpact } from './inventory.ts';

export interface FacilityShutdown {
  type: 'facility-shutdown';
  facilityId: string;
  durationDays: number;
}

// Illustrative topology-only cost/service assumptions, before the inventory adjustment.
export const CUSTOM_MODEL = {
  facilityBaselineCost: 50000,
  routeBaselineCost: 25000,
  shutdownCostPerDay: 500,
  maximumServicePenalty: 40,
  sourceWeight: 3,
} as const;

export function customBaseline(
  nodes: readonly Facility[],
  routes: readonly Route[],
): KPIs {
  return {
    ...baseline,
    logisticsCost:
      nodes.length * CUSTOM_MODEL.facilityBaselineCost +
      routes.length * CUSTOM_MODEL.routeBaselineCost,
  };
}

export function customBaselineState(
  nodes: readonly Facility[],
  routes: readonly Route[],
): SimulationResult {
  return {
    active: false,
    facilities: nodes.map((n) => ({
      ...n,
      status: 'operational',
      impact: null,
    })),
    routes: routes.map((r) => ({ ...r, status: 'operational' })),
    atRiskFacilityIds: [],
    blockedRouteIds: [],
    affectedRouteIds: [],
    kpis: customBaseline(nodes, routes),
  };
}

/** Both demo and custom shutdowns use the same directed BFS and route/delay rules. */
export function runFacilityShutdown(
  nodes: readonly Facility[],
  routes: readonly Route[],
  input: FacilityShutdown,
  profile: 'custom' | 'demo' = 'custom',
): SimulationResult {
  if (input.type !== 'facility-shutdown')
    throw new Error('Unsupported disruption type.');
  if (
    !Number.isInteger(input.durationDays) ||
    input.durationDays < 1 ||
    input.durationDays > 90
  )
    throw new Error(
      'Shutdown duration must be a whole number from 1 to 90 days.',
    );
  const result = simulateDisruption(
    nodes,
    routes,
    input.facilityId,
    input.durationDays,
  );
  if (profile === 'demo')
    return applyInventoryImpact(result, input.durationDays, profile);
  const base = customBaseline(nodes, routes);
  const impacted = result.facilities.filter((n) => n.impact);
  const weight = impacted.reduce(
    (sum, n) =>
      sum +
      (n.impact!.severity === 'disrupted'
        ? CUSTOM_MODEL.sourceWeight
        : IMPACT_MODEL.severityWeight[n.impact!.severity]),
    0,
  );
  // Normalize by network size: one localized shutdown has less portfolio impact in a larger network.
  const exposure = weight / (nodes.length * CUSTOM_MODEL.sourceWeight);
  const penalty =
    (exposure * CUSTOM_MODEL.maximumServicePenalty * input.durationDays) /
    IMPACT_MODEL.referenceDurationDays;
  const meanDelay =
    impacted.reduce((sum, n) => sum + n.impact!.additionalDelayDays, 0) /
    nodes.length;
  return applyInventoryImpact(
    {
      ...result,
      kpis: {
        facilitiesAtRisk: result.atRiskFacilityIds.length, // Excludes the shutdown source.
        serviceLevel: Math.round(
          Math.max(IMPACT_MODEL.serviceLevelFloor, base.serviceLevel - penalty),
        ),
        leadTime: Math.round(base.leadTime + meanDelay),
        logisticsCost:
          base.logisticsCost +
          (result.kpis.logisticsCost - baseline.logisticsCost) +
          input.durationDays * CUSTOM_MODEL.shutdownCostPerDay,
      },
    },
    input.durationDays,
    profile,
  );
}
