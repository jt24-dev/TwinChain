import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInventoryImpact,
  calculateSupplyAvailability,
  applyInventoryImpact,
} from '../lib/simulation/inventory.ts';
import {
  runFacilityShutdown,
  customBaselineState,
} from '../lib/simulation/facility-shutdown.ts';
import { simulateDisruption } from '../lib/simulation/propagate-disruption.ts';
import { getNetworkState } from '../lib/data/scenario.ts';
import { parseNetworks, serializeNetworks } from '../lib/networks.ts';
import {
  createImportedNetwork,
  previewImport,
} from '../lib/import/network-import.ts';
const node = (id, extra = {}) => ({
  id,
  name: id,
  type: 'Distribution center',
  city: '',
  region: '',
  latitude: 0,
  longitude: 0,
  status: 'operational',
  ...extra,
});
const edge = (from, to, extra = {}) => ({
  id: `${from}-${to}`,
  from,
  to,
  mode: 'Truck',
  status: 'operational',
  ...extra,
});
const nodes = [
  node('a'),
  node('b', { currentInventory: 600, dailyDemand: 100 }),
  node('c'),
  node('z'),
];
const routes = [edge('a', 'b'), edge('b', 'c')];
const run = (ns = nodes, rs = routes, id = 'a', durationDays = 14) =>
  runFacilityShutdown(ns, rs, {
    type: 'facility-shutdown',
    facilityId: id,
    durationDays,
  });
const project = (inventory, demand, supply = 0, days = 14) =>
  calculateInventoryImpact(
    node('b', { currentInventory: inventory, dailyDemand: demand }),
    days,
    { supplyAvailability: supply, supplyBasis: 'route-count' },
  );
