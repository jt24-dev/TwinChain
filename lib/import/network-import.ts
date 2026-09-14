import Papa from 'papaparse';
import { importOperations } from '../operations.ts';
import {
  facilityTypes,
  transportModes,
  validateNetwork,
  type SupplyNetwork,
} from '../networks.ts';
import type { Facility, Route } from '../data/network.ts';

export const IMPORT_LIMITS = {
  bytes: 10 * 1024 * 1024,
  facilities: 2000,
  routes: 10000,
};
export type ImportTable = unknown[][];
export interface ImportIssue {
  severity: 'error' | 'warning';
  table: string;
  row?: number;
  field: string;
  message: string;
}
export interface ImportPreview {
  facilities: Facility[];
  routes: Route[];
  issues: ImportIssue[];
  facilityRows: number;
  routeRows: number;
}
const clean = (v: unknown) =>
  typeof v === 'string'
    ? v.trim()
    : typeof v === 'number' && Number.isFinite(v)
      ? String(v)
      : '';
const key = (v: unknown) =>
  clean(v).toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ');
const headerAliases: Record<string, string> = {
  lat: 'latitude',
  lon: 'longitude',
  lng: 'longitude',
  from: 'source',
  to: 'destination',
};
const typeAliases: Record<string, Facility['type']> = {
  dc: 'Distribution center',
};

export function parseCsv(
  text: string,
  table: string,
): { rows: ImportTable; issues: ImportIssue[] } {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    delimiter: ',',
    skipEmptyLines: false,
    dynamicTyping: false,
  });
  return {
    rows: result.data,
    issues: result.errors.map((e) => ({
      severity: 'error',
      table,
      row: e.row === undefined ? undefined : e.row + 1,
      field: 'CSV',
      message:
        'Malformed CSV. Check matching quotes and comma-separated columns, then upload again.',
    })),
  };
}

export function workbookTables(
  sheets: { sheet: string; data: ImportTable }[],
): { facilities: ImportTable; routes: ImportTable; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const find = (name: string) => {
    const matches = sheets.filter(
      (s) => s.sheet.trim().toLowerCase() === name.toLowerCase(),
    );
    if (matches.length !== 1)
      issues.push({
        severity: 'error',
        table: name,
        field: 'worksheet',
        message: `Include exactly one worksheet named ${name}. Names are case-insensitive.`,
      });
    return matches.length === 1 ? matches[0].data : [];
  };
  return { facilities: find('Facilities'), routes: find('Routes'), issues };
}

