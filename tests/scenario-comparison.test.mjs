import test from 'node:test';
import assert from 'node:assert/strict';
import { demoNetwork } from '../lib/networks.ts';
import { getNetworkState, shanghaiClosure } from '../lib/data/scenario.ts';
import {
  createSavedScenario,
  reproduceSavedScenario,
} from '../lib/scenarios.ts';
import {
  buildScenarioComparison,
  isDoNothingScenario,
  scenarioStockoutComparison,
  toggleScenarioSelection,
} from '../lib/scenario-comparison.ts';

const scenario = (id, overrides = {}) => ({
  id,
  name: `Scenario ${id}`,
  createdAt: `2026-09-28T12:0${id.length}:00.000Z`,
  networkId: 'network-1',
  networkName: 'Comparison Network',
  networkFingerprint: 'v1-network',
  disruption: {
    type: 'facility-shutdown',
    facilityId: 'source',
    durationDays: 14,
  },
  disruptedFacilityName: 'Source',
  mitigation: { kind: 'custom', choice: { id: 'do-nothing' } },
  mitigationName: 'Do Nothing',
  snapshot: {
    kpis: {
      serviceLevel: 72,
      leadTime: 24,
      logisticsCost: 305000,
      facilitiesAtRisk: 2,
    },
    blockedRoutes: 1,
    affectedRoutes: 1,
    projectedStockouts: 2,
    protectedFacilities: 0,
    noDataFacilities: 0,
    earliestStockoutDay: 5,
  },
  ...overrides,
});

test('selection tracks IDs and cannot compare fewer than two scenarios', () => {
  const first = toggleScenarioSelection([], 'one');
  assert.deepEqual(first, { ids: ['one'], message: '' });
  assert.equal(buildScenarioComparison([scenario('one')], first.ids).ok, false);
  const second = toggleScenarioSelection(first.ids, 'two');
  assert.deepEqual(second.ids, ['one', 'two']);
  assert.equal(
    buildScenarioComparison([scenario('one'), scenario('two')], second.ids)
      .ok,
    true,
  );
  assert.deepEqual(toggleScenarioSelection(second.ids, 'one').ids, ['two']);
});

test('selection caps comparison at four scenarios without mutating input', () => {
  const selected = ['one', 'two', 'three', 'four'];
  const before = [...selected];
  const next = toggleScenarioSelection(selected, 'five');
  assert.deepEqual(next.ids, before);
  assert.match(next.message, /up to 4/i);
  assert.deepEqual(selected, before);
});

test('same-network scenarios compare in selected order with exact KPI snapshots', () => {
  const baseline = scenario('baseline');
  const expedite = scenario('expedite', {
    mitigation: {
      kind: 'custom',
      choice: { id: 'air-freight', facilityId: 'target' },
    },
    mitigationName: 'Expedite / Air Freight',
    snapshot: {
      ...baseline.snapshot,
      kpis: {
        serviceLevel: 81,
        leadTime: 21,
        logisticsCost: 340840,
        facilitiesAtRisk: 1,
      },
      projectedStockouts: 1,
      protectedFacilities: 1,
      earliestStockoutDay: 10,
    },
  });
  const result = buildScenarioComparison(
    [baseline, expedite],
    ['expedite', 'baseline'],
  );
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.comparison.scenarios.map((item) => item.id),
    ['expedite', 'baseline'],
  );
  assert.equal(result.comparison.baselineId, 'baseline');
  assert.equal(result.comparison.referenceId, 'baseline');
  assert.equal(result.comparison.scenarios[0].snapshot.kpis.serviceLevel, 81);
  assert.deepEqual(result.comparison.standings.serviceLevel.bestIds, [
    'expedite',
  ]);
  assert.deepEqual(result.comparison.standings.logisticsCost.worstIds, [
    'expedite',
  ]);
});

test('different network IDs or fingerprints are rejected as incompatible', () => {
  const original = scenario('one');
  const anotherNetwork = scenario('two', { networkId: 'network-2' });
  const changedNetwork = scenario('three', {
    networkFingerprint: 'v1-changed',
  });
  for (const candidate of [anotherNetwork, changedNetwork]) {
    const result = buildScenarioComparison(
      [original, candidate],
      ['one', candidate.id],
    );
    assert.deepEqual(
      { ok: result.ok, reason: result.reason },
      { ok: false, reason: 'incompatible-network' },
    );
  }
});