test('full supply loss calculates coverage, depletion, day and nonnegative remainder', () => {
  const p = project(600, 100);
  assert.equal(p.coverageDays, 6);
  assert.equal(p.dailyDepletion, 100);
  assert.equal(p.projectedStockoutDay, 6);
  assert.equal(p.remainingInventory, 0);
  assert.equal(p.stockoutWithinHorizon, true);
  assert.equal(p.state, 'stockout');
});
test('buffer beyond horizon remains protected with starting data retained', () => {
  const p = project(2000, 100);
  assert.equal(p.state, 'protected');
  assert.equal(p.projectedStockoutDay, 20);
  assert.equal(p.remainingInventory, 600);
  assert.equal(p.startingInventory, 2000);
  assert.equal(p.stockoutWithinHorizon, false);
});
test('stockout exactly at horizon is flagged; just beyond is protected', () => {
  assert.equal(project(1400, 100).state, 'stockout');
  assert.equal(project(1400.1, 100).state, 'protected');
  assert.equal(project(0, 100).projectedStockoutDay, 0);
});
test('missing inventory and zero/missing demand safely retain no-data fallback', () => {
  for (const [i, d] of [
    [undefined, 100],
    [100, undefined],
    [100, 0],
    [100, Infinity],
    [-1, 10],
  ]) {
    const p = project(i, d);
    assert.equal(p.state, 'no-data');
    assert.equal(p.dailyDepletion, undefined);
  }
});
test('two inbound routes with one normal retain half supply and double buffer duration', () => {
  const supply = calculateSupplyAvailability([
    edge('a', 'b', { status: 'blocked' }),
    edge('z', 'b'),
  ]);
  assert.equal(supply.supplyAvailability, 0.5);
  assert.equal(supply.supplyBasis, 'route-count');
  const p = calculateInventoryImpact(nodes[1], 14, supply);
  assert.equal(p.dailyDepletion, 50);
  assert.equal(p.projectedStockoutDay, 12);
});
test('fully available supply never depletes, even with zero starting inventory', () => {
  for (const i of [0, 600]) {
    const p = project(i, 100, 1);
    assert.equal(p.dailyDepletion, 0);
    assert.equal(p.remainingInventory, i);
    assert.equal(p.projectedStockoutDay, undefined);
    assert.equal(p.state, 'protected');
  }
});
test('capacity weights supply when all inbound capacities are positive', () => {
  const p = calculateSupplyAvailability([
    edge('a', 'b', { status: 'blocked', routeCapacity: 100 }),
    edge('z', 'b', { routeCapacity: 300 }),
  ]);
  assert.equal(p.supplyAvailability, 0.75);
  assert.equal(p.supplyBasis, 'route-capacity');
  assert.equal(
    calculateInventoryImpact(nodes[1], 14, p).remainingInventory,
    250,
  );
});
test('missing/zero capacity falls back to equal shares for the whole inbound set', () => {
  for (const cap of [undefined, 0]) {
    const p = calculateSupplyAvailability([
      edge('a', 'b', { status: 'affected', routeCapacity: 100 }),
      edge('z', 'b', { routeCapacity: cap }),
    ]);
    assert.equal(p.supplyBasis, 'route-count');
    assert.equal(p.supplyAvailability, 0.5);
  }
});
test('large finite capacities do not overflow the availability ratio', () => {
  const p = calculateSupplyAvailability([
    edge('a', 'b', { routeCapacity: 1e308, status: 'blocked' }),
    edge('z', 'b', { routeCapacity: 1e308 }),
  ]);
  assert.equal(p.supplyAvailability, 0.5);
});
test('partial supply integration preserves graph exposure and slower depletion', () => {
  const r = run(nodes, [...routes, edge('z', 'b')]);
  const b = r.facilities[1];
  assert.equal(b.impact.severity, 'high');
  assert.equal(b.inventory.projectedStockoutDay, 12);
  assert.equal(b.inventory.supplyAvailability, 0.5);
});
test('unaffected and disconnected facilities have no inventory projection', () => {
  const ns = [
    ...nodes,
    node('other', { currentInventory: 0, dailyDemand: 100 }),
  ];
  const r = run(ns, [...routes, edge('z', 'other')]);
  assert.equal(r.facilities.find((f) => f.id === 'other').inventory, undefined);
  assert.equal(r.facilities.find((f) => f.id === 'z').inventory, undefined);
  assert.equal(r.facilities[0].inventory, undefined);
});
test('terminal shutdown leaves all unrelated inventory untouched', () => {
  const r = run(nodes, routes, 'c');
  assert.equal(r.inventorySummary.stockoutFacilityIds.length, 0);
  assert.ok(r.facilities.every((f) => !f.inventory));
  assert.equal(r.facilities[1].currentInventory, 600);
});
test('inventory calculations terminate on directed cycles and are order-independent', () => {
  const rs = [...routes, edge('c', 'b'), edge('c', 'a')];
  const a = run(nodes, rs),
    b = run([...nodes].reverse(), [...rs].reverse());
  assert.equal(a.facilities.length, nodes.length);
  for (const f of a.facilities)
    assert.deepEqual(
      f.inventory,
      b.facilities.find((x) => x.id === f.id).inventory,
    );
  assert.equal(new Set(a.atRiskFacilityIds).size, a.atRiskFacilityIds.length);
});
test('earliest stockout is sorted by calculated day, not hop count or array order', () => {
  const ns = nodes.map((f) =>
    f.id === 'c' ? { ...f, currentInventory: 100, dailyDemand: 100 } : f,
  );
  const r = run(ns);
  assert.equal(r.inventorySummary.earliestStockoutDay, 1);
  assert.deepEqual(r.inventorySummary.stockoutFacilityIds, ['c', 'b']);
});
test('no-data networks retain the exact prior KPI profile', () => {
  const ns = nodes.map(({ currentInventory, dailyDemand, ...n }) => n);
  const r = run(ns);
  assert.equal(r.inventorySummary.noDataFacilityIds.length, 2);
  assert.equal(r.kpis.facilitiesAtRisk, 2);
  const topology = simulateDisruption(ns, routes, 'a', 14);
  assert.deepEqual(
    applyInventoryImpact(topology, 14, 'demo').kpis,
    topology.kpis,
  );
});
test('earlier stockouts penalize service more; protected facilities leave risk count', () => {
  const r = (inventory) =>
    run(
      nodes.map((f) =>
        f.id === 'b' ? { ...f, currentInventory: inventory } : f,
      ),
    );
  const early = r(0),
    late = r(1000),
    protectedResult = r(2000);
  assert.ok(early.kpis.serviceLevel < late.kpis.serviceLevel);
  assert.ok(late.kpis.serviceLevel < protectedResult.kpis.serviceLevel);
  assert.equal(protectedResult.kpis.facilitiesAtRisk, 1); // c still lacks data.
  assert.equal(protectedResult.facilities[1].impact.severity, 'high');
  assert.equal(early.kpis.leadTime, protectedResult.kpis.leadTime);
  assert.equal(early.kpis.logisticsCost, protectedResult.kpis.logisticsCost);
});
test('full protection removes downstream service penalty but preserves custom source penalty', () => {
  const ns = nodes.map((f) => ({
    ...f,
    currentInventory: 2000,
    dailyDemand: 100,
  }));
  const r = run(ns);
  assert.equal(r.kpis.facilitiesAtRisk, 0);
  assert.ok(r.kpis.serviceLevel < 97);
  assert.equal(r.inventorySummary.earliestStockoutDay, undefined);
});
test('criticality is metadata and does not alter physical depletion', () => {
  assert.deepEqual(
    run(nodes.map((f) => ({ ...f, criticality: 'Critical' }))).facilities[1]
      .inventory,
    run().facilities[1].inventory,
  );
});
test('projection cannot mutate frozen source data; reset and persistence retain inventory', () => {
  const ns = nodes.map((f) => Object.freeze({ ...f }));
  Object.freeze(ns);
  const before = JSON.stringify(ns);
  const r = run(ns);
  assert.equal(r.facilities[1].inventory.remainingInventory, 0);
  assert.equal(JSON.stringify(ns), before);
  const n = {
    id: 'test',
    name: 'test',
    kind: 'custom',
    facilities: ns,
    routes,
  };
  const restored = parseNetworks(
    serializeNetworks({ version: 1, networks: [n], activeNetworkId: n.id }),
  ).networks[0];
  assert.equal(restored.facilities[1].currentInventory, 600);
  const reset = customBaselineState(restored.facilities, restored.routes);
  assert.equal(reset.inventorySummary, undefined);
  assert.ok(reset.facilities.every((f) => !f.inventory));
});
test('imported inventory fields automatically enter the same shutdown simulation', () => {
  const preview = previewImport(
    [
      [
        'id',
        'name',
        'type',
        'latitude',
        'longitude',
        'current_inventory',
        'daily_demand',
      ],
      ['a', 'A', 'Supplier', 0, 0, '', ''],
      ['b', 'B', 'DC', 1, 1, 7000, 1000],
    ],
    [
      ['id', 'source', 'destination', 'mode'],
      ['r', 'a', 'b', 'Truck'],
    ],
  );
  const n = createImportedNetwork(preview, 'import', 'Imported');
  const r = run(n.facilities, n.routes);
  assert.equal(r.facilities[1].inventory.projectedStockoutDay, 7);
});
test('demo includes stockout, moderate buffer, protection and missing-data fallback', () => {
  const r = getNetworkState(true);
  assert.equal(
    r.facilities.find((f) => f.id === 'la').inventory.projectedStockoutDay,
    4,
  );
  assert.equal(
    r.facilities.find((f) => f.id === 'ontario').inventory.projectedStockoutDay,
    9,
  );
  assert.equal(
    r.facilities.find((f) => f.id === 'chicago').inventory.state,
    'protected',
  );
  assert.equal(
    r.facilities.find((f) => f.id === 'ny').inventory.state,
    'no-data',
  );
  assert.deepEqual(r.atRiskFacilityIds, ['la', 'ontario', 'ny']);
});
test('mitigation recomputes projections and repeated switching/reset never stacks', () => {
  const normal = JSON.stringify(getNetworkState(false));
  for (let k = 0; k < 3; k++) {
    const reroute = getNetworkState(true, 'reroute'),
      air = getNetworkState(true, 'air-freight');
    assert.equal(
      reroute.facilities.find((f) => f.id === 'la').inventory
        .projectedStockoutDay,
      8,
    );
    assert.equal(
      air.facilities.find((f) => f.id === 'ontario').inventory.state,
      'protected',
    );
    assert.ok(air.kpis.serviceLevel > reroute.kpis.serviceLevel);
    assert.ok(getNetworkState(false).facilities.every((f) => !f.inventory));
    assert.equal(JSON.stringify(getNetworkState(false)), normal);
  }
});
test('invalid horizon and supply fractions are rejected', () => {
  for (const n of [-1, Infinity, NaN])
    assert.throws(() => project(100, 10, 0, n));
  for (const n of [-0.1, 1.1, NaN]) assert.throws(() => project(100, 10, n));
});
