import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runFacilityShutdown,
  customBaselineState,
  customBaseline,
} from '../lib/simulation/facility-shutdown.ts';
import { facilities, routes } from '../lib/data/network.ts';
import { getNetworkState } from '../lib/data/scenario.ts';
const nodes = ['a', 'b', 'c', 'd', 'e', 'z'].map((id) => ({
  id,
  name: id,
  type: 'Supplier',
  lat: 0,
  lon: 0,
  city: '',
  region: '',
  status: 'operational',
}));
const edge = (from, to) => ({ id: `${from}-${to}`, from, to, mode: 'Truck' });
const chain = [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('d', 'e')];
const run = (id = 'a', days = 14, ns = nodes, rs = chain) =>
  runFacilityShutdown(ns, rs, {
    type: 'facility-shutdown',
    facilityId: id,
    durationDays: days,
  });

test('generic shutdown traverses a chain with graded severity and deterministic delays', () => {
  const r = run();
  assert.deepEqual(
    r.facilities.map((n) => n.impact?.severity ?? 'normal'),
    ['disrupted', 'high', 'medium', 'low', 'low', 'normal'],
  );
  assert.deepEqual(
    r.facilities.map((n) => n.impact?.additionalDelayDays ?? 0),
    [14, 14, 9, 6, 4, 0],
  );
  assert.deepEqual(
    r.facilities.map((n) => n.impact?.hops ?? null),
    [0, 1, 2, 3, 4, null],
  );
  assert.equal(r.facilities[4].impact.sourceName, 'a');
});
test('middle shutdown blocks incident routes without propagating risk upstream', () => {
  const r = run('c');
  assert.deepEqual(r.blockedRouteIds, ['b-c', 'c-d']);
  assert.deepEqual(r.affectedRouteIds, ['d-e']);
  assert.equal(r.routes[0].status, 'operational');
  assert.equal(r.facilities[1].impact, null);
  assert.deepEqual(r.atRiskFacilityIds, ['d', 'e']);
});
test('branching, disconnected and converging paths use shortest distances once', () => {
  const r = run('a', 14, nodes, [
    edge('a', 'b'),
    edge('a', 'c'),
    edge('b', 'd'),
    edge('c', 'd'),
    edge('z', 'e'),
  ]);
  assert.deepEqual(r.atRiskFacilityIds, ['b', 'c', 'd']);
  assert.equal(r.facilities[3].impact.hops, 2);
  assert.equal(r.facilities[4].impact, null);
  assert.equal(r.routes[4].status, 'operational');
});
test('cycles terminate and never rediscover the shutdown source', () => {
  const r = run('a', 14, nodes, [...chain, edge('e', 'a'), edge('d', 'b')]);
  assert.equal(r.facilities.length, nodes.length);
  assert.equal(new Set(r.atRiskFacilityIds).size, 4);
  assert.equal(r.facilities[0].impact.hops, 0);
});
test('terminal shutdown is localized and has limited portfolio KPI impact', () => {
  const terminal = run('e'),
    wide = run('a');
  assert.equal(terminal.atRiskFacilityIds.length, 0);
  assert.equal(terminal.kpis.facilitiesAtRisk, 0);
  assert.ok(terminal.kpis.serviceLevel > wide.kpis.serviceLevel);
  assert.ok(terminal.kpis.leadTime < wide.kpis.leadTime);
  assert.ok(terminal.kpis.logisticsCost < wide.kpis.logisticsCost);
});
test('isolated facility remains eligible and records local shutdown impact', () => {
  const r = run('z', 7, [nodes[5]], []);
  assert.equal(r.facilities[0].status, 'disrupted');
  assert.deepEqual(r.blockedRouteIds, []);
  assert.equal(r.kpis.facilitiesAtRisk, 0);
  assert.equal(r.kpis.leadTime, 19);
  assert.equal(r.kpis.logisticsCost, 53500);
});
test('custom baseline scales with nodes and routes, including an empty network', () => {
  assert.equal(customBaseline(nodes, chain).logisticsCost, 400000);
  assert.deepEqual(customBaselineState([], []).kpis, {
    serviceLevel: 97,
    leadTime: 12,
    logisticsCost: 0,
    facilitiesAtRisk: 0,
  });
});
test('custom KPI deltas follow network impact and normalize service by size', () => {
  const r = run(),
    base = customBaseline(nodes, chain);
  assert.equal(r.kpis.facilitiesAtRisk, r.atRiskFacilityIds.length);
  assert.ok(r.kpis.serviceLevel < base.serviceLevel);
  assert.ok(r.kpis.leadTime > base.leadTime);
  assert.ok(r.kpis.logisticsCost > base.logisticsCost);
  const expanded = run(
    'a',
    14,
    [...nodes, { ...nodes[0], id: 'extra' }],
    chain,
  );
  assert.ok(expanded.kpis.serviceLevel >= r.kpis.serviceLevel);
});
test('longer durations monotonically increase delay and cost and reduce service within bounds', () => {
  let previous = run('a', 1);
  for (const days of [7, 14, 21, 30, 60, 90]) {
    const r = run('a', days);
    assert.ok(
      r.kpis.serviceLevel <= previous.kpis.serviceLevel &&
        r.kpis.serviceLevel >= 50,
    );
    assert.ok(r.kpis.leadTime >= previous.kpis.leadTime);
    assert.ok(r.kpis.logisticsCost >= previous.kpis.logisticsCost);
    assert.ok(
      r.facilities.every((n) => !n.impact || n.impact.additionalDelayDays >= 0),
    );
    previous = r;
  }
});
test('invalid IDs, types and noninteger or out-of-range durations fail safely', () => {
  assert.throws(() => run('missing'), /Unknown/);
  for (const days of [0, -1, 1.5, 91, NaN, Infinity])
    assert.throws(() => run('a', days), /whole number/);
  assert.throws(
    () =>
      runFacilityShutdown(nodes, chain, {
        type: 'fire',
        facilityId: 'a',
        durationDays: 14,
      }),
    /Unsupported/,
  );
});
test('reset clears results without mutating the custom network', () => {
  const before = JSON.stringify({ nodes, chain });
  run();
  const r = customBaselineState(nodes, chain);
  assert.equal(r.active, false);
  assert.ok(
    r.facilities.every((n) => n.status === 'operational' && n.impact === null),
  );
  assert.ok(r.routes.every((n) => n.status === 'operational'));
  assert.deepEqual(r.kpis, customBaseline(nodes, chain));
  assert.equal(JSON.stringify({ nodes, chain }), before);
});
test('Shanghai uses generic shutdown input with inventory-adjusted demo service and risk', () => {
  const r = runFacilityShutdown(
    facilities,
    routes,
    { type: 'facility-shutdown', facilityId: 'shanghai', durationDays: 14 },
    'demo',
  );
  assert.deepEqual(r, getNetworkState(true));
  assert.deepEqual(r.kpis, {
    serviceLevel: 89,
    leadTime: 20,
    logisticsCost: 1480000,
    facilitiesAtRisk: 3,
  });
});
