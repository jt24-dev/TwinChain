import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runFacilityShutdown,
  customBaselineState,
} from '../lib/simulation/facility-shutdown.ts';
import {
  applyCustomMitigation,
  rerouteOptions,
} from '../lib/simulation/custom-mitigation.ts';

const node = (id, extra = {}) => ({
  id,
  name: id,
  city: id,
  region: 'Test',
  type: 'Factory',
  latitude: 30,
  longitude: 20,
  status: 'operational',
  ...extra,
});
const nodes = [
  node('source'),
  node('alternate'),
  node('target', { currentInventory: 500, dailyDemand: 100 }),
  node('market', { currentInventory: 200, dailyDemand: 10 }),
];
const routes = [
  {
    id: 'blocked',
    from: 'source',
    to: 'target',
    mode: 'Road',
    routeCapacity: 100,
  },
  {
    id: 'alternate',
    from: 'alternate',
    to: 'target',
    mode: 'Road',
    routeCapacity: 100,
    transitTime: 3,
    costPerShipment: 500,
  },
  { id: 'downstream', from: 'target', to: 'market', mode: 'Road' },
];
const shutdown = {
  type: 'facility-shutdown',
  facilityId: 'source',
  durationDays: 14,
};
const original = () => runFacilityShutdown(nodes, routes, shutdown);
const reroute = {
  id: 'reroute',
  routeId: 'blocked',
  alternateRouteId: 'alternate',
};
const expedite = { id: 'air-freight', facilityId: 'target' };
const target = (r) => r.facilities.find((f) => f.id === 'target');

test('partial spare capacity never reduces existing supply or falsely restores a full flow', () => {
  const r = runFacilityShutdown(
    nodes,
    routes.map((r) => ({ ...r, routeCapacity: 60 })),
    shutdown,
  );
  const m = applyCustomMitigation(r, reroute);
  assert.ok(Math.abs(target(m).inventory.supplyAvailability - 0.6) < 1e-10);
  assert.ok(target(m).impact.additionalDelayDays >= 0);
  assert.equal(target(m).status, 'at risk');
});
test('custom Do Nothing returns the original result without transformation', () => {
  const r = original();
  assert.strictEqual(applyCustomMitigation(r, { id: 'do-nothing' }), r);
});
test('reroute requires healthy incoming topology and highlights only that existing route', () => {
  const r = original(),
    m = applyCustomMitigation(r, reroute);
  assert.deepEqual(
    rerouteOptions(r, 'blocked').map((r) => r.id),
    ['alternate'],
  );
  assert.equal(m.routes.length, r.routes.length);
  assert.equal(m.routes.find((r) => r.id === 'alternate').alternate, true);
  assert.equal(m.routes.find((r) => r.id === 'blocked').status, 'blocked');
  assert.equal(target(m).inventory.supplyAvailability, 1);
  assert.equal(target(m).inventory.state, 'protected');
  assert.equal(m.inventorySummary.earliestStockoutDay, undefined);
  assert.ok(m.kpis.logisticsCost > r.kpis.logisticsCost);
  assert.ok(m.kpis.serviceLevel >= r.kpis.serviceLevel);
  assert.ok(m.kpis.leadTime <= r.kpis.leadTime);
});
test('reroute rejects blocked, absent and unrelated alternate connections', () => {
  for (const id of ['blocked', 'missing', 'downstream'])
    assert.throws(
      () =>
        applyCustomMitigation(original(), { ...reroute, alternateRouteId: id }),
      /alternate connection/,
    );
});
test('reroute rejects cycles and unavailable alternate topology', () => {
  const r = runFacilityShutdown(
    nodes,
    [...routes, { id: 'cycle', from: 'target', to: 'alternate', mode: 'Road' }],
    shutdown,
  );
  assert.deepEqual(rerouteOptions(r, 'blocked'), []);
  const none = runFacilityShutdown(
    nodes,
    routes.filter((r) => r.id !== 'alternate'),
    shutdown,
  );
  assert.deepEqual(rerouteOptions(none, 'blocked'), []);
});
test('reroute never double counts existing supply and rejects exhausted capacity', () => {
  const r = runFacilityShutdown(
    nodes,
    routes.map((r) => ({ ...r, routeCapacity: 10 })),
    shutdown,
  );
  assert.throws(() => applyCustomMitigation(r, reroute), /no spare capacity/);
});
test('fallback reroute restores half the selected lost share, without inventing inventory', () => {
  const r = runFacilityShutdown(
    nodes.map(({ currentInventory, dailyDemand, ...f }) => f),
    routes.map(({ routeCapacity, transitTime, costPerShipment, ...r }) => r),
    shutdown,
  );
  const m = applyCustomMitigation(r, reroute);
  assert.equal(target(m).inventory.supplyAvailability, 0.75);
  assert.equal(target(m).inventory.state, 'no-data');
  assert.equal(target(m).inventory.projectedStockoutDay, undefined);
});
test('expedite reduces delay and postpones stockout with an explicit volume premium', () => {
  const r = original(),
    m = applyCustomMitigation(r, expedite);
  assert.ok(
    target(m).impact.additionalDelayDays < target(r).impact.additionalDelayDays,
  );
  assert.ok(
    target(m).inventory.projectedStockoutDay >
      target(r).inventory.projectedStockoutDay,
  );
  assert.equal(target(m).inventory.state, 'protected');
  assert.equal(
    m.kpis.logisticsCost - r.kpis.logisticsCost,
    100 * 0.5 * 0.8 * 14 * 32,
  );
  assert.ok(m.kpis.serviceLevel >= r.kpis.serviceLevel);
  assert.equal(m.kpis.facilitiesAtRisk, 0);
});
test('expedite rejects unaffected facilities, shutdown source and unknown IDs', () => {
  for (const id of ['alternate', 'source', 'unknown'])
    assert.throws(
      () =>
        applyCustomMitigation(original(), {
          id: 'air-freight',
          facilityId: id,
        }),
      /affected downstream/,
    );
});
test('switching always uses the same baseline and compounded mitigation is rejected', () => {
  const r = original(),
    a = applyCustomMitigation(r, expedite);
  applyCustomMitigation(r, reroute);
  assert.deepEqual(applyCustomMitigation(r, expedite), a);
  assert.throws(() => applyCustomMitigation(a, reroute), /original Do Nothing/);
  assert.strictEqual(applyCustomMitigation(r, { id: 'do-nothing' }), r);
});
test('mitigation does not mutate network inputs, baseline results or unselected downstream inventory', () => {
  const r = original(),
    before = JSON.stringify({ nodes, routes, r });
  const m = applyCustomMitigation(r, reroute);
  assert.equal(JSON.stringify({ nodes, routes, r }), before);
  assert.deepEqual(
    m.facilities.find((f) => f.id === 'market').inventory,
    r.facilities.find((f) => f.id === 'market').inventory,
  );
});
test('baseline reset contains no mitigation or inventory projections even with a stale choice', () => {
  const b = customBaselineState(nodes, routes);
  assert.strictEqual(applyCustomMitigation(b, reroute), b);
  assert.ok(
    b.facilities.every((f) => !f.mitigation && !f.inventory && !f.impact),
  );
  assert.ok(b.routes.every((r) => !r.alternate && r.status === 'operational'));
});
