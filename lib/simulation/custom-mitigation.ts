import type { SimulationResult, Severity } from './model.ts';
import { calculateCustomImpact } from './facility-shutdown.ts';
import type { StrategyId } from './mitigation.ts';

export type CustomMitigation =
  | { id: 'do-nothing' }
  | { id: 'reroute'; routeId: string; alternateRouteId: string }
  | { id: 'air-freight'; facilityId: string };

// Generic units/day; one incremental shipment/day for rerouting. Illustrative,
// not a freight quote or a capacity allocation optimizer.
export const CUSTOM_MITIGATION_MODEL = {
  fallbackDailyDemand: 100,
  fallbackCapacityRecovery: 0.5,
  fallbackTransitDays: 3,
  fallbackShipmentCost: 500,
  reroutePremiumMultiplier: 1.5,
  expediteRecovery: 0.8,
  expediteDelayRetention: 0.2,
  emergencyUnitCost: 8,
  emergencyCostMultiplier: 4,
} as const;

export const customStrategyNames: Record<StrategyId, string> = {
  'do-nothing': 'Do Nothing',
  reroute: 'Reroute',
  'air-freight': 'Expedite / Air Freight',
};

function exposed(result: SimulationResult, id: string) {
  const f = result.facilities.find((f) => f.id === id);
  return f?.impact &&
    f.impact.hops > 0 &&
    f.inventory &&
    f.inventory.supplyAvailability < 1
    ? f
    : undefined;
}

// Reject alternate connections that would close a directed cycle. This is
// reachability validation only: no route search or optimization is performed.
function reaches(result: SimulationResult, start: string, destination: string) {
  const queue = [start],
    seen = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    if (queue[i] === destination) return true;
    for (const r of result.routes.filter((r) => r.from === queue[i])) {
      if (!seen.has(r.to)) {
        seen.add(r.to);
        queue.push(r.to);
      }
    }
  }
  return false;
}

export function rerouteOptions(result: SimulationResult, routeId: string) {
  const flow = result.routes.find((r) => r.id === routeId);
  if (!flow || flow.status === 'operational' || !exposed(result, flow.to))
    return [];
  return result.routes.filter((r) => {
    const source = result.facilities.find((f) => f.id === r.from);
    return (
      r.id !== flow.id &&
      r.to === flow.to &&
      r.from !== r.to &&
      r.status === 'operational' &&
      source &&
      !source.impact &&
      !reaches(result, r.to, r.from)
    );
  });
}

export function expediteTargets(result: SimulationResult) {
  return result.facilities.filter((f) => exposed(result, f.id));
}

