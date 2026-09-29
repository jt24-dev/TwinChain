import type { Facility } from '../data/network.ts';
import type { SkuSourcing } from '../sku-inventory.ts';
import { inventoryCoverage } from '../operations.ts';
import {
  baseline,
  IMPACT_MODEL,
  type ImpactedRoute,
  type SimulationResult,
} from './model.ts';

export interface InventoryImpact {
  state: 'protected' | 'stockout' | 'no-data';
  supplyAvailability: number;
  supplyBasis: 'route-count' | 'route-capacity' | 'sku-sourcing' | 'mitigation';
  disruptedSourceIds?: string[];
  startingInventory?: number;
  dailyDemand?: number;
  coverageDays?: number;
  dailyDepletion?: number;
  projectedStockoutDay?: number;
  stockoutWithinHorizon?: boolean;
  remainingInventory?: number;
}
export interface InventorySummary {
  durationDays: number;
  earliestStockoutDay?: number;
  stockoutFacilityIds: string[];
  protectedFacilityIds: string[];
  noDataFacilityIds: string[];
}

/** Snapshot assumption: blocked/affected inbound legs supply nothing; normal legs retain their share.
 * Weight by capacity only when ALL inbound legs have positive finite capacities in comparable units.
 * No pipeline inventory, upstream buffer transfer, or day-by-day flow allocation is implied.
 */
export function calculateSupplyAvailability(inbound: readonly ImpactedRoute[]) {
  const weighted =
    inbound.length > 0 &&
    inbound.every(
      (r) =>
        r.routeCapacity !== undefined &&
        Number.isFinite(r.routeCapacity) &&
        r.routeCapacity > 0,
    );
  const weights = inbound.map((r) => (weighted ? r.routeCapacity! : 1));
  // Normalize first to avoid overflowing when several individually finite capacities are large.
  const scale = Math.max(1, ...weights);
  const total = weights.reduce((sum, w) => sum + w / scale, 0);
  const available = inbound.reduce(
    (sum, r, i) => sum + (r.status === 'operational' ? weights[i] / scale : 0),
    0,
  );
  return {
    supplyAvailability: total ? available / total : 1,
    supplyBasis: weighted
      ? ('route-capacity' as const)
      : ('route-count' as const),
  };
}

export function calculateInventoryImpact(
  facility: Pick<Facility, 'currentInventory' | 'dailyDemand'>,
  durationDays: number,
  supply:
    | ReturnType<typeof calculateSupplyAvailability>
    | {
        supplyAvailability: number;
        supplyBasis: 'mitigation' | 'sku-sourcing';
        disruptedSourceIds?: string[];
      },
): InventoryImpact {
  if (
    !Number.isFinite(durationDays) ||
    durationDays < 0 ||
    !Number.isFinite(supply.supplyAvailability) ||
    supply.supplyAvailability < 0 ||
    supply.supplyAvailability > 1
  )
    throw new Error(
      'Inventory projection requires a non-negative horizon and supply availability from 0 to 1.',
    );
  const coverageDays = inventoryCoverage(facility);
  if (
    coverageDays === undefined ||
    !Number.isFinite(facility.currentInventory) ||
    facility.currentInventory! < 0 ||
    !Number.isFinite(facility.dailyDemand)
  )
    return { ...supply, state: 'no-data' };
  const startingInventory = facility.currentInventory!;
  const dailyDemand = facility.dailyDemand!;
  const dailyDepletion = dailyDemand * (1 - supply.supplyAvailability);
  const day =
    dailyDepletion > 0 ? startingInventory / dailyDepletion : undefined;
  const projectedStockoutDay =
    day !== undefined && Number.isFinite(day) ? day : undefined;
  const stockoutWithinHorizon = day !== undefined && day <= durationDays;
  return {
    ...supply,
    startingInventory,
    dailyDemand,
    coverageDays,
    dailyDepletion,
    projectedStockoutDay,
    stockoutWithinHorizon,
    remainingInventory: Math.max(
      0,
      startingInventory - dailyDepletion * durationDays,
    ),
    state: stockoutWithinHorizon ? 'stockout' : 'protected',
  };
}

/** Pure post-processing of the existing BFS/mitigation result. Source operational values never change.
 * Evaluate at the horizon end: only Protected, Stockout and No Data are needed (no playback/"current day").
 * Scale the existing service penalty by weighted unserved horizon share. Missing data keeps full
 * topology weight; protected buffers contribute zero; custom source shutdown retains weight 3.
 * Lead time and cost are copied exactly from the topology result.
 */
