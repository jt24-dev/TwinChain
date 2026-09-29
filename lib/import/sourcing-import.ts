import type { Route } from '../data/network.ts';
import type { SkuSourcing } from '../sku-inventory.ts';
import type { ImportIssue, ImportTable } from './network-import.ts';

/** Canonical optional sourcing table. Shares may be fractions or percentages; saved values are 0–1. */
export function parseSkuSourcing(
  table: ImportTable,
  skuIds: Set<string>,
  facilityIds: Set<string>,
  routes: readonly Route[],
) {
  const issues: ImportIssue[] = [];
  const sourcing: SkuSourcing[] = [];
  const headerIndex = table.findIndex((row) =>
    row.some(
      (value) => value !== null && value !== undefined && String(value).trim(),
    ),
  );
  const headers = (table[headerIndex] ?? []).map((value) =>
    String(value).trim(),
  );
  const error = (row: number, field: string, message: string) =>
    issues.push({
      severity: 'error',
      table: 'SKU Sourcing',
      row,
      field,
      message,
    });
  for (const field of [
    'sku_id',
    'source_facility_id',
    'destination_facility_id',
  ])
    if (!headers.includes(field))
      error(
        Math.max(1, headerIndex + 1),
        field,
        'Map this required sourcing field.',
      );
  if (table.length > 20001)
    error(1, 'rows', 'Use up to 20,000 SKU sourcing relationships.');
  const routesById = new Map(routes.map((route) => [route.id, route]));
  const directed = new Set(
    routes.map((route) => JSON.stringify([route.from, route.to])),
  );
  const seen = new Set<string>();
  const groups = new Map<string, { row: number; share?: number }[]>();
  table.slice(headerIndex + 1, headerIndex + 20001).forEach((values, index) => {
    if (
      !values.some(
        (value) =>
          value !== null && value !== undefined && String(value).trim(),
      )
    )
      return;
    const row = headerIndex + index + 2;
    const start = issues.length;
    if (
      values
        .slice(headers.length)
        .some(
          (value) =>
            value !== null && value !== undefined && String(value).trim(),
        )
    )
      error(
        row,
        'columns',
        'A row has more values than headers. Check column alignment.',
      );
    const source = Object.fromEntries(
      headers.map((header, column) => [header, values[column]]),
    );
    const read = (field: string, required = true) => {
      const value =
        typeof source[field] === 'string' || typeof source[field] === 'number'
          ? String(source[field]).trim()
          : '';
      if ((required && !value) || value.length > 160)
        error(row, field, 'Enter non-empty text of 160 characters or fewer.');
      return value;
    };
    const skuId = read('sku_id');
    const sourceFacilityId = read('source_facility_id');
    const destinationFacilityId = read('destination_facility_id');
    const routeId = read('route_id', false);
    if (skuId && !skuIds.has(skuId))
      error(
        row,
        'sku_id',
        'Use a SKU ID from the Inventory table (case-sensitive).',
      );
    if (sourceFacilityId && !facilityIds.has(sourceFacilityId))
      error(
        row,
        'source_facility_id',
        'Use an existing Facilities ID (case-sensitive).',
      );
    if (destinationFacilityId && !facilityIds.has(destinationFacilityId))
      error(
        row,
        'destination_facility_id',
        'Use an existing Facilities ID (case-sensitive).',
      );
    if (sourceFacilityId && sourceFacilityId === destinationFacilityId)
      error(
        row,
        'destination_facility_id',
        'Source and destination must be different facilities.',
      );
    if (
      sourceFacilityId &&
      destinationFacilityId &&
      !directed.has(JSON.stringify([sourceFacilityId, destinationFacilityId]))
    )
      error(
        row,
        'source_facility_id',
        'Add a directed route from this source to this destination.',
      );
    if (routeId) {
      const route = routesById.get(routeId);
      if (
        !route ||
        route.from !== sourceFacilityId ||
        route.to !== destinationFacilityId
      )
        error(
          row,
          'route_id',
          'Use an existing route directed from this source to this destination.',
        );
    }
    const rawShare = source.supply_share;
    let supplyShare: number | undefined;
    if (
      rawShare !== undefined &&
      rawShare !== null &&
      String(rawShare).trim()
    ) {
      const text = String(rawShare).trim();
      const percent = text.endsWith('%');
      const numeric = percent ? text.slice(0, -1).trim() : text;
      const value = /^(?:\d+\.?\d*|\.\d+)$/.test(numeric)
        ? Number(numeric)
        : NaN;
      supplyShare = percent || value > 1 ? value / 100 : value;
      if (!Number.isFinite(supplyShare) || supplyShare <= 0 || supplyShare > 1)
        error(
          row,
          'supply_share',
          'Use a positive share up to 1, or a percentage up to 100%.',
        );
    }
    const relationship = JSON.stringify([
      sourceFacilityId,
      destinationFacilityId,
      skuId,
      routeId || null,
    ]);
    if (seen.has(relationship))
      error(row, 'source_facility_id', 'Duplicate SKU sourcing relationship.');
    seen.add(relationship);
    if (issues.length !== start) return;
    sourcing.push({
      skuId,
      sourceFacilityId,
      destinationFacilityId,
      ...(routeId ? { routeId } : {}),
      ...(supplyShare === undefined ? {} : { supplyShare }),
    });
    const pair = JSON.stringify([destinationFacilityId, skuId]);
    const group = groups.get(pair) ?? [];
    group.push({ row, share: supplyShare });
    groups.set(pair, group);
  });
  for (const group of groups.values()) {
    const provided = group.filter((source) => source.share !== undefined);
    if (provided.length && provided.length !== group.length)
      error(
        group.find((source) => source.share === undefined)!.row,
        'supply_share',
        'Provide shares for all sources of this facility + SKU, or leave all blank for equal shares.',
      );
    else if (
      provided.length &&
      Math.abs(group.reduce((sum, source) => sum + source.share!, 0) - 1) >
        0.0001
    )
      error(
        group[0].row,
        'supply_share',
        'Shares for this facility + SKU must total 100%.',
      );
  }
  return { skuSourcing: sourcing, issues };
}
