import type { Facility, Route } from '../data/network.ts';
import type { ImportIssue, ImportTable } from './network-import.ts';

export type ImportTableKind = 'facilities' | 'routes';
export type MappingConfidence = 'exact' | 'suggested' | 'unmapped';

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  category: 'Structural' | 'Location' | 'Operational';
  aliases: readonly string[];
}

export interface ImportColumn {
  index: number;
  label: string;
}

export interface ColumnMapping {
  fields: Record<string, number | undefined>;
  confidence: Record<string, MappingConfidence>;
}

export const facilityImportFields: readonly ImportField[] = [
  {
    key: 'id',
    label: 'Facility ID',
    required: true,
    category: 'Structural',
    aliases: ['facility id', 'location id', 'site id'],
  },
  {
    key: 'name',
    label: 'Facility name',
    required: true,
    category: 'Structural',
    aliases: [
      'facility',
      'location',
      'warehouse',
      'site',
      'facility name',
      'location name',
      'site name',
    ],
  },
  {
    key: 'type',
    label: 'Facility type',
    required: true,
    category: 'Structural',
    aliases: ['facility type', 'location type', 'site type', 'category'],
  },
  {
    key: 'latitude',
    label: 'Latitude',
    required: true,
    category: 'Location',
    aliases: ['lat'],
  },
  {
    key: 'longitude',
    label: 'Longitude',
    required: true,
    category: 'Location',
    aliases: ['lng', 'lon', 'long'],
  },
  {
    key: 'city',
    label: 'City',
    required: false,
    category: 'Location',
    aliases: ['town'],
  },
  {
    key: 'region',
    label: 'Region',
    required: false,
    category: 'Location',
    aliases: ['state', 'province', 'area'],
  },
  {
    key: 'country',
    label: 'Country',
    required: false,
    category: 'Location',
    aliases: ['nation'],
  },
  {
    key: 'capacity',
    label: 'Capacity',
    required: false,
    category: 'Operational',
    aliases: ['daily capacity', 'throughput capacity'],
  },
  {
    key: 'current_inventory',
    label: 'Current inventory',
    required: false,
    category: 'Operational',
    aliases: [
      'inventory',
      'qty oh',
      'qty on hand',
      'qoh',
      'stock',
      'on hand',
      'quantity on hand',
    ],
  },
  {
    key: 'daily_demand',
    label: 'Daily demand / flow',
    required: false,
    category: 'Operational',
    aliases: [
      'avg daily usage',
      'average daily usage',
      'daily usage',
      'demand',
      'daily flow',
    ],
  },
  {
    key: 'utilization',
    label: 'Utilization',
    required: false,
    category: 'Operational',
    aliases: ['utilisation', 'utilization percent', 'utilization pct'],
  },
  {
    key: 'replenishment_lead_time',
    label: 'Replenishment lead time',
    required: false,
    category: 'Operational',
    aliases: ['lead time', 'replenishment days', 'lead time days'],
  },
  {
    key: 'criticality',
    label: 'Criticality',
    required: false,
    category: 'Operational',
    aliases: ['priority', 'facility criticality'],
  },
] as const;

export const routeImportFields: readonly ImportField[] = [
  {
    key: 'id',
    label: 'Route ID',
    required: true,
    category: 'Structural',
    aliases: ['route id', 'lane id', 'connection id'],
  },
  {
    key: 'source',
    label: 'Origin',
    required: true,
    category: 'Structural',
    aliases: ['origin', 'from', 'origin id', 'source id', 'from id'],
  },
  {
    key: 'destination',
    label: 'Destination',
    required: true,
    category: 'Structural',
    aliases: ['dest', 'to', 'destination id', 'to id'],
  },
  {
    key: 'mode',
    label: 'Transport mode',
    required: true,
    category: 'Structural',
    aliases: ['transport mode', 'shipping mode', 'transportation mode'],
  },
  {
    key: 'transit_time',
    label: 'Transit time',
    required: false,
    category: 'Operational',
    aliases: ['transit days', 'transit time days'],
  },
  {
    key: 'cost_per_shipment',
    label: 'Cost per shipment',
    required: false,
    category: 'Operational',
    aliases: ['shipment cost', 'cost shipment'],
  },
  {
    key: 'route_capacity',
    label: 'Route capacity',
    required: false,
    category: 'Operational',
    aliases: ['lane capacity', 'transport capacity'],
  },
  {
    key: 'shipment_frequency',
    label: 'Shipment frequency',
    required: false,
    category: 'Operational',
    aliases: ['shipments per week', 'frequency'],
  },
  {
    key: 'reliability',
    label: 'Reliability',
    required: false,
    category: 'Operational',
    aliases: ['reliability percent', 'on time percent'],
  },
] as const;

export const importFields = (kind: ImportTableKind) =>
  kind === 'facilities' ? facilityImportFields : routeImportFields;

