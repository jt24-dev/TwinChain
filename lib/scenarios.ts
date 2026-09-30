import { demoNetwork, type SupplyNetwork } from './networks.ts';
import { getNetworkState, shanghaiClosure } from './data/scenario.ts';
import {
  applyCustomMitigation,
  customStrategyNames,
  type CustomMitigation,
} from './simulation/custom-mitigation.ts';
import {
  disruptionLabels,
  parseDisruption,
  runDisruption,
  type Disruption,
} from './simulation/disruption.ts';
import { strategies, type StrategyId } from './simulation/mitigation.ts';
import type { KPIs, SimulationResult } from './simulation/model.ts';

export type SavedScenarioMitigation =
  | { kind: 'demo'; strategy: StrategyId }
  | { kind: 'custom'; choice: CustomMitigation };

export interface ScenarioResultSnapshot {
  kpis: KPIs;
  blockedRoutes: number;
  affectedRoutes: number;
  projectedStockouts: number;
  protectedFacilities: number;
  noDataFacilities?: number;
  earliestStockoutDay?: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  networkId: string;
  networkName: string;
  networkFingerprint: string;
  disruption: Disruption;
  disruptedFacilityName: string;
  mitigation: SavedScenarioMitigation;
  mitigationName: string;
  snapshot: ScenarioResultSnapshot;
}

export interface SavedScenarioLibrary {
  version: 1;
  scenarios: SavedScenario[];
}

export const SCENARIO_STORAGE_KEY = 'twinchain-scenarios-v1';
export const emptyScenarioLibrary: SavedScenarioLibrary = {
  version: 1,
  scenarios: [],
};

function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 160)
    throw new Error(`${label} must be non-empty and 160 characters or fewer.`);
}

