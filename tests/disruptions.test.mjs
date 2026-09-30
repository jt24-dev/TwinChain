import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDisruption,
  runDisruption,
} from '../lib/simulation/disruption.ts';
import { runFacilityShutdown } from '../lib/simulation/facility-shutdown.ts';
import {
  createSavedScenario,
  parseScenarioLibrary,
  reproduceSavedScenario,
} from '../lib/scenarios.ts';
import { applyCustomMitigation } from '../lib/simulation/custom-mitigation.ts';

const facility = (id) => ({
  id,
  name: id,
  type: 'Supplier',
  city: '',
  region: '',
  latitude: 0,
  longitude: 0,
  status: 'operational',
});
const network = () => ({
  id: 'disruptions',
  name: 'Disruptions',
  kind: 'custom',
  facilities: [
    facility('shanghai'),
    facility('mexico'),
    {
      ...facility('toronto'),
      type: 'Distribution center',
      currentInventory: 20,
      dailyDemand: 10,
    },
  ],
  routes: [
    { id: 'ocean', from: 'shanghai', to: 'toronto', mode: 'Ocean' },
    { id: 'rail', from: 'mexico', to: 'toronto', mode: 'Rail' },
  ],
  skus: [
    { id: 'A', name: 'A' },
    { id: 'B', name: 'B' },
  ],
  inventoryRecords: [
    {
      facilityId: 'toronto',
      skuId: 'A',
      currentInventory: 20,
      dailyDemand: 10,
    },
    {
      facilityId: 'toronto',
      skuId: 'B',
      currentInventory: 20,
      dailyDemand: 10,
    },
  ],
  skuSourcing: [
    {
      sourceFacilityId: 'shanghai',
      destinationFacilityId: 'toronto',
      skuId: 'A',
      routeId: 'ocean',
      supplyShare: 1,
    },
    {
      sourceFacilityId: 'mexico',
      destinationFacilityId: 'toronto',
      skuId: 'B',
      routeId: 'rail',
      supplyShare: 1,
    },
  ],
});
const run = (n, input) =>
  runDisruption(
    n.facilities,
    n.routes,
    input,
    'custom',
    n.inventoryRecords,
    n.skuSourcing,
  );
const sku = (result, id) =>
  result.facilities
    .find((f) => f.id === 'toronto')
    .skuInventory.find((r) => r.skuId === id).projection;

for (const input of [
  { type: 'facility-shutdown', facilityId: 'shanghai', durationDays: 14 },
  { type: 'shipment-delay', facilityId: 'shanghai', durationDays: 7 },
  { type: 'route-closure', routeId: 'ocean', durationDays: 14 },
  {
    type: 'capacity-reduction',
    facilityId: 'shanghai',
    durationDays: 14,
    remainingCapacityPercent: 40,
  },
])
  test(`${input.type} parses, serializes, saves, and reopens deterministically`, () => {
    const n = network();
    const parsed = parseDisruption(JSON.parse(JSON.stringify(input)));
    assert.deepEqual(parsed, input);
    const result = run(n, parsed);
    const saved = createSavedScenario({
      id: input.type,
      name: input.type,
      createdAt: '2026-09-30T00:00:00.000Z',
      network: n,
      disruption: parsed,
      mitigation: { kind: 'custom', choice: { id: 'do-nothing' } },
      result,
    });
    const library = parseScenarioLibrary(
      JSON.stringify({ version: 1, scenarios: [saved] }),
    );
    const reopened = reproduceSavedScenario(library.scenarios[0], [n]);
    assert.equal(reopened.ok, true);
    assert.deepEqual(reopened.result.kpis, result.kpis);
    assert.deepEqual(n.facilities[0], facility('shanghai'));
  });

test('old saved shutdown without explicit type defaults to Facility Shutdown', () => {
  const n = network();
  const result = run(n, {
    type: 'facility-shutdown',
    facilityId: 'shanghai',
    durationDays: 14,
  });
  const saved = createSavedScenario({
    id: 'old',
    name: 'Old',
    createdAt: '2026-09-30T00:00:00.000Z',
    network: n,
    disruption: {
      type: 'facility-shutdown',
      facilityId: 'shanghai',
      durationDays: 14,
    },
    mitigation: { kind: 'custom', choice: { id: 'do-nothing' } },
    result,
  });
  delete saved.disruption.type;
  assert.equal(
    parseScenarioLibrary(JSON.stringify({ version: 1, scenarios: [saved] }))
      .scenarios[0].disruption.type,
    'facility-shutdown',
  );
});

test('shutdown path and baseline reset remain unchanged', () => {
  const n = network(),
    input = {
      type: 'facility-shutdown',
      facilityId: 'shanghai',
      durationDays: 14,
    };
  const old = runFacilityShutdown(
    n.facilities,
    n.routes,
    input,
    'custom',
    n.inventoryRecords,
    n.skuSourcing,
  );
  const current = run(n, input);
  assert.deepEqual(current.kpis, old.kpis);
  assert.deepEqual(current.blockedRouteIds, old.blockedRouteIds);
  assert.equal(current.routes.filter((r) => r.status === 'blocked').length, 1);
});