export function normalizeImportToken(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
    : '';
}

export function tableHeader(table: ImportTable): {
  index: number;
  columns: ImportColumn[];
} {
  const index = table.findIndex((row) =>
    row.some((value) => normalizeImportToken(value) !== ''),
  );
  const columns = (table[index] ?? []).map((value, columnIndex) => ({
    index: columnIndex,
    label:
      typeof value === 'string' || typeof value === 'number'
        ? String(value).trim()
        : '',
  }));
  return { index, columns: columns.filter((column) => column.label) };
}

export function suggestColumnMapping(
  table: ImportTable,
  kind: ImportTableKind,
): ColumnMapping {
  const { columns } = tableHeader(table);
  const used = new Set<number>();
  const fields: Record<string, number | undefined> = {};
  const confidence: Record<string, MappingConfidence> = {};
  for (const field of importFields(kind)) {
    const canonical = normalizeImportToken(field.key);
    let match = columns.find(
      (column) =>
        !used.has(column.index) &&
        normalizeImportToken(column.label) === canonical,
    );
    let level: MappingConfidence = match ? 'exact' : 'unmapped';
    if (!match) {
      const aliases = new Set(field.aliases.map(normalizeImportToken));
      match = columns.find(
        (column) =>
          !used.has(column.index) &&
          aliases.has(normalizeImportToken(column.label)),
      );
      if (match) level = 'suggested';
    }
    fields[field.key] = match?.index;
    confidence[field.key] = level;
    if (match) used.add(match.index);
  }
  return { fields, confidence };
}

export function isStandardMapping(
  mapping: ColumnMapping,
  kind: ImportTableKind,
) {
  return importFields(kind)
    .filter((field) => field.required)
    .every(
      (field) =>
        mapping.fields[field.key] !== undefined &&
        mapping.confidence[field.key] === 'exact',
    );
}

export function applyColumnMapping(
  table: ImportTable,
  kind: ImportTableKind,
  mapping: Record<string, number | undefined>,
): { table: ImportTable; issues: ImportIssue[] } {
  const header = tableHeader(table);
  const fields = importFields(kind);
  const issues: ImportIssue[] = [];
  const mapped = fields.filter((field) => mapping[field.key] !== undefined);
  for (const field of fields.filter((item) => item.required)) {
    if (mapping[field.key] === undefined)
      issues.push({
        severity: 'error',
        table: kind === 'facilities' ? 'Facilities' : 'Routes',
        field: field.key,
        message:
          field.key === 'latitude'
            ? 'Latitude is required for facility placement.'
            : field.key === 'source'
              ? 'Origin must be mapped.'
              : `${field.label} is required.`,
      });
  }
  const sources = new Map<number, string>();
  for (const field of mapped) {
    const source = mapping[field.key]!;
    const previous = sources.get(source);
    if (previous)
      issues.push({
        severity: 'error',
        table: kind === 'facilities' ? 'Facilities' : 'Routes',
        field: field.key,
        message: `Uploaded column "${header.columns.find((column) => column.index === source)?.label ?? source + 1}" is already mapped to ${previous}. Choose a different column.`,
      });
    else sources.set(source, field.label);
  }
  const result: ImportTable = table.map((row, rowIndex) => {
    if (rowIndex < header.index) return [];
    if (rowIndex === header.index) return mapped.map((field) => field.key);
    return mapped.map((field) => row[mapping[field.key]!]);
  });
  if (header.index < 0) result.push(mapped.map((field) => field.key));
  return { table: result, issues };
}

export function mappingSummary(
  kind: ImportTableKind,
  mapping: Record<string, number | undefined>,
) {
  const fields = importFields(kind);
  return {
    mapped: fields.filter((field) => mapping[field.key] !== undefined).length,
    unmappedOptional: fields.filter(
      (field) => !field.required && mapping[field.key] === undefined,
    ).length,
  };
}

const facilityTypeAliases: Record<string, Facility['type']> = {
  dc: 'Distribution center',
  warehouse: 'Distribution center',
  plant: 'Factory',
  vendor: 'Supplier',
};

const transportModeAliases: Record<string, Route['mode']> = {
  sea: 'Ocean',
  oceanfreight: 'Ocean',
  ship: 'Ocean',
  airfreight: 'Air',
  plane: 'Air',
  railroad: 'Rail',
  train: 'Rail',
  trucking: 'Truck',
  lorry: 'Truck',
};

export const facilityTypeAlias = (value: unknown) =>
  Object.hasOwn(facilityTypeAliases, normalizeImportToken(value))
    ? facilityTypeAliases[normalizeImportToken(value)]
    : undefined;
export const transportModeAlias = (value: unknown) =>
  Object.hasOwn(transportModeAliases, normalizeImportToken(value))
    ? transportModeAliases[normalizeImportToken(value)]
    : undefined;