export function applyCustomMitigation(
  original: SimulationResult,
  choice: CustomMitigation,
): SimulationResult {
  if (original.facilities.some((f) => f.mitigation))
    throw new Error(
      'Select mitigation against the original Do Nothing result.',
    );
  if (!original.active || choice.id === 'do-nothing') return original;
  const duration = original.inventorySummary?.durationDays;
  if (!duration) throw new Error('Run a facility shutdown first.');
  const model = CUSTOM_MITIGATION_MODEL;
  let targetId: string, addedSupply: number, delay: number, premium: number;
  let alternateId: string | undefined;
  if (choice.id === 'reroute') {
    const flow = original.routes.find((r) => r.id === choice.routeId);
    const alternate = rerouteOptions(original, choice.routeId).find(
      (r) => r.id === choice.alternateRouteId,
    );
    if (!flow || !alternate)
      throw new Error(
        'No valid alternate connection is available for this disrupted flow. Choose a healthy inbound route to the same destination.',
      );
    targetId = flow.to;
    const target = exposed(original, targetId)!;
    const demand =
      target.dailyDemand && target.dailyDemand > 0
        ? target.dailyDemand
        : model.fallbackDailyDemand;
    const inbound = original.routes.filter((r) => r.to === targetId);
    const weighted = inbound.every(
      (r) => r.routeCapacity !== undefined && r.routeCapacity > 0,
    );
    const capacityTotal = weighted
      ? inbound.reduce((sum, r) => sum + r.routeCapacity!, 0)
      : inbound.length;
    const alternateShare = weighted
      ? alternate.routeCapacity! / capacityTotal
      : 1 / inbound.length;
    const lostShare = weighted
      ? flow.routeCapacity! / capacityTotal
      : 1 / inbound.length;
    // Subtract the alternate's existing allocated flow; never count normal supply twice.
    const spareShare =
      alternate.routeCapacity !== undefined
        ? Math.max(0, alternate.routeCapacity / demand - alternateShare)
        : lostShare * model.fallbackCapacityRecovery;
    addedSupply = Math.min(
      1 - target.inventory!.supplyAvailability,
      lostShare,
      spareShare,
    );
    if (addedSupply <= 0)
      throw new Error(
        'The alternate connection has no spare capacity under the current demand assumptions.',
      );
    const recovery = addedSupply / (1 - target.inventory!.supplyAvailability);
    const transit = alternate.transitTime ?? model.fallbackTransitDays;
    delay =
      target.impact!.additionalDelayDays * (1 - recovery) +
      Math.min(target.impact!.additionalDelayDays, transit) * recovery;
    premium =
      duration *
      (alternate.costPerShipment ?? model.fallbackShipmentCost) *
      model.reroutePremiumMultiplier;
    alternateId = alternate.id;
  } else {
    targetId = choice.facilityId;
    const target = exposed(original, targetId);
    if (!target)
      throw new Error(
        'Select an affected downstream facility with disrupted supply to expedite.',
      );
    addedSupply =
      (1 - target.inventory!.supplyAvailability) * model.expediteRecovery;
    delay = target.impact!.additionalDelayDays * model.expediteDelayRetention;
    const demand =
      target.dailyDemand && target.dailyDemand > 0
        ? target.dailyDemand
        : model.fallbackDailyDemand;
    premium =
      demand *
      addedSupply *
      duration *
      model.emergencyUnitCost *
      model.emergencyCostMultiplier;
  }
  const order: Severity[] = ['normal', 'low', 'medium', 'high'];
  const facilities = original.facilities.map((f) => {
    if (f.id !== targetId) return f;
    const supply = Math.min(1, f.inventory!.supplyAvailability + addedSupply);
    const recovery = addedSupply / (1 - f.inventory!.supplyAvailability);
    const recoveredLevels = recovery >= 0.75 ? 2 : recovery >= 0.5 ? 1 : 0;
    const severity =
      supply === 1
        ? 'normal'
        : order[
            Math.max(1, order.indexOf(f.impact!.severity) - recoveredLevels)
          ];
    return {
      ...f,
      status:
        severity === 'normal' ? ('operational' as const) : ('at risk' as const),
      impact: {
        ...f.impact!,
        severity,
        additionalDelayDays: Math.round(delay * 10) / 10,
      },
      mitigation: {
        name: customStrategyNames[choice.id],
        originalDelayDays: f.impact!.additionalDelayDays,
        emergencyProtection: choice.id === 'air-freight',
        supplyAvailability: supply,
      },
    };
  });
  const result = calculateCustomImpact(
    {
      ...original,
      facilities,
      routes: original.routes.map((r) =>
        r.id === alternateId ? { ...r, alternate: true } : r,
      ),
    },
    duration,
  );
  // Preserve unmitigated operating penalties and add intervention spending.
  return {
    ...result,
    kpis: {
      ...result.kpis,
      logisticsCost: original.kpis.logisticsCost + premium,
    },
  };
}

export function mitigationSummary(choice: CustomMitigation) {
  return choice.id === 'reroute'
    ? 'Alternate inbound capacity restores part of the selected flow at added logistics cost. Other downstream flows remain unchanged.'
    : choice.id === 'air-freight'
      ? 'Emergency supply reduces delay and stockout exposure at the selected facility, with a volume-based cost premium.'
      : 'Original disruption result. No intervention spending or supply recovery.';
}
