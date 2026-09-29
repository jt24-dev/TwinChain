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
export interface SkuData {
  skus?: Sku[];
  inventoryRecords?: FacilityInventory[];
}
export function validateSkuData(data: SkuData, facilityIds: Set<string>) {
  if (data.skus !== undefined && !Array.isArray(data.skus))
    throw new Error('SKUs must be a list.');
  if (
    data.inventoryRecords !== undefined &&
    !Array.isArray(data.inventoryRecords)
  )
    throw new Error('Inventory records must be a list.');
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
  };
}
