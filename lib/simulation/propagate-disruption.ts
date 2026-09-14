import type { Facility, Route } from '../data/network.ts';
import {
  baseline,
  IMPACT_MODEL,
  type ImpactedFacility,
  type ImpactedRoute,
  type SimulationResult,
  type KPIs,
} from './model.ts';

/** Directed BFS records the shortest dependency distance once, even with cycles or converging paths. */
export function simulateDisruption(
  nodes: readonly Facility[],
  routes: readonly Route[],
  sourceId: string,
  durationDays: number,
): SimulationResult {
  if (!Number.isFinite(durationDays) || durationDays < 0)
    throw new Error(
      'Disruption duration must be a finite, non-negative number.',
    );
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length)
    throw new Error('Facility IDs must be unique.');
  const source = byId.get(sourceId);
  if (!source) throw new Error(`Unknown disrupted facility: ${sourceId}`);
  const outgoing = new Map<string, Route[]>();
  const routeIds = new Set<string>();
  for (const route of routes) {
    if (!byId.has(route.from) || !byId.has(route.to))
      throw new Error(`Route ${route.id} references an unknown facility.`);
    if (routeIds.has(route.id))
      throw new Error(`Duplicate route ID: ${route.id}`);
    routeIds.add(route.id);
    const edges = outgoing.get(route.from) ?? [];
    edges.push(route);
    outgoing.set(route.from, edges);
  }
  const active = durationDays > 0;
  const hops = new Map<string, number>();
  if (active) {
    const queue = [sourceId];
    hops.set(sourceId, 0);
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      for (const route of outgoing.get(current) ?? []) {
        if (hops.has(route.to)) continue;
        hops.set(route.to, hops.get(current)! + 1);
        queue.push(route.to);
      }
    }
  }
  const facilities: ImpactedFacility[] = nodes.map((node) => {
    const distance = hops.get(node.id);
    if (distance === undefined)
      return { ...node, status: 'operational', impact: null };
    return {
      ...node,
      status: distance === 0 ? 'disrupted' : 'at risk',
      impact: {
        sourceFacilityId: sourceId,
        sourceName: source.name,
        hops: distance,
        severity:
          distance === 0
            ? 'disrupted'
            : distance === 1
              ? 'high'
              : distance === 2
                ? 'medium'
                : 'low',
        // Direct dependency gets the full closure delay; each further hop retains 65%.
        additionalDelayDays: Math.round(
          durationDays *
            IMPACT_MODEL.delayRetentionPerHop ** Math.max(0, distance - 1),
        ),
      },
    };
  });
  const impactedRoutes: ImpactedRoute[] = routes.map((route) => ({
    ...route,
    // A closed endpoint prevents physical movement in either direction. Risk still travels outbound only.
    status:
      active && (route.from === sourceId || route.to === sourceId)
        ? 'blocked'
        : hops.has(route.from)
          ? 'affected'
          : 'operational',
  }));
  const atRiskFacilityIds = facilities
    .filter((node) => node.status === 'at risk')
    .map((node) => node.id);
  const blockedRouteIds = impactedRoutes
    .filter((route) => route.status === 'blocked')
    .map((route) => route.id);
  const affectedRouteIds = impactedRoutes
    .filter((route) => route.status === 'affected')
    .map((route) => route.id);
  return {
    active,
    facilities,
    routes: impactedRoutes,
    atRiskFacilityIds,
    blockedRouteIds,
    affectedRouteIds,
    kpis: calculateKpis(
      facilities,
      blockedRouteIds.length,
      affectedRouteIds.length,
      durationDays,
    ),
  };
}

export function calculateKpis(
  facilities: readonly ImpactedFacility[],
  blocked: number,
  affected: number,
  duration: number,
): KPIs {
  // The closed source is deliberately excluded from downstream exposure and average delay.
  const atRisk = facilities.filter((node) => node.status === 'at risk');
  // Keep the original downstream cohort when mitigation clears risk, so residual delays still count.
  const exposed = facilities.filter(
    (node) => node.impact && node.impact.hops > 0,
  );
  const totalDelay = exposed.reduce(
    (sum, node) => sum + node.impact!.additionalDelayDays,
    0,
  );
  const weight = atRisk.reduce((sum, node) => {
    const severity = node.impact!.severity;
    return (
      sum +
      (severity === 'disrupted' ? 0 : IMPACT_MODEL.severityWeight[severity])
    );
  }, 0);
  const servicePenalty =
    (weight * IMPACT_MODEL.servicePenaltyPointsPerWeight * duration) /
    IMPACT_MODEL.referenceDurationDays;
  const extraCost =
    duration *
    (blocked * IMPACT_MODEL.blockedRouteCostPerDay +
      affected * IMPACT_MODEL.affectedRouteCostPerDay +
      atRisk.length * IMPACT_MODEL.atRiskFacilityCostPerDay);
  return {
    facilitiesAtRisk: atRisk.length,
    leadTime: Math.round(
      baseline.leadTime + (exposed.length ? totalDelay / exposed.length : 0),
    ),
    serviceLevel: Math.round(
      Math.max(
        IMPACT_MODEL.serviceLevelFloor,
        Math.min(100, baseline.serviceLevel - servicePenalty),
      ),
    ),
    logisticsCost: Math.round(baseline.logisticsCost + extraCost),
  };
}
