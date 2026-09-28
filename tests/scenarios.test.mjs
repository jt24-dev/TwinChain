import test from 'node:test';
import assert from 'node:assert/strict';
import { demoNetwork } from '../lib/networks.ts';
import { getNetworkState, shanghaiClosure } from '../lib/data/scenario.ts';
import { runFacilityShutdown } from '../lib/simulation/facility-shutdown.ts';
import { applyCustomMitigation } from '../lib/simulation/custom-mitigation.ts';
import {
  addSavedScenario,
  createSavedScenario,
  emptyScenarioLibrary,
  parseScenarioLibrary,
  removeSavedScenario,
  reproduceSavedScenario,
  SCENARIO_STORAGE_KEY,
  serializeScenarioLibrary,
} from '../lib/scenarios.ts';

const facility = (id, name, extra = {}) => ({
  id,
  name,
  city: name,
  region: 'Test',
  type: 'Factory',
  latitude: 30,
  longitude: 20,
  status: 'operational',
  ...extra,
});
const customNetwork = () => ({
  id: 'history-network',
  name: 'History Network',
  kind: 'custom',
  facilities: [
    facility('source', 'Source'),
    facility('alternate', 'Alternate'),
    facility('target', 'Target', {
      currentInventory: 500,
      dailyDemand: 100,
    }),
    facility('market', 'Market', {
      currentInventory: 200,
      dailyDemand: 10,
    }),
  ],
  routes: [
    {
      id: 'blocked',
      from: 'source',
      to: 'target',
      mode: 'Road',
      routeCapacity: 100,
    },
    {
      id: 'alternate-route',
      from: 'alternate',
      to: 'target',
      mode: 'Rail',
      routeCapacity: 100,
      transitTime: 3,
      costPerShipment: 500,
    },
    { id: 'downstream', from: 'target', to: 'market', mode: 'Truck' },
  ],
});
const disruption = {
  type: 'facility-shutdown',
  facilityId: 'source',
  durationDays: 14,
};
const choice = {
  id: 'reroute',
  routeId: 'blocked',
  alternateRouteId: 'alternate-route',
};
const customScenario = (overrides = {}) => {
  const network = customNetwork();
  const original = runFacilityShutdown(
    network.facilities,
    network.routes,
    disruption,
  );
  const result = applyCustomMitigation(original, choice);
  return createSavedScenario({
    id: 'scenario-1',
    name: 'Supplier outage — reroute',
    createdAt: '2026-09-28T12:00:00.000Z',
    network,
    disruption,
    mitigation: { kind: 'custom', choice },
    result,
    ...overrides,
  });
};

test('valid active scenarios save compact metadata and empty names are rejected', () => {
  const saved = customScenario();
  assert.equal(saved.networkId, 'history-network');
  assert.equal(saved.disruptedFacilityName, 'Source');
  assert.equal(saved.mitigationName, 'Reroute');
  assert.equal(saved.snapshot.kpis.serviceLevel > 0, true);
  assert.equal(saved.snapshot.blockedRoutes, 1);
  assert.ok(saved.networkFingerprint.startsWith('v1-'));
  assert.equal('facilities' in saved, false);
  assert.throws(() => customScenario({ name: '   ' }), /non-empty/);
});

test('scenario history serializes under its own storage key and sorts newest first', () => {
  assert.equal(SCENARIO_STORAGE_KEY, 'twinchain-scenarios-v1');
  const older = customScenario();
  const newer = customScenario({
    id: 'scenario-2',
    name: 'Peak season stress test',
    createdAt: '2026-09-28T13:00:00.000Z',
  });
  const saved = addSavedScenario(
    addSavedScenario(emptyScenarioLibrary, older),
    newer,
  );
  const restored = parseScenarioLibrary(serializeScenarioLibrary(saved));
  assert.deepEqual(
    restored.scenarios.map((item) => item.id),
    ['scenario-2', 'scenario-1'],
  );
  assert.equal(restored.scenarios[0].networkName, 'History Network');
  assert.equal(
    restored.scenarios[0].snapshot.kpis.facilitiesAtRisk,
    newer.snapshot.kpis.facilitiesAtRisk,
  );
});

test('identical repeated saves are rejected before persistence', () => {
  const scenario = customScenario();
  const saved = addSavedScenario(emptyScenarioLibrary, scenario);
  assert.throws(() =>
    addSavedScenario(saved, { ...scenario, id: 'another-id' }),
  );
});

test('reopen restores Custom disruption and mitigation by recomputing without mutation', () => {
  const network = customNetwork();
  const before = JSON.stringify(network);
  const scenario = customScenario({ network });
  const reopened = reproduceSavedScenario(scenario, [network]);
  assert.equal(reopened.ok, true);
  assert.deepEqual(reopened.result.kpis, scenario.snapshot.kpis);
  assert.equal(
    reopened.result.routes.find((route) => route.id === 'alternate-route')
      .alternate,
    true,
  );
  assert.equal(JSON.stringify(network), before);
});

test('Demo scenario reopen restores the selected mitigation strategy', () => {
  const result = getNetworkState(true, 'air-freight');
  const scenario = createSavedScenario({
    id: 'demo-scenario',
    name: 'Shanghai Closure — Air Freight',
    createdAt: '2026-09-28T14:00:00.000Z',
    network: demoNetwork,
    disruption: {
      type: 'facility-shutdown',
      facilityId: shanghaiClosure.disruptedFacilityId,
      durationDays: shanghaiClosure.durationDays,
    },
    mitigation: { kind: 'demo', strategy: 'air-freight' },
    result,
  });
  const reopened = reproduceSavedScenario(scenario, []);
  assert.equal(reopened.ok, true);
  assert.deepEqual(reopened.result.kpis, result.kpis);
  assert.equal(scenario.mitigationName, 'Air Freight Critical Flow');
});

test('deleting a scenario leaves its referenced network unchanged', () => {
  const network = customNetwork();
  const before = structuredClone(network);
  const saved = addSavedScenario(emptyScenarioLibrary, customScenario());
  const next = removeSavedScenario(saved, 'scenario-1');
  assert.deepEqual(next.scenarios, []);
  assert.deepEqual(network, before);
  assert.throws(() => removeSavedScenario(next, 'scenario-1'), /no longer/);
});

test('missing and materially changed networks fail gracefully', () => {
  const scenario = customScenario();
  const missing = reproduceSavedScenario(scenario, []);
  assert.deepEqual(
    { ok: missing.ok, reason: missing.reason },
    { ok: false, reason: 'missing-network' },
  );
  const changed = customNetwork();
  changed.facilities[0].name = 'Renamed Source';
  const mismatch = reproduceSavedScenario(scenario, [changed]);
  assert.deepEqual(
    { ok: mismatch.ok, reason: mismatch.reason },
    { ok: false, reason: 'changed-network' },
  );
});
