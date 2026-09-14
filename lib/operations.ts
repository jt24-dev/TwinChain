export interface FacilityOperations {
  capacity?: number;
  currentInventory?: number;
  dailyDemand?: number;
  utilization?: number;
  replenishmentLeadTime?: number;
  criticality?: 'Low' | 'Medium' | 'High' | 'Critical';
}
export interface RouteOperations {
  transitTime?: number;
  costPerShipment?: number;
  routeCapacity?: number;
  shipmentFrequency?: number;
  reliability?: number;
}
export const criticalities = ['Low', 'Medium', 'High', 'Critical'] as const;
export const facilityOperationFields = [
  { key: 'capacity', column: 'capacity', label: 'Capacity', unit: 'units/day' },
  {
    key: 'currentInventory',
    column: 'current_inventory',
    label: 'Current inventory',
    unit: 'units',
  },
  {
    key: 'dailyDemand',
    column: 'daily_demand',
    label: 'Daily demand / flow',
    unit: 'units/day',
  },
  {
    key: 'utilization',
    column: 'utilization',
    label: 'Utilization',
    unit: '%',
    max: 100,
  },
  {
    key: 'replenishmentLeadTime',
    column: 'replenishment_lead_time',
    label: 'Replenishment lead time',
    unit: 'days',
  },
] as const;
export const routeOperationFields = [
  {
    key: 'transitTime',
    column: 'transit_time',
    label: 'Transit time',
    unit: 'days',
  },
  {
    key: 'costPerShipment',
    column: 'cost_per_shipment',
    label: 'Cost per shipment',
    unit: 'USD',
  },
  {
    key: 'routeCapacity',
    column: 'route_capacity',
    label: 'Route capacity',
    unit: 'units',
  },
  {
    key: 'shipmentFrequency',
    column: 'shipment_frequency',
    label: 'Shipment frequency',
    unit: 'shipments/week',
  },
  {
    key: 'reliability',
    column: 'reliability',
    label: 'Reliability',
    unit: '%',
    max: 100,
  },
] as const;
export type OperationField =
  | (typeof facilityOperationFields)[number]
  | (typeof routeOperationFields)[number];
export function numericOperation(
  value: unknown,
  field: OperationField,
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && !value.trim())
  )
    return undefined;
  const raw = typeof value === 'string' ? value.trim() : value;
  const number =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' &&
          /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)
        ? Number(raw)
        : NaN;
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    ('max' in field && number > field.max)
  )
    throw new Error(
      `${field.label}: enter ${'max' in field ? 'a number from 0 to 100' : 'a non-negative number'}, or leave blank.`,
    );
  return number;
}
export function validateOperations(
  data: FacilityOperations | RouteOperations,
  kind: 'facility' | 'route',
) {
  for (const field of kind === 'facility'
    ? facilityOperationFields
    : routeOperationFields) {
    const value = (data as Record<string, unknown>)[field.key];
    if (
      value !== undefined &&
      (typeof value !== 'number' ||
        numericOperation(value, field) === undefined)
    )
      throw new Error(`${field.label} must be a number or omitted.`);
  }
  if (
    kind === 'facility' &&
    'criticality' in data &&
    data.criticality !== undefined &&
    !criticalities.includes(data.criticality)
  )
    throw new Error('Choose Low, Medium, High, or Critical.');
}
export function operationValues<T extends FacilityOperations | RouteOperations>(
  data: T,
  kind: 'facility' | 'route',
) {
  const fields: string[] = (
    kind === 'facility' ? facilityOperationFields : routeOperationFields
  ).map((f) => f.key);
  if (kind === 'facility') fields.push('criticality');
  return Object.fromEntries(
    fields
      .filter((k) => (data as Record<string, unknown>)[k] !== undefined)
      .map((k) => [k, (data as Record<string, unknown>)[k]]),
  );
}
export function inventoryCoverage(
  data: FacilityOperations,
): number | undefined {
  if (
    data.currentInventory === undefined ||
    !data.dailyDemand ||
    data.dailyDemand <= 0
  )
    return undefined;
  const value = data.currentInventory / data.dailyDemand;
  return Number.isFinite(value) ? value : undefined;
}
export function operationalCompleteness(network: {
  facilities: FacilityOperations[];
  routes: RouteOperations[];
}) {
  const facilities = network.facilities.filter(
    (f) => Object.keys(operationValues(f, 'facility')).length > 0,
  ).length;
  const routes = network.routes.filter(
    (r) => Object.keys(operationValues(r, 'route')).length > 0,
  ).length;
  return { facilities, routes };
}
export function importOperations(
  values: Record<string, unknown>,
  kind: 'facility' | 'route',
  onError: (column: string, message: string) => void,
): FacilityOperations & RouteOperations {
  const result: Record<string, unknown> = {};
  for (const field of kind === 'facility'
    ? facilityOperationFields
    : routeOperationFields) {
    try {
      const value = numericOperation(
        values[field.column.replaceAll('_', ' ')],
        field,
      );
      if (value !== undefined) result[field.key] = value;
    } catch (e) {
      onError(field.column, (e as Error).message);
    }
  }
  const raw = values.criticality;
  if (kind === 'facility' && raw !== undefined && raw !== null && raw !== '') {
    const value =
      typeof raw === 'string'
        ? criticalities.find(
            (c) => c.toLowerCase() === raw.trim().toLowerCase(),
          )
        : undefined;
    if (value) result.criticality = value;
    else if (typeof raw !== 'string' || raw.trim())
      onError(
        'criticality',
        'Choose Low, Medium, High, or Critical, or leave blank.',
      );
  }
  return result;
}