test('Do Nothing is identified while a mitigation-only comparison uses its first selection', () => {
  const baseline = scenario('baseline');
  const reroute = scenario('reroute', {
    mitigation: {
      kind: 'custom',
      choice: {
        id: 'reroute',
        routeId: 'blocked',
        alternateRouteId: 'alternate',
      },
    },
    mitigationName: 'Reroute',
  });
  const expedite = scenario('expedite', {
    mitigation: {
      kind: 'custom',
      choice: { id: 'air-freight', facilityId: 'target' },
    },
    mitigationName: 'Expedite / Air Freight',
  });
  assert.equal(isDoNothingScenario(baseline), true);
  assert.equal(isDoNothingScenario(reroute), false);
  const withBaseline = buildScenarioComparison(
    [reroute, baseline],
    ['reroute', 'baseline'],
  );
  assert.equal(withBaseline.comparison.referenceId, 'baseline');
  const mitigationsOnly = buildScenarioComparison(
    [reroute, expedite],
    ['expedite', 'reroute'],
  );
  assert.equal(mitigationsOnly.comparison.baselineId, undefined);
  assert.equal(mitigationsOnly.comparison.referenceId, 'expedite');
});

test('stockout comparison preserves day, protected, no-stockout and no-data states', () => {
  const day = scenarioStockoutComparison(scenario('day'));
  const protectedState = scenarioStockoutComparison(
    scenario('protected', {
      snapshot: {
        ...scenario('base').snapshot,
        projectedStockouts: 0,
        protectedFacilities: 2,
        earliestStockoutDay: undefined,
      },
    }),
  );
  const noData = scenarioStockoutComparison(
    scenario('no-data', {
      snapshot: {
        ...scenario('base').snapshot,
        projectedStockouts: 0,
        protectedFacilities: 0,
        noDataFacilities: 2,
        earliestStockoutDay: undefined,
      },
    }),
  );
  const noStockout = scenarioStockoutComparison(
    scenario('no-stockout', {
      snapshot: {
        ...scenario('base').snapshot,
        projectedStockouts: 0,
        protectedFacilities: 0,
        noDataFacilities: 0,
        earliestStockoutDay: undefined,
      },
    }),
  );
  assert.deepEqual({ kind: day.kind, label: day.label }, { kind: 'day', label: 'Day 5.0' });
  assert.deepEqual(
    { kind: protectedState.kind, label: protectedState.label },
    { kind: 'protected', label: 'Protected' },
  );
  assert.deepEqual(
    { kind: noData.kind, label: noData.label },
    { kind: 'no-data', label: 'No data' },
  );
  assert.deepEqual(
    { kind: noStockout.kind, label: noStockout.label },
    { kind: 'no-stockout', label: 'No projected stockout' },
  );
});

test('building a comparison does not mutate scenarios or their snapshots', () => {
  const scenarios = [scenario('one'), scenario('two')];
  const before = structuredClone(scenarios);
  const result = buildScenarioComparison(scenarios, ['one', 'two']);
  assert.equal(result.ok, true);
  assert.deepEqual(scenarios, before);
  assert.equal(result.comparison.scenarios[0], scenarios[0]);
});

test('a scenario opened from comparison still uses the existing reproduction pipeline', () => {
  const disruption = {
    type: 'facility-shutdown',
    facilityId: shanghaiClosure.disruptedFacilityId,
    durationDays: shanghaiClosure.durationDays,
  };
  const doNothing = createSavedScenario({
    id: 'demo-baseline',
    name: 'Shanghai — Do Nothing',
    createdAt: '2026-09-28T14:00:00.000Z',
    network: demoNetwork,
    disruption,
    mitigation: { kind: 'demo', strategy: 'do-nothing' },
    result: getNetworkState(true, 'do-nothing'),
  });
  const air = createSavedScenario({
    id: 'demo-air',
    name: 'Shanghai — Air Freight',
    createdAt: '2026-09-28T14:05:00.000Z',
    network: demoNetwork,
    disruption,
    mitigation: { kind: 'demo', strategy: 'air-freight' },
    result: getNetworkState(true, 'air-freight'),
  });
  const result = buildScenarioComparison(
    [doNothing, air],
    ['do-nothing', 'demo-air'],
  );
  assert.equal(result.ok, false);
  const valid = buildScenarioComparison(
    [doNothing, air],
    ['demo-baseline', 'demo-air'],
  );
  assert.equal(valid.ok, true);
  const reopened = reproduceSavedScenario(valid.comparison.scenarios[1], []);
  assert.equal(reopened.ok, true);
  assert.deepEqual(reopened.result.kpis, air.snapshot.kpis);
});
