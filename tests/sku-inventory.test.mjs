import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNetwork,
  parseNetworks,
  serializeNetworks,
  editNetwork,
} from '../lib/networks.ts';
import { exportNetwork, importNetworkBackup } from '../lib/network-backup.ts';
import { runFacilityShutdown } from '../lib/simulation/facility-shutdown.ts';
import { applyCustomMitigation } from '../lib/simulation/custom-mitigation.ts';
import {
  scenarioNetworkFingerprint,
  createSavedScenario,
  reproduceSavedScenario,
} from '../lib/scenarios.ts';
import {
  suggestColumnMapping,
  applyColumnMapping,
} from '../lib/import/import-mapping.ts';
import {
  previewImport,
  createImportedNetwork,
} from '../lib/import/network-import.ts';
const facility = (id) => ({
  id,
  name: id,
  type: 'Factory',
  city: '',
  region: '',
  latitude: 0,
  longitude: 0,
  status: 'operational',
});
const legacy = {
  id: 'sku-test',
  name: 'SKU test',
  kind: 'custom',
  facilities: [
    facility('a'),
    { ...facility('b'), currentInventory: 10000, dailyDemand: 10 },
  ],
  routes: [{ id: 'r', from: 'a', to: 'b', mode: 'Truck' }],
};
const network = {
  ...legacy,
  skus: [
    { id: 'x', name: 'Part X' },
    { id: 'y', name: 'Part Y' },
    { id: 'z', name: 'Part Z' },
  ],
  inventoryRecords: [
    { facilityId: 'b', skuId: 'x', currentInventory: 20, dailyDemand: 10 },
    { facilityId: 'b', skuId: 'y', currentInventory: 500, dailyDemand: 10 },
    { facilityId: 'b', skuId: 'z', currentInventory: 30 },
  ],
};
const shutdown = {
  type: 'facility-shutdown',
  facilityId: 'a',
  durationDays: 14,
};
const simulate = (n = network) =>
  runFacilityShutdown(
    n.facilities,
    n.routes,
    shutdown,
    'custom',
    n.inventoryRecords,
  );
test('SKU source data survives local persistence and strips derived fields', () => {
  const n = structuredClone(network);
  n.inventoryRecords[0].projection = 'ignore';
  const saved = { version: 1, networks: [n], activeNetworkId: n.id };
  assert.deepEqual(
    parseNetworks(serializeNetworks(saved)).networks[0],
    network,
  );
});
test('SKU backup round trip and legacy backup compatibility', () => {
  assert.deepEqual(importNetworkBackup(exportNetwork(network), 'restored'), {
    ...network,
    id: 'restored',
  });
  assert.deepEqual(importNetworkBackup(exportNetwork(legacy), 'restored'), {
    ...legacy,
    id: 'restored',
  });
});
test('SKU validation rejects invalid identity, references, negative values and duplicates', () => {
  for (const change of [
    (n) => (n.skus[0].id = ''),
    (n) => n.skus.push({ ...n.skus[0] }),
    (n) => (n.inventoryRecords[0].facilityId = 'missing'),
    (n) => (n.inventoryRecords[0].skuId = 'missing'),
    (n) => (n.inventoryRecords[0].dailyDemand = -1),
    (n) => n.inventoryRecords.push({ ...n.inventoryRecords[0] }),
  ]) {
    const n = structuredClone(network);
    change(n);
    assert.throws(() => validateNetwork(n));
  }
});
test('SKU depletion uses per-item demand and ignores aggregate buffer', () => {
  const f = simulate().facilities[1];
  assert.equal(f.skuInventory[0].projection.dailyDepletion, 10);
  assert.equal(f.skuInventory[0].projection.projectedStockoutDay, 2);
  assert.equal(f.skuInventory[0].projection.remainingInventory, 0);
  assert.equal(f.skuInventory[1].projection.state, 'protected');
  assert.equal(f.skuInventory[2].projection.state, 'no-data');
  assert.deepEqual(f.skuRollup, {
    stockouts: 1,
    protected: 1,
    noData: 1,
    earliestStockoutDay: 2,
  });
  assert.equal(f.inventory.state, 'stockout');
  assert.equal(simulate().kpis.facilitiesAtRisk, 1);
});
test('SKU supply loss follows existing partial inbound supply shares', () => {
  const n = structuredClone(network);
  n.facilities.push(facility('c'));
  n.routes.push({ id: 'r2', from: 'c', to: 'b', mode: 'Truck' });
  assert.equal(
    simulate(n).facilities[1].skuInventory[0].projection.projectedStockoutDay,
    4,
  );
});
test('legacy networks keep identical aggregate projections and need no SKU migration', () => {
  const r = simulate(legacy);
  assert.equal(r.facilities[1].inventory.state, 'protected');
  assert.equal(r.facilities[1].skuInventory, undefined);
  assert.equal(
    parseNetworks(
      serializeNetworks({
        version: 1,
        networks: [legacy],
        activeNetworkId: legacy.id,
      }),
    ).networks[0].skus,
    undefined,
  );
});
test('SKU simulation and mitigation are immutable and recompute stockouts', () => {
  const before = JSON.stringify(network),
    original = simulate();
  const result = applyCustomMitigation(original, {
    id: 'air-freight',
    facilityId: 'b',
  });
  assert.ok(
    result.facilities[1].skuInventory[0].projection.projectedStockoutDay > 2,
  );
  assert.equal(JSON.stringify(network), before);
  assert.equal(
    original.facilities[1].skuInventory[0].projection.projectedStockoutDay,
    2,
  );
});
test('facility deletion removes associated SKU inventory records', () => {
  assert.deepEqual(
    editNetwork(network, { type: 'delete-facility', id: 'b' }).inventoryRecords,
    [],
  );
  assert.equal(network.inventoryRecords.length, 3);
});
const table = [
  ['Part Number', 'Product', 'Facility ID', 'Qty OH', 'Average Daily Sales'],
  ['p', 'Product P', 'b', 40, 5],
];
const mapped = () =>
  applyColumnMapping(
    table,
    'inventory',
    suggestColumnMapping(table, 'inventory').fields,
  );
