export interface Sku {
  id: string;
  name: string;
}
export interface FacilityInventory {
  facilityId: string;
  skuId: string;
  currentInventory?: number;
  dailyDemand?: number;
}
/** An optional directed SKU supply allocation. Shares are stored as fractions from 0 to 1. */
export interface SkuSourcing {
  sourceFacilityId: string;
  destinationFacilityId: string;
  skuId: string;
  routeId?: string;
  supplyShare?: number;
}
export interface SkuData {
  skus?: Sku[];
  inventoryRecords?: FacilityInventory[];
  skuSourcing?: SkuSourcing[];
}
export function validateSkuData(
  data: SkuData,
  facilityIds: Set<string>,
  routes: readonly { id: string; from: string; to: string }[] = [],
) {
  if (data.skus !== undefined && !Array.isArray(data.skus))
    throw new Error('SKUs must be a list.');
  if (
    data.inventoryRecords !== undefined &&
    !Array.isArray(data.inventoryRecords)
  )
    throw new Error('Inventory records must be a list.');
  if (data.skuSourcing !== undefined && !Array.isArray(data.skuSourcing))
    throw new Error('SKU sourcing must be a list.');
  const ids = new Set<string>();
  for (const sku of data.skus ?? []) {
    if (
      !sku ||
      [sku.id, sku.name].some(
        (v) => typeof v !== 'string' || !v.trim() || v.length > 160,
      )
    )
      throw new Error(
        'SKU ID and name must be non-empty text of 160 characters or fewer.',
      );
    if (ids.has(sku.id)) throw new Error('SKU IDs must be unique.');
    ids.add(sku.id);
  }
  const pairs = new Set<string>();
  for (const record of data.inventoryRecords ?? []) {
    if (
      !record ||
      !facilityIds.has(record.facilityId) ||
      !ids.has(record.skuId)
    )
      throw new Error('Inventory must reference an existing facility and SKU.');
    const pair = JSON.stringify([record.facilityId, record.skuId]);
    if (pairs.has(pair))
      throw new Error('Duplicate facility + SKU inventory record.');
    pairs.add(pair);
    for (const key of ['currentInventory', 'dailyDemand'] as const)
      if (
        record[key] !== undefined &&
        (typeof record[key] !== 'number' ||
          !Number.isFinite(record[key]) ||
          record[key]! < 0)
      )
        throw new Error(
          'SKU inventory and demand must be finite non-negative numbers or omitted.',
        );
  }
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const directedRoutes = new Set(
    routes.map((route) => JSON.stringify([route.from, route.to])),
  );
  const relationships = new Set<string>();
  const groups = new Map<string, SkuSourcing[]>();
  for (const sourcing of data.skuSourcing ?? []) {
    if (!sourcing || !ids.has(sourcing.skuId))
      throw new Error('SKU sourcing must reference an existing SKU.');
    if (
      !facilityIds.has(sourcing.sourceFacilityId) ||
      !facilityIds.has(sourcing.destinationFacilityId) ||
      sourcing.sourceFacilityId === sourcing.destinationFacilityId
    )
      throw new Error(
        'SKU sourcing needs different, existing source and destination facilities.',
      );
    if (
      !directedRoutes.has(
        JSON.stringify([
          sourcing.sourceFacilityId,
          sourcing.destinationFacilityId,
        ]),
      )
    )
      throw new Error(
        'SKU sourcing requires an existing directed route from source to destination.',
      );
    if (sourcing.routeId !== undefined) {
      const route = routeById.get(sourcing.routeId);
      if (
        !route ||
        route.from !== sourcing.sourceFacilityId ||
        route.to !== sourcing.destinationFacilityId
      )
        throw new Error(
          'SKU sourcing route must connect its source to its destination.',
        );
    }
    if (
      sourcing.supplyShare !== undefined &&
      (typeof sourcing.supplyShare !== 'number' ||
        !Number.isFinite(sourcing.supplyShare) ||
        sourcing.supplyShare <= 0 ||
        sourcing.supplyShare > 1)
    )
      throw new Error('SKU supply share must be greater than 0 and at most 1.');
    const relationship = JSON.stringify([
      sourcing.destinationFacilityId,
      sourcing.skuId,
      sourcing.sourceFacilityId,
      sourcing.routeId ?? null,
    ]);
    if (relationships.has(relationship))
      throw new Error('Duplicate SKU sourcing relationship.');
    relationships.add(relationship);
    const groupKey = JSON.stringify([
      sourcing.destinationFacilityId,
      sourcing.skuId,
    ]);
    const group = groups.get(groupKey) ?? [];
    group.push(sourcing);
    groups.set(groupKey, group);
  }
  for (const group of groups.values()) {
    const provided = group.filter(
      (sourcing) => sourcing.supplyShare !== undefined,
    );
    if (provided.length && provided.length !== group.length)
      throw new Error(
        'Provide supply shares for every source of a facility + SKU, or leave all blank for equal shares.',
      );
    if (
      provided.length &&
      Math.abs(
        group.reduce((sum, sourcing) => sum + sourcing.supplyShare!, 0) - 1,
      ) > 0.0001
    )
      throw new Error(
        'SKU supply shares for each facility + SKU must total 100%.',
      );
  }
}
/** Persistence allowlist: never store projections alongside source inventory. */
export function copySkuData(data: SkuData): SkuData {
  return {
    ...(data.skus === undefined
      ? {}
      : { skus: data.skus.map(({ id, name }) => ({ id, name })) }),
    ...(data.inventoryRecords === undefined
      ? {}
      : {
          inventoryRecords: data.inventoryRecords.map((r) => ({
            facilityId: r.facilityId,
            skuId: r.skuId,
            ...(r.currentInventory === undefined
              ? {}
              : { currentInventory: r.currentInventory }),
            ...(r.dailyDemand === undefined
              ? {}
              : { dailyDemand: r.dailyDemand }),
          })),
        }),
    ...(data.skuSourcing === undefined
      ? {}
      : {
          skuSourcing: data.skuSourcing.map((sourcing) => ({
            sourceFacilityId: sourcing.sourceFacilityId,
            destinationFacilityId: sourcing.destinationFacilityId,
            skuId: sourcing.skuId,
            ...(sourcing.routeId === undefined
              ? {}
              : { routeId: sourcing.routeId }),
            ...(sourcing.supplyShare === undefined
              ? {}
              : { supplyShare: sourcing.supplyShare }),
          })),
        }),
  };
}