export function previewImport(
  facilityTable: ImportTable,
  routeTable: ImportTable,
  initialIssues: ImportIssue[] = [],
): ImportPreview {
  const issues = [...initialIssues];
  const facilities: Facility[] = [],
    routes: Route[] = [];
  const error = (
    table: string,
    row: number | undefined,
    field: string,
    message: string,
  ) => issues.push({ severity: 'error', table, row, field, message });
  const rows = (
    data: ImportTable,
    table: string,
    required: string[],
    limit: number,
  ) => {
    const headerIndex = data.findIndex((row) =>
      row.some((v) => clean(v) !== ''),
    );
    const headers = (data[headerIndex] ?? []).map((v) =>
      Object.hasOwn(headerAliases, key(v)) ? headerAliases[key(v)] : key(v),
    );
    for (const field of required)
      if (!headers.includes(field))
        error(
          table,
          headerIndex < 0 ? 1 : headerIndex + 1,
          field,
          `Missing required column. Add a "${field}" header.`,
        );
    const seen = new Set<string>();
    headers.forEach((h) => {
      if (h && seen.has(h))
        error(
          table,
          headerIndex + 1,
          h,
          'Duplicate column header. Keep one column for this field.',
        );
      seen.add(h);
    });
    const nonempty = data
      .map((values, index) => ({ values, row: index + 1 }))
      .filter(
        (r) => r.row > headerIndex + 1 && r.values.some((v) => clean(v) !== ''),
      );
    if (nonempty.length > limit)
      error(
        table,
        undefined,
        'rows',
        `This version supports up to ${limit.toLocaleString()} ${table.toLowerCase()} per import. Split the network into a smaller file.`,
      );
    return {
      count: nonempty.length,
      data: nonempty.slice(0, limit).map((r) => {
        if (r.values.slice(headers.length).some((v) => clean(v) !== ''))
          error(
            table,
            r.row,
            'columns',
            'A row has more values than headers. Check commas, quotes, and column alignment.',
          );
        return {
          row: r.row,
          values: Object.fromEntries(headers.map((h, i) => [h, r.values[i]])),
        };
      }),
    };
  };
  const fr = rows(
    facilityTable,
    'Facilities',
    ['id', 'name', 'type', 'latitude', 'longitude'],
    IMPORT_LIMITS.facilities,
  );
  const rr = rows(
    routeTable,
    'Routes',
    ['id', 'source', 'destination', 'mode'],
    IMPORT_LIMITS.routes,
  );
  if (!fr.count)
    error('Facilities', undefined, 'rows', 'Add at least one facility.');
  const readText = (
    v: unknown,
    table: string,
    row: number,
    field: string,
    required = true,
  ) => {
    const value = clean(v);
    if ((required && !value) || value.length > 160)
      error(
        table,
        row,
        field,
        `Enter ${required ? 'a non-empty value' : 'text'} of 160 characters or fewer. Formula cells need a saved calculated value.`,
      );
    return value;
  };
  const ids = new Set<string>();
  for (const { row, values: v } of fr.data) {
    const start = issues.length;
    const operations = importOperations(v, 'facility', (field, message) =>
      error('Facilities', row, field, message),
    );
    const id = readText(v.id, 'Facilities', row, 'id'),
      name = readText(v.name, 'Facilities', row, 'name');
    if (ids.has(id))
      error(
        'Facilities',
        row,
        'id',
        `Duplicate ID "${id}". Assign a unique facility ID.`,
      );
    if (id) ids.add(id);
    const type =
      facilityTypes.find((t) => key(t) === key(v.type)) ??
      (Object.hasOwn(typeAliases, key(v.type))
        ? typeAliases[key(v.type)]
        : undefined);
    if (!type)
      error(
        'Facilities',
        row,
        'type',
        'Use Supplier, Factory, Port, Distribution Center (or DC), or Customer Market.',
      );
    const coordinate = (field: 'latitude' | 'longitude', max: number) => {
      const raw = clean(v[field]);
      // Explicit decimal syntax avoids interpreting empty cells, dates, booleans, or hex as coordinates.
      const value = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)
        ? Number(raw)
        : NaN;
      if (!Number.isFinite(value) || Math.abs(value) > max)
        error(
          'Facilities',
          row,
          field,
          `Value "${raw.slice(0, 50)}" is not a coordinate from -${max} to ${max}. Enter decimal degrees.`,
        );
      return value;
    };
    const latitude = coordinate('latitude', 90),
      longitude = coordinate('longitude', 180);
    const city = readText(v.city, 'Facilities', row, 'city', false),
      region = readText(v.region, 'Facilities', row, 'region', false),
      country = readText(v.country, 'Facilities', row, 'country', false);
    if (issues.length === start)
      facilities.push({
        ...operations,
        id,
        name,
        type: type!,
        latitude,
        longitude,
        city,
        region,
        country,
        status: 'operational',
      });
  }
  const routeIds = new Set<string>(),
    connections = new Set<string>();
  for (const { row, values: v } of rr.data) {
    const start = issues.length;
    const operations = importOperations(v, 'route', (field, message) =>
      error('Routes', row, field, message),
    );
    const id = readText(v.id, 'Routes', row, 'id'),
      from = readText(v.source, 'Routes', row, 'source'),
      to = readText(v.destination, 'Routes', row, 'destination');
    if (routeIds.has(id))
      error(
        'Routes',
        row,
        'id',
        `Duplicate ID "${id}". Assign a unique route ID.`,
      );
    routeIds.add(id);
    for (const [field, value] of [
      ['source', from],
      ['destination', to],
    ])
      if (value && !ids.has(value))
        error(
          'Routes',
          row,
          field,
          `Facility "${value}" does not exist. Use an ID from Facilities (IDs are case-sensitive).`,
        );
    if (from && from === to)
      error(
        'Routes',
        row,
        'destination',
        'Source and destination must be different facilities.',
      );
    const mode = transportModes.find((m) => key(m) === key(v.mode));
    if (!mode)
      error('Routes', row, 'mode', `Use ${transportModes.join(', ')}.`);
    const connection = JSON.stringify([from, to, mode]);
    if (connections.has(connection))
      error(
        'Routes',
        row,
        'source/destination/mode',
        'This directional connection and mode already exist. Remove the duplicate route.',
      );
    connections.add(connection);
    if (issues.length === start)
      routes.push({ ...operations, id, from, to, mode: mode! });
  }
  if (!issues.some((i) => i.severity === 'error')) {
    const adjacent = new Map(facilities.map((f) => [f.id, new Set<string>()]));
    for (const r of routes) {
      adjacent.get(r.from)!.add(r.to);
      adjacent.get(r.to)!.add(r.from);
    }
    const isolated = facilities.filter((f) => !adjacent.get(f.id)!.size).length;
    if (isolated)
      issues.push({
        severity: 'warning',
        table: 'Facilities',
        field: 'connections',
        message: `${isolated} isolated ${isolated === 1 ? 'facility has' : 'facilities have'} no connected routes. Import is allowed; shutdowns there remain localized.`,
      });
    let components = 0;
    const visited = new Set<string>();
    for (const f of facilities)
      if (!visited.has(f.id)) {
        components++;
        const queue = [f.id];
        visited.add(f.id);
        for (let i = 0; i < queue.length; i++)
          for (const id of adjacent.get(queue[i])!)
            if (!visited.has(id)) {
              visited.add(id);
              queue.push(id);
            }
      }
    if (components > 1)
      issues.push({
        severity: 'warning',
        table: 'Network',
        field: 'connections',
        message: `${components} disconnected components. Disruptions cannot propagate between them.`,
      });
  }
  return {
    facilities,
    routes,
    issues,
    facilityRows: fr.count,
    routeRows: rr.count,
  };
}

export function createImportedNetwork(
  preview: ImportPreview,
  id: string,
  name: string,
): SupplyNetwork {
  if (preview.issues.some((i) => i.severity === 'error'))
    throw new Error('Correct the import errors before creating the network.');
  if (id === 'demo') throw new Error('Demo Network is read-only.');
  const network: SupplyNetwork = {
    id,
    name: name.trim(),
    kind: 'custom',
    facilities: preview.facilities.map((f) => ({ ...f })),
    routes: preview.routes.map((r) => ({ ...r })),
  };
  validateNetwork(network);
  return network;
}

export function importName(filename: string): string {
  return (
    filename
      .replace(/\.(xlsx|csv)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 160) || 'Imported Network'
  );
}