const facilities = [
  ['id', 'name', 'type', 'latitude', 'longitude'],
  ['a', 'A', 'Factory', 0, 0],
  ['b', 'B', 'Factory', 1, 1],
];
const routes = [
  ['id', 'source', 'destination', 'mode'],
  ['r', 'a', 'b', 'Truck'],
];
test('mapped inventory aliases produce shared SKU entities and records', () => {
  const m = mapped(),
    p = previewImport(facilities, routes, m.issues, m.table);
  assert.equal(p.issues.filter((i) => i.severity === 'error').length, 0);
  assert.deepEqual(createImportedNetwork(p, 'new', 'New').inventoryRecords, [
    { facilityId: 'b', skuId: 'p', currentInventory: 40, dailyDemand: 5 },
  ]);
  assert.deepEqual(p.skus, [{ id: 'p', name: 'Product P' }]);
});
test('invalid SKU import references and duplicate facility-SKU rows block creation', () => {
  for (const rows of [
    [...mapped().table, mapped().table[1]],
    [mapped().table[0], ['p', 'P', 'missing', 40, 5]],
  ]) {
    const p = previewImport(facilities, routes, [], rows);
    assert.throws(() => createImportedNetwork(p, 'bad', 'Bad'));
  }
  assert.equal(legacy.facilities.length, 2);
});
test('SKU imports with missing demand warn and preserve missing values', () => {
  const t = mapped().table;
  t[1][4] = undefined;
  const p = previewImport(facilities, routes, [], t);
  assert.ok(
    p.issues.some((i) => i.severity === 'warning' && i.table === 'Inventory'),
  );
  assert.equal(p.inventoryRecords[0].dailyDemand, undefined);
});
test('SKU scenarios reproduce and inventory changes invalidate fingerprints', () => {
  const result = simulate(),
    scenario = createSavedScenario({
      id: 's',
      name: 'S',
      createdAt: '2026-09-29T00:00:00Z',
      network,
      disruption: shutdown,
      mitigation: { kind: 'custom', choice: { id: 'do-nothing' } },
      result,
    });
  const reopened = reproduceSavedScenario(scenario, [network]);
  assert.equal(reopened.ok, true);
  assert.deepEqual(reopened.result, result);
  const changed = structuredClone(network);
  changed.inventoryRecords[0].currentInventory++;
  assert.notEqual(
    scenarioNetworkFingerprint(network),
    scenarioNetworkFingerprint(changed),
  );
  assert.equal(reproduceSavedScenario(scenario, [changed]).ok, false);
});
