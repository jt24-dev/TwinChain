import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import readWorkbook from 'read-excel-file/node';
import {
  facilityOperationFields,
  routeOperationFields,
  numericOperation,
  inventoryCoverage,
  operationalCompleteness,
} from '../lib/operations.ts';
import {
  demoNetwork,
  editNetwork,
  validateNetwork,
  parseNetworks,
  serializeNetworks,
} from '../lib/networks.ts';
import {
  parseCsv,
  previewImport,
  createImportedNetwork,
  workbookTables,
} from '../lib/import/network-import.ts';
import { runFacilityShutdown } from '../lib/simulation/facility-shutdown.ts';
const base = () => ({
  ...structuredClone(demoNetwork),
  id: 'custom',
  kind: 'custom',
  facilities: structuredClone(demoNetwork.facilities).map(
    ({ currentInventory, dailyDemand, ...f }) => f,
  ),
});
const facility = {
  capacity: 1000,
  currentInventory: 4200,
  dailyDemand: 600,
  utilization: 60,
  replenishmentLeadTime: 7,
  criticality: 'High',
};
const route = {
  transitTime: 12.5,
  costPerShipment: 2400,
  routeCapacity: 800,
  shipmentFrequency: 2,
  reliability: 95,
};
const enriched = () => {
  let n = base();
  n = editNetwork(n, {
    type: 'edit-facility',
    id: n.facilities[0].id,
    changes: facility,
  });
  return editNetwork(n, {
    type: 'edit-route',
    id: n.routes[0].id,
    changes: route,
  });
};
test('facility operational values save through ordinary immutable edits', () => {
  const n = enriched();
  for (const [key, value] of Object.entries(facility))
    assert.equal(n.facilities[0][key], value);
  assert.equal(demoNetwork.facilities[0].capacity, undefined);
});
test('route operational values save through the same shared model', () => {
  for (const [key, value] of Object.entries(route))
    assert.equal(enriched().routes[0][key], value);
});
test('optional numbers accept blanks and zero without treating invalid text as zero', () => {
  for (const f of [...facilityOperationFields, ...routeOperationFields]) {
    assert.equal(numericOperation('', f), undefined);
    assert.equal(numericOperation('  ', f), undefined);
    assert.equal(numericOperation('0', f), 0);
    for (const bad of ['oops', true, NaN, Infinity, -1])
      assert.throws(() => numericOperation(bad, f));
  }
});
test('all negative operational fields and out-of-range percentages fail model validation', () => {
  for (const f of facilityOperationFields)
    assert.throws(() =>
      editNetwork(base(), {
        type: 'edit-facility',
        id: base().facilities[0].id,
        changes: { [f.key]: -1 },
      }),
    );
  for (const f of routeOperationFields)
    assert.throws(() =>
      editNetwork(base(), {
        type: 'edit-route',
        id: base().routes[0].id,
        changes: { [f.key]: -1 },
      }),
    );
  for (const [type, id, changes] of [
    ['edit-facility', base().facilities[0].id, { utilization: 101 }],
    ['edit-route', base().routes[0].id, { reliability: 101 }],
    ['edit-facility', base().facilities[0].id, { criticality: 'Urgent' }],
  ])
    assert.throws(() => editNetwork(base(), { type, id, changes }));
});
test('inventory coverage is display-only and handles zero or missing demand', () => {
  assert.equal(inventoryCoverage(facility), 7);
  assert.equal(inventoryCoverage({ currentInventory: 0, dailyDemand: 1 }), 0);
  for (const f of [
    {},
    { currentInventory: 100 },
    { currentInventory: 100, dailyDemand: 0 },
    { dailyDemand: 10 },
  ])
    assert.equal(inventoryCoverage(f), undefined);
});
test('enriched data survives persistence, including zero, while clearing a field removes it', () => {
  let n = enriched();
  n = editNetwork(n, {
    type: 'edit-facility',
    id: n.facilities[0].id,
    changes: { currentInventory: 0, capacity: undefined },
  });
  const state = { version: 1, networks: [n], activeNetworkId: n.id };
  const loaded = parseNetworks(serializeNetworks(state)).networks[0];
  assert.equal(loaded.facilities[0].currentInventory, 0);
  assert.equal(loaded.facilities[0].capacity, undefined);
  assert.equal(loaded.routes[0].transitTime, 12.5);
});
test('old saved schema loads without migration or invented operational values', () => {
  const n = base();
  const loaded = parseNetworks(
    JSON.stringify({ version: 1, networks: [n], activeNetworkId: n.id }),
  ).networks[0];
  validateNetwork(loaded);
  assert.deepEqual(operationalCompleteness(loaded), {
    facilities: 0,
    routes: 0,
  });
});
test('completeness counts enriched entities once and treats zero as set', () => {
  assert.deepEqual(operationalCompleteness(enriched()), {
    facilities: 1,
    routes: 1,
  });
  assert.deepEqual(
    operationalCompleteness({ facilities: [{ capacity: 0 }], routes: [] }),
    { facilities: 1, routes: 0 },
  );
});
test('enriched CSV templates import optional values and preserve blanks', async () => {
  const f = parseCsv(
    await readFile(
      new URL('../public/templates/facilities.csv', import.meta.url),
      'utf8',
    ),
    'Facilities',
  );
  const r = parseCsv(
    await readFile(
      new URL('../public/templates/routes.csv', import.meta.url),
      'utf8',
    ),
    'Routes',
  );
  const p = previewImport(f.rows, r.rows);
  assert.equal(p.issues.filter((i) => i.severity === 'error').length, 0);
  const n = createImportedNetwork(p, 'csv', 'CSV');
  assert.equal(n.facilities[0].currentInventory, 4200);
  assert.equal(n.facilities[1].capacity, undefined);
  assert.equal(n.routes[0].reliability, 95);
});
test('operational import errors retain exact table, row and column', () => {
  const p = previewImport(
    [
      ['id', 'name', 'type', 'latitude', 'longitude', 'utilization'],
      ['a', 'A', 'Supplier', 0, 0, 125],
      ['b', 'B', 'Port', 1, 1, ''],
    ],
    [
      ['id', 'source', 'destination', 'mode', 'reliability'],
      ['r', 'a', 'b', 'Air', -2],
    ],
  );
  assert.ok(
    p.issues.some(
      (i) =>
        i.table === 'Facilities' && i.row === 2 && i.field === 'utilization',
    ),
  );
  assert.ok(
    p.issues.some(
      (i) => i.table === 'Routes' && i.row === 2 && i.field === 'reliability',
    ),
  );
});
test('enrichment preserves the exact baseline shutdown KPIs and propagation', () => {
  const a = base(),
    b = enriched();
  const input = {
    type: 'facility-shutdown',
    facilityId: 'shanghai',
    durationDays: 14,
  };
  const x = runFacilityShutdown(a.facilities, a.routes, input),
    y = runFacilityShutdown(b.facilities, b.routes, input);
  assert.deepEqual(x.kpis, y.kpis);
  assert.deepEqual(x.atRiskFacilityIds, y.atRiskFacilityIds);
  assert.equal(y.facilities[0].currentInventory, 4200);
});
test('Excel operational columns and old workbooks use the same importer', async () => {
  for (const filename of ['import-enriched.xlsx', 'import-valid.xlsx']) {
    const t = workbookTables(
      await readWorkbook(
        await readFile(new URL('./fixtures/' + filename, import.meta.url)),
      ),
    );
    const p = previewImport(t.facilities, t.routes, t.issues);
    assert.equal(p.issues.filter((i) => i.severity === 'error').length, 0);
    const n = createImportedNetwork(p, 'xlsx', 'XLSX');
    assert.equal(
      n.facilities[0].currentInventory,
      filename === 'import-enriched.xlsx' ? 4200 : undefined,
    );
    if (filename === 'import-enriched.xlsx')
      assert.equal(n.routes[0].transitTime, 12.5);
  }
});