test('shipment delay temporarily interrupts SKU A, resumes flow after Day 7, and increases lead time', () => {
  const n = network();
  const delayed = run(n, {
    type: 'shipment-delay',
    facilityId: 'shanghai',
    durationDays: 7,
  });
  const shutdown = run(n, {
    type: 'facility-shutdown',
    facilityId: 'shanghai',
    durationDays: 7,
  });
  assert.equal(delayed.blockedRouteIds.length, 0);
  assert.equal(delayed.routes.find((r) => r.id === 'ocean').status, 'affected');
  assert.equal(sku(delayed, 'A').state, 'stockout');
  assert.equal(sku(delayed, 'A').replenishmentDay, 7);
  assert.equal(sku(delayed, 'A').postWindowSupplyAvailability, 1);
  assert.equal(sku(delayed, 'B').supplyAvailability, 1);
  assert.ok(delayed.kpis.leadTime > 12);
  assert.notDeepEqual(delayed.kpis, shutdown.kpis);
});

test('route closure blocks only selected route and SKU while alternate flow remains healthy', () => {
  const result = run(network(), {
    type: 'route-closure',
    routeId: 'ocean',
    durationDays: 14,
  });
  assert.deepEqual(result.blockedRouteIds, ['ocean']);
  assert.equal(
    result.routes.find((r) => r.id === 'rail').status,
    'operational',
  );
  assert.equal(sku(result, 'A').supplyAvailability, 0);
  assert.equal(sku(result, 'B').supplyAvailability, 1);
});

test('capacity reduction scales only the targeted SKU source contribution', () => {
  const n = network();
  const half = run(n, {
    type: 'capacity-reduction',
    facilityId: 'shanghai',
    durationDays: 14,
    remainingCapacityPercent: 50,
  });
  const zero = run(n, {
    type: 'capacity-reduction',
    facilityId: 'shanghai',
    durationDays: 14,
    remainingCapacityPercent: 0,
  });
  const full = run(n, {
    type: 'capacity-reduction',
    facilityId: 'shanghai',
    durationDays: 14,
    remainingCapacityPercent: 100,
  });
  assert.equal(sku(half, 'A').supplyAvailability, 0.5);
  assert.equal(sku(half, 'B').supplyAvailability, 1);
  assert.equal(sku(zero, 'A').supplyAvailability, 0);
  assert.equal(full.active, true);
  assert.equal(full.atRiskFacilityIds.length, 0);
  assert.equal(full.kpis.leadTime, 12);
  assert.ok(half.kpis.logisticsCost < zero.kpis.logisticsCost);
});

test('a 70% sourcing share at 50% capacity leaves 65% total SKU supply', () => {
  const n = network();
  n.skuSourcing = [
    {
      sourceFacilityId: 'shanghai',
      destinationFacilityId: 'toronto',
      skuId: 'A',
      routeId: 'ocean',
      supplyShare: 0.7,
    },
    {
      sourceFacilityId: 'mexico',
      destinationFacilityId: 'toronto',
      skuId: 'A',
      routeId: 'rail',
      supplyShare: 0.3,
    },
  ];
  const result = run(n, {
    type: 'capacity-reduction',
    facilityId: 'shanghai',
    durationDays: 14,
    remainingCapacityPercent: 50,
  });
  assert.ok(Math.abs(sku(result, 'A').supplyAvailability - 0.65) < 1e-10);
});

test('invalid disruption targets, duration, and capacity are rejected', () => {
  const n = network();
  for (const input of [
    { type: 'shipment-delay', facilityId: 'shanghai', durationDays: 0 },
    {
      type: 'capacity-reduction',
      facilityId: 'shanghai',
      durationDays: 14,
      remainingCapacityPercent: 101,
    },
    { type: 'route-closure', routeId: 'missing', durationDays: 14 },
    { type: 'shipment-delay', facilityId: 'missing', durationDays: 14 },
  ])
    assert.throws(() => run(n, input));
});

test('mitigation permits valid route reroute and delay expedite, rejects unsupported combinations', () => {
  const n = network();
  const closed = run(n, {
    type: 'route-closure',
    routeId: 'ocean',
    durationDays: 14,
  });
  assert.throws(() =>
    applyCustomMitigation(closed, { id: 'air-freight', facilityId: 'toronto' }),
  );
  const rerouted = applyCustomMitigation(closed, {
    id: 'reroute',
    routeId: 'ocean',
    alternateRouteId: 'rail',
  });
  assert.ok(
    sku(rerouted, 'A').supplyAvailability > sku(closed, 'A').supplyAvailability,
  );
  assert.equal(sku(rerouted, 'B').supplyAvailability, 1);
  const delayed = run(n, {
    type: 'shipment-delay',
    facilityId: 'shanghai',
    durationDays: 7,
  });
  assert.throws(() =>
    applyCustomMitigation(delayed, {
      id: 'reroute',
      routeId: 'ocean',
      alternateRouteId: 'rail',
    }),
  );
  assert.ok(
    applyCustomMitigation(delayed, { id: 'air-freight', facilityId: 'toronto' })
      .kpis.logisticsCost > delayed.kpis.logisticsCost,
  );
  const reduced = run(n, {
    type: 'capacity-reduction',
    facilityId: 'shanghai',
    durationDays: 7,
    remainingCapacityPercent: 50,
  });
  assert.throws(() =>
    applyCustomMitigation(reduced, {
      id: 'air-freight',
      facilityId: 'toronto',
    }),
  );
});