function count(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
    throw new Error(`${label} must be a nonnegative whole number.`);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Compact deterministic fingerprint; the source network itself remains separately persisted. */
export function scenarioNetworkFingerprint(network: SupplyNetwork) {
  const source = stableStringify({
    id: network.id,
    kind: network.kind,
    facilities: network.facilities,
    routes: network.routes,
    ...(network.skus?.length ? { skus: network.skus } : {}),
    ...(network.inventoryRecords?.length
      ? { inventoryRecords: network.inventoryRecords }
      : {}),
    ...(network.skuSourcing?.length
      ? { skuSourcing: network.skuSourcing }
      : {}),
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function mitigationName(mitigation: SavedScenarioMitigation) {
  return mitigation.kind === 'demo'
    ? strategies.find((item) => item.id === mitigation.strategy)?.name
    : customStrategyNames[mitigation.choice.id];
}

function validateChoice(choice: CustomMitigation): CustomMitigation {
  if (choice?.id === 'do-nothing') return { id: 'do-nothing' };
  if (choice?.id === 'reroute') {
    text(choice.routeId, 'Disrupted route ID');
    text(choice.alternateRouteId, 'Alternate route ID');
    return {
      id: 'reroute',
      routeId: choice.routeId,
      alternateRouteId: choice.alternateRouteId,
    };
  }
  if (choice?.id === 'air-freight') {
    text(choice.facilityId, 'Expedite facility ID');
    return { id: 'air-freight', facilityId: choice.facilityId };
  }
  throw new Error('Saved scenario has an unsupported mitigation choice.');
}

function parseScenario(value: unknown): SavedScenario {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid saved scenario.');
  const item = value as Partial<SavedScenario>;
  text(item.id, 'Scenario ID');
  text(item.name, 'Scenario name');
  text(item.createdAt, 'Scenario timestamp');
  if (!Number.isFinite(Date.parse(item.createdAt)))
    throw new Error('Scenario timestamp is invalid.');
  text(item.networkId, 'Scenario network ID');
  text(item.networkName, 'Scenario network name');
  text(item.networkFingerprint, 'Scenario network fingerprint');
  text(item.disruptedFacilityName, 'Disrupted facility name');
  const disruption = parseDisruption(item.disruption);
  const mitigation = item.mitigation;
  let parsedMitigation: SavedScenarioMitigation;
  if (mitigation?.kind === 'demo') {
    if (!strategies.some((strategy) => strategy.id === mitigation.strategy))
      throw new Error('Saved scenario has an unsupported Demo strategy.');
    parsedMitigation = { kind: 'demo', strategy: mitigation.strategy };
  } else if (mitigation?.kind === 'custom') {
    parsedMitigation = {
      kind: 'custom',
      choice: validateChoice(mitigation.choice),
    };
  } else {
    throw new Error('Saved scenario mitigation is invalid.');
  }
  const snapshot = item.snapshot;
  if (!snapshot?.kpis)
    throw new Error('Saved scenario result summary is missing.');
  const kpis = snapshot.kpis;
  for (const label of [
    'serviceLevel',
    'leadTime',
    'logisticsCost',
    'facilitiesAtRisk',
  ] as const) {
    const number = kpis[label];
    if (!Number.isFinite(number))
      throw new Error(`Scenario KPI ${label} must be finite.`);
  }
  count(snapshot.blockedRoutes, 'Blocked route count');
  count(snapshot.affectedRoutes, 'Affected route count');
  count(snapshot.projectedStockouts, 'Projected stockout count');
  count(snapshot.protectedFacilities, 'Protected facility count');
  if (snapshot.noDataFacilities !== undefined)
    count(snapshot.noDataFacilities, 'No-data facility count');
  if (
    snapshot.earliestStockoutDay !== undefined &&
    (!Number.isFinite(snapshot.earliestStockoutDay) ||
      snapshot.earliestStockoutDay < 0)
  )
    throw new Error('Earliest stockout day must be nonnegative.');
  const expectedMitigationName = mitigationName(parsedMitigation);
  if (!expectedMitigationName)
    throw new Error('Saved scenario mitigation is unsupported.');
  return {
    id: item.id,
    name: item.name.trim(),
    createdAt: new Date(item.createdAt).toISOString(),
    networkId: item.networkId,
    networkName: item.networkName,
    networkFingerprint: item.networkFingerprint,
    disruption,
    disruptedFacilityName: item.disruptedFacilityName,
    mitigation: parsedMitigation,
    mitigationName: expectedMitigationName,
    snapshot: {
      kpis: {
        serviceLevel: kpis.serviceLevel,
        leadTime: kpis.leadTime,
        logisticsCost: kpis.logisticsCost,
        facilitiesAtRisk: kpis.facilitiesAtRisk,
      },
      blockedRoutes: snapshot.blockedRoutes,
      affectedRoutes: snapshot.affectedRoutes,
      projectedStockouts: snapshot.projectedStockouts,
      protectedFacilities: snapshot.protectedFacilities,
      ...(snapshot.noDataFacilities === undefined
        ? {}
        : { noDataFacilities: snapshot.noDataFacilities }),
      ...(snapshot.earliestStockoutDay === undefined
        ? {}
        : { earliestStockoutDay: snapshot.earliestStockoutDay }),
    },
  };
}

export function parseScenarioLibrary(raw: string): SavedScenarioLibrary {
  const saved = JSON.parse(raw) as Partial<SavedScenarioLibrary>;
  if (!saved || saved.version !== 1 || !Array.isArray(saved.scenarios))
    throw new Error('Saved scenarios have an unsupported format.');
  const ids = new Set<string>();
  const scenarios = saved.scenarios.map((item) => {
    const scenario = parseScenario(item);
    if (ids.has(scenario.id))
      throw new Error('Saved scenario IDs must be unique.');
    ids.add(scenario.id);
    return scenario;
  });
  scenarios.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { version: 1, scenarios };
}

export function serializeScenarioLibrary(saved: SavedScenarioLibrary) {
  return JSON.stringify(parseScenarioLibrary(JSON.stringify(saved)));
}

function scenarioIdentity(scenario: SavedScenario) {
  return stableStringify({
    name: scenario.name.toLocaleLowerCase(),
    networkId: scenario.networkId,
    networkFingerprint: scenario.networkFingerprint,
    disruption: scenario.disruption,
    mitigation: scenario.mitigation,
  });
}

export function addSavedScenario(
  saved: SavedScenarioLibrary,
  scenario: SavedScenario,
) {
  const parsed = parseScenario(scenario);
  if (saved.scenarios.some((item) => item.id === parsed.id))
    throw new Error('Choose a new scenario ID.');
  if (
    saved.scenarios.some(
      (item) => scenarioIdentity(item) === scenarioIdentity(parsed),
    )
  )
    throw new Error('This scenario is already saved.');
  return parseScenarioLibrary(
    JSON.stringify({ version: 1, scenarios: [parsed, ...saved.scenarios] }),
  );
}

export function removeSavedScenario(
  saved: SavedScenarioLibrary,
  scenarioId: string,
) {
  if (!saved.scenarios.some((item) => item.id === scenarioId))
    throw new Error('Saved scenario no longer exists.');
  return {
    version: 1 as const,
    scenarios: saved.scenarios.filter((item) => item.id !== scenarioId),
  };
}

export function createSavedScenario({
  id,
  name,
  createdAt,
  network,
  disruption,
  mitigation,
  result,
}: {
  id: string;
  name: string;
  createdAt: string;
  network: SupplyNetwork;
  disruption: Disruption;
  mitigation: SavedScenarioMitigation;
  result: SimulationResult;
}) {
  text(name, 'Scenario name');
  if (!result.active) throw new Error('Run a disruption before saving.');
  if (
    (network.kind === 'demo' && mitigation.kind !== 'demo') ||
    (network.kind === 'custom' && mitigation.kind !== 'custom')
  )
    throw new Error('Scenario mitigation does not match its network.');
  const input = parseDisruption(disruption);
  const routeTarget =
    input.type === 'route-closure'
      ? network.routes.find((item) => item.id === input.routeId)
      : undefined;
  const facilityTarget =
    input.type !== 'route-closure'
      ? network.facilities.find((item) => item.id === input.facilityId)
      : undefined;
  if (!routeTarget && !facilityTarget)
    throw new Error('The disruption target no longer exists.');
  const targetName = routeTarget
    ? `${network.facilities.find((f) => f.id === routeTarget.from)?.name ?? routeTarget.from} → ${network.facilities.find((f) => f.id === routeTarget.to)?.name ?? routeTarget.to}`
    : facilityTarget!.name;
  return parseScenario({
    id,
    name,
    createdAt,
    networkId: network.id,
    networkName: network.name,
    networkFingerprint: scenarioNetworkFingerprint(network),
    disruption: input,
    disruptedFacilityName: targetName,
    mitigation,
    snapshot: {
      kpis: { ...result.kpis },
      blockedRoutes: result.blockedRouteIds.length,
      affectedRoutes: result.affectedRouteIds.length,
      projectedStockouts:
        result.inventorySummary?.stockoutFacilityIds.length ?? 0,
      protectedFacilities:
        result.inventorySummary?.protectedFacilityIds.length ?? 0,
      ...(result.inventorySummary
        ? {
            noDataFacilities: result.inventorySummary.noDataFacilityIds.length,
          }
        : {}),
      ...(result.inventorySummary?.earliestStockoutDay === undefined
        ? {}
        : {
            earliestStockoutDay: result.inventorySummary.earliestStockoutDay,
          }),
    },
  });
}

export function defaultScenarioName(
  network: SupplyNetwork,
  disruption: Disruption,
  mitigation: SavedScenarioMitigation,
) {
  const routeTarget =
    disruption.type === 'route-closure'
      ? network.routes.find((item) => item.id === disruption.routeId)
      : undefined;
  const facilityTarget =
    disruption.type !== 'route-closure'
      ? network.facilities.find((item) => item.id === disruption.facilityId)
      : undefined;
  const targetName = routeTarget
    ? `${network.facilities.find((f) => f.id === routeTarget.from)?.name ?? routeTarget.from} → ${network.facilities.find((f) => f.id === routeTarget.to)?.name ?? routeTarget.to}`
    : (facilityTarget?.name ?? 'Target');
  const response = mitigationName(mitigation);
  const suffix = response && response !== 'Do Nothing' ? ` — ${response}` : '';
  return `${disruptionLabels[disruption.type]} · ${targetName} — ${disruption.durationDays} days${suffix}`;
}

export type ScenarioReproduction =
  | { ok: true; network: SupplyNetwork; result: SimulationResult }
  | {
      ok: false;
      reason: 'missing-network' | 'changed-network' | 'invalid';
      message: string;
    };

/** Recompute from saved inputs; result snapshots are never treated as source state. */
export function reproduceSavedScenario(
  scenario: SavedScenario,
  customNetworks: readonly SupplyNetwork[],
): ScenarioReproduction {
  const network =
    scenario.networkId === 'demo'
      ? demoNetwork
      : customNetworks.find((item) => item.id === scenario.networkId);
  if (!network)
    return {
      ok: false,
      reason: 'missing-network',
      message: 'Original network is no longer available for this scenario.',
    };
  if (scenarioNetworkFingerprint(network) !== scenario.networkFingerprint)
    return {
      ok: false,
      reason: 'changed-network',
      message:
        'This scenario can no longer be reproduced with the current network.',
    };
  try {
    if (network.kind === 'demo') {
      if (
        scenario.mitigation.kind !== 'demo' ||
        scenario.disruption.type !== 'facility-shutdown' ||
        scenario.disruption.facilityId !==
          shanghaiClosure.disruptedFacilityId ||
        scenario.disruption.durationDays !== shanghaiClosure.durationDays
      )
        throw new Error('Saved Demo inputs are no longer supported.');
      return {
        ok: true,
        network,
        result: getNetworkState(true, scenario.mitigation.strategy),
      };
    }
    if (scenario.mitigation.kind !== 'custom')
      throw new Error('Saved Custom Network mitigation is invalid.');
    const original = runDisruption(
      network.facilities,
      network.routes,
      scenario.disruption,
      'custom',
      network.inventoryRecords,
      network.skuSourcing,
    );
    return {
      ok: true,
      network,
      result: applyCustomMitigation(original, scenario.mitigation.choice),
    };
  } catch {
    return {
      ok: false,
      reason: 'invalid',
      message:
        'This scenario can no longer be reproduced with the current network.',
    };
  }
}