export function applyInventoryImpact(
  result: SimulationResult,
  durationDays: number,
  profile: 'custom' | 'demo',
): SimulationResult {
  if (!result.active) return result;
  const inbound = new Map<string, ImpactedRoute[]>();
  for (const route of result.routes) {
    const edges = inbound.get(route.to) ?? [];
    edges.push(route);
    inbound.set(route.to, edges);
  }
  const recordsByFacility = new Map<
    string,
    NonNullable<SimulationResult['inventoryRecords']>
  >();
  for (const record of result.inventoryRecords ?? []) {
    const group = recordsByFacility.get(record.facilityId) ?? [];
    group.push(record);
    recordsByFacility.set(record.facilityId, group);
  }
  const sourcingByPair = new Map<string, SkuSourcing[]>();
  for (const sourcing of result.skuSourcing ?? []) {
    const pair = JSON.stringify([
      sourcing.destinationFacilityId,
      sourcing.skuId,
    ]);
    const group = sourcingByPair.get(pair) ?? [];
    group.push(sourcing);
    sourcingByPair.set(pair, group);
  }
  const sourceById = new Map(
    result.facilities.map((facility) => [facility.id, facility]),
  );
  const routeById = new Map(result.routes.map((route) => [route.id, route]));
  const facilities = result.facilities.map((f) => {
    if (!f.impact || f.impact.hops === 0) return f;
    const supply =
      f.mitigation?.supplyAvailability !== undefined
        ? {
            supplyAvailability: f.mitigation.supplyAvailability,
            supplyBasis: 'mitigation' as const,
          }
        : f.mitigation &&
            (f.mitigation.emergencyProtection || f.impact.severity === 'normal')
          ? { supplyAvailability: 1, supplyBasis: 'mitigation' as const }
          : calculateSupplyAvailability(inbound.get(f.id) ?? []);
    const records = recordsByFacility.get(f.id);
    if (!records?.length)
      return {
        ...f,
        inventory: calculateInventoryImpact(f, durationDays, supply),
      };
    const skuInventory = records.map((record) => {
      const sources = sourcingByPair.get(JSON.stringify([f.id, record.skuId]));
      if (!sources?.length)
        return {
          ...record,
          projection: calculateInventoryImpact(record, durationDays, supply),
        };
      const equalShare = 1 / sources.length;
      const disruptedSourceIds: string[] = [];
      const available = sources.reduce((sum, source) => {
        const sourceUnavailable =
          sourceById.get(source.sourceFacilityId)?.status !== 'operational';
        const routeUnavailable =
          source.routeId !== undefined &&
          routeById.get(source.routeId)?.status !== 'operational';
        if (sourceUnavailable || routeUnavailable) {
          disruptedSourceIds.push(source.sourceFacilityId);
          return sum;
        }
        return sum + (source.supplyShare ?? equalShare);
      }, 0);
      // Existing mitigation restores a fraction of the facility's lost flow. Apply
      // that fraction only to this SKU's unavailable sources; healthy SKUs stay whole.
      const originalFacilityAvailability = calculateSupplyAvailability(
        inbound.get(f.id) ?? [],
      ).supplyAvailability;
      const recoveredFraction =
        f.mitigation && originalFacilityAvailability < 1
          ? Math.max(
              0,
              Math.min(
                1,
                (supply.supplyAvailability - originalFacilityAvailability) /
                  (1 - originalFacilityAvailability),
              ),
            )
          : 0;
      const supplyAvailability = Math.max(
        0,
        Math.min(1, available + (1 - available) * recoveredFraction),
      );
      return {
        ...record,
        projection: calculateInventoryImpact(record, durationDays, {
          supplyAvailability,
          supplyBasis: recoveredFraction ? 'mitigation' : 'sku-sourcing',
          disruptedSourceIds,
        }),
      };
    });
    const stockouts = skuInventory.filter(
      (r) => r.projection.state === 'stockout',
    );
    const noData = skuInventory.filter(
      (r) => r.projection.state === 'no-data',
    ).length;
    const earliestStockoutDay = stockouts.length
      ? Math.min(...stockouts.map((r) => r.projection.projectedStockoutDay!))
      : undefined;
    // SKU records take precedence. Counts/earliest day do not combine incompatible quantities.
    const inventory: InventoryImpact = {
      ...supply,
      state: stockouts.length ? 'stockout' : noData ? 'no-data' : 'protected',
      projectedStockoutDay: earliestStockoutDay,
    };
    return {
      ...f,
      inventory,
      skuInventory,
      skuRollup: {
        stockouts: stockouts.length,
        protected: skuInventory.length - stockouts.length - noData,
        noData,
        earliestStockoutDay,
      },
    };
  });
  const stockouts = facilities
    .filter((f) => f.inventory?.state === 'stockout')
    .sort(
      (a, b) =>
        a.inventory!.projectedStockoutDay! -
          b.inventory!.projectedStockoutDay! || a.id.localeCompare(b.id),
    );
  const atRiskFacilityIds = facilities
    .filter(
      (f) =>
        f.impact &&
        f.impact.hops > 0 &&
        (f.inventory?.state === 'stockout' ||
          (f.inventory?.state === 'no-data' && f.status === 'at risk')),
    )
    .map((f) => f.id);
  let originalWeight = 0,
    inventoryWeight = 0;
  for (const f of facilities) {
    if (!f.impact) continue;
    const weight =
      f.impact.hops === 0
        ? profile === 'custom'
          ? 3
          : 0
        : IMPACT_MODEL.severityWeight[
            f.impact.severity as keyof typeof IMPACT_MODEL.severityWeight
          ];
    originalWeight += weight;
    const inventory = f.inventory;
    const retained =
      !inventory || inventory.state === 'no-data'
        ? 1
        : inventory.state === 'protected'
          ? 0
          : Math.max(
              0,
              (durationDays - inventory.projectedStockoutDay!) / durationDays,
            );
    inventoryWeight += weight * retained;
  }
  const servicePenalty = baseline.serviceLevel - result.kpis.serviceLevel;
  return {
    ...result,
    facilities,
    atRiskFacilityIds,
    inventorySummary: {
      durationDays,
      earliestStockoutDay: stockouts[0]?.inventory?.projectedStockoutDay,
      stockoutFacilityIds: stockouts.map((f) => f.id),
      protectedFacilityIds: facilities
        .filter((f) => f.inventory?.state === 'protected')
        .map((f) => f.id),
      noDataFacilityIds: facilities
        .filter((f) => f.inventory?.state === 'no-data')
        .map((f) => f.id),
    },
    kpis: {
      ...result.kpis,
      facilitiesAtRisk: atRiskFacilityIds.length,
      serviceLevel: Math.round(
        Math.min(
          100,
          Math.max(
            IMPACT_MODEL.serviceLevelFloor,
            baseline.serviceLevel -
              servicePenalty *
                (originalWeight ? inventoryWeight / originalWeight : 1),
          ),
        ),
      ),
    },
  };
}
