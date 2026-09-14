import type { FacilityType } from '../data/network.ts';
import { calculateKpis } from './propagate-disruption.ts';
import { applyInventoryImpact } from './inventory.ts';
import type {
  ImpactedRoute,
  Severity,
  SimulationResult,
  KPIs,
} from './model.ts';

export type StrategyId = 'do-nothing' | 'reroute' | 'air-freight';
export interface MitigationStrategy {
  id: StrategyId;
  name: string;
  description: string;
  tradeoff: string;
  summary: string;
  delayRetention: number;
  riskLevelsRecovered: number;
  premiumPerDay: number;
  criticalDelayCap?: number;
}
// Illustrative parameters, not final KPI overrides. Recovery applies only to discovered downstream exposure.
export const strategies: readonly MitigationStrategy[] = [
  {
    id: 'do-nothing',
    name: 'Do Nothing',
    description: 'Accept downstream delays and service loss.',
    tradeoff: 'Lowest cost · Highest exposure',
    summary:
      'Lowest-cost response, but service remains heavily exposed to the Shanghai closure.',
    delayRetention: 1,
    riskLevelsRecovered: 0,
    premiumPerDay: 0,
  },
  {
    id: 'reroute',
    name: 'Reroute Through Alternate Port',
    description: 'Shift ocean flow through Singapore at moderate added cost.',
    tradeoff: 'Partial recovery · Moderate cost',
    summary:
      'Singapore rerouting recovers part of the lost service at a moderate cost premium. Shanghai itself remains closed.',
    delayRetention: 0.45,
    riskLevelsRecovered: 1,
    premiumPerDay: 10000,
  },
  {
    id: 'air-freight',
    name: 'Air Freight Critical Flow',
    description: 'Expedite critical distribution and market demand.',
    tradeoff: 'Highest service protection · Highest cost',
    summary:
      'Air freight protects critical demand most effectively, with the highest logistics cost. Residual port exposure remains.',
    delayRetention: 0.2,
    riskLevelsRecovered: 2,
    premiumPerDay: 35000,
    criticalDelayCap: 1,
  },
];
export const criticalFacilityTypes: readonly FacilityType[] = [
  'Distribution center',
  'Customer market',
];
// A predefined bypass, not automatic route search. Suzhou can feed Shenzhen over existing r1.
// The feeder and ocean leg substitute Shanghai flow; the three closed-port routes remain blocked.
export const alternateRoutes: readonly ImpactedRoute[] = [
  {
    id: 'mitigation-shenzhen-singapore',
    from: 'shenzhen',
    to: 'singapore',
    mode: 'Feeder',
    status: 'operational',
    alternate: true,
  },
  {
    id: 'mitigation-singapore-la',
    from: 'singapore',
    to: 'la',
    mode: 'Ocean',
    status: 'operational',
    alternate: true,
  },
];
const recoveryOrder: Severity[] = ['normal', 'low', 'medium', 'high'];

export function applyMitigation(
  disruption: SimulationResult,
  id: StrategyId,
): SimulationResult {
  const strategy = strategies.find((s) => s.id === id);
  if (!strategy) throw new Error(`Unknown mitigation: ${id}`);
  if (!disruption.active || id === 'do-nothing') return disruption;
  if (disruption.facilities.some((f) => f.mitigation))
    throw new Error(
      'Apply mitigation to the original disruption result, not another strategy result.',
    );
  const source = disruption.facilities.find((f) => f.impact?.hops === 0);
  if (source?.id !== 'shanghai')
    throw new Error(
      'These mitigation rules support the Shanghai closure only.',
    );
  const duration = source.impact!.additionalDelayDays;
  const facilities = disruption.facilities.map((f) => {
    if (!f.impact || f.impact.hops === 0) return f;
    const emergencyProtection =
      id === 'air-freight' && criticalFacilityTypes.includes(f.type);
    const retainedDelay = Math.round(
      f.impact.additionalDelayDays * strategy.delayRetention,
    );
    const severity =
      recoveryOrder[
        Math.max(
          0,
          recoveryOrder.indexOf(f.impact.severity) -
            strategy.riskLevelsRecovered,
        )
      ];
    return {
      ...f,
      status:
        severity === 'normal' ? ('operational' as const) : ('at risk' as const),
      impact: {
        ...f.impact,
        severity,
        additionalDelayDays: emergencyProtection
          ? Math.min(retainedDelay, strategy.criticalDelayCap!)
          : retainedDelay,
      },
      mitigation: {
        name: strategy.name,
        originalDelayDays: f.impact.additionalDelayDays,
        emergencyProtection,
      },
    };
  });
  const byId = new Map(facilities.map((f) => [f.id, f]));
  const routes: ImpactedRoute[] = disruption.routes.map((r) =>
    r.status === 'affected' && byId.get(r.from)?.status === 'operational'
      ? { ...r, status: 'operational' }
      : r,
  );
  if (id === 'reroute') {
    for (const route of alternateRoutes) {
      if (
        !byId.has(route.from) ||
        !byId.has(route.to) ||
        routes.some((r) => r.id === route.id)
      )
        throw new Error(
          'Alternate routing requires the existing Shenzhen, Singapore and Los Angeles facilities and unique route IDs.',
        );
      routes.push({ ...route });
    }
  }
  const blockedRouteIds = routes
    .filter((r) => r.status === 'blocked')
    .map((r) => r.id);
  const affectedRouteIds = routes
    .filter((r) => r.status === 'affected')
    .map((r) => r.id);
  const kpis = calculateKpis(
    facilities,
    blockedRouteIds.length,
    affectedRouteIds.length,
    duration,
  );
  // Operating penalties reflect remaining exposure; intervention spending is additional, never free.
  kpis.logisticsCost += duration * strategy.premiumPerDay;
  const result: SimulationResult = {
    ...disruption,
    facilities,
    routes,
    blockedRouteIds,
    affectedRouteIds,
    atRiskFacilityIds: facilities
      .filter((f) => f.status === 'at risk')
      .map((f) => f.id),
    kpis,
  };
  return disruption.inventorySummary
    ? applyInventoryImpact(result, duration, 'demo')
    : result;
}

export function compareStrategies(disruption: SimulationResult) {
  const results = strategies.map((strategy) => ({
    strategy,
    result: applyMitigation(disruption, strategy.id),
  }));
  const best: KPIs = {
    serviceLevel: Math.max(...results.map((r) => r.result.kpis.serviceLevel)),
    leadTime: Math.min(...results.map((r) => r.result.kpis.leadTime)),
    logisticsCost: Math.min(...results.map((r) => r.result.kpis.logisticsCost)),
    facilitiesAtRisk: Math.min(
      ...results.map((r) => r.result.kpis.facilitiesAtRisk),
    ),
  };
  return { results, best };
}
