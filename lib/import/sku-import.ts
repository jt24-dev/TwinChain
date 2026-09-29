import type { ImportIssue, ImportTable } from './network-import.ts';
import type { Sku, FacilityInventory } from '../sku-inventory.ts';
export function parseSkuInventory(
  table: ImportTable,
  facilityIds: Set<string>,
) {
  const skus = new Map<string, Sku>(),
    inventoryRecords: FacilityInventory[] = [],
    issues: ImportIssue[] = [];
  const headerIndex = table.findIndex((row) =>
    row.some((v) => v !== null && v !== undefined && String(v).trim()),
  );
  const headers = (table[headerIndex] ?? []).map((v) => String(v).trim());
  const pairs = new Set<string>();
  const error = (row: number, field: string, message: string) =>
    issues.push({ severity: 'error', table: 'Inventory', row, field, message });
  for (const key of ['sku_id', 'sku_name', 'facility_id'])
    if (!headers.includes(key))
      error(headerIndex + 1, key, 'Map this required inventory field.');
  if (table.length > 20001)
    error(1, 'rows', 'Use up to 20,000 inventory records.');
  table.slice(headerIndex + 1, headerIndex + 20001).forEach((row, index) => {
    if (!row.some((v) => v !== undefined && v !== null && String(v).trim()))
      return;
    const line = headerIndex + index + 2,
      start = issues.length;
    const v = Object.fromEntries(headers.map((h, i) => [h, row[i]]));
    const read = (key: string) => {
      const value =
        typeof v[key] === 'string' || typeof v[key] === 'number'
          ? String(v[key]).trim()
          : '';
      if (!value || value.length > 160)
        error(line, key, 'Enter non-empty text of 160 characters or fewer.');
      return value;
    };
    const skuId = read('sku_id'),
      name = read('sku_name'),
      facilityId = read('facility_id');
    if (!facilityIds.has(facilityId))
      error(
        line,
        'facility_id',
        'Use an existing Facilities ID (case-sensitive).',
      );
    if (skus.has(skuId) && skus.get(skuId)!.name !== name)
      error(line, 'sku_name', 'The same SKU ID must have the same name.');
    const pair = JSON.stringify([facilityId, skuId]);
    if (pairs.has(pair))
      error(
        line,
        'sku_id',
        'Duplicate facility + SKU record. Keep one row per pair.',
      );
    pairs.add(pair);
    const record: FacilityInventory = { facilityId, skuId };
    for (const [column, field] of [
      ['current_inventory', 'currentInventory'],
      ['daily_demand', 'dailyDemand'],
    ] as const) {
      const raw = v[column];
      if (raw === undefined || raw === null || raw === '') continue;
      const value =
        typeof raw === 'number'
          ? raw
          : typeof raw === 'string' &&
              /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim())
            ? Number(raw)
            : NaN;
      if (!Number.isFinite(value) || value < 0)
        error(line, column, 'Enter a non-negative number or leave blank.');
      else record[field] = value;
    }
    if (issues.length === start) {
      skus.set(skuId, { id: skuId, name });
      inventoryRecords.push(record);
      if (record.currentInventory === undefined || !record.dailyDemand)
        issues.push({
          severity: 'warning',
          table: 'Inventory',
          row: line,
          field: 'inventory/demand',
          message:
            'Inventory and positive daily demand are needed for a projection; this record will show No Data.',
        });
    }
  });
  return { skus: [...skus.values()], inventoryRecords, issues };
}
