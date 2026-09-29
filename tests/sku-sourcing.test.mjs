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
import {
  previewMappedImport,
  readImportSource,
} from '../lib/import/read-files.ts';

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
  id: 'sourcing',
  name: 'Sourcing',
  kind: 'custom',
  facilities: [
    facility('shanghai'),
    facility('mexico'),
    facility('chicago'),
    { ...facility('toronto'), type: 'Distribution center' },
  ],
  routes: [
    { id: 'ocean', from: 'shanghai', to: 'toronto', mode: 'Ocean' },
    { id: 'rail', from: 'mexico', to: 'toronto', mode: 'Rail' },
    { id: 'truck', from: 'chicago', to: 'toronto', mode: 'Truck' },
  ],
  skus: [
    { id: 'A', name: 'Part A' },
    { id: 'B', name: 'Part B' },
    { id: 'C', name: 'Part C' },
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
    {
      facilityId: 'toronto',
      skuId: 'C',
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
      supplyShare: 0.6,
    },
    {
      sourceFacilityId: 'mexico',
      destinationFacilityId: 'toronto',
      skuId: 'A',
      routeId: 'rail',
      supplyShare: 0.4,
    },
    {
      sourceFacilityId: 'chicago',
      destinationFacilityId: 'toronto',
      skuId: 'B',
      routeId: 'truck',
      supplyShare: 1,
    },
  ],
});
const disruption = {
  type: 'facility-shutdown',
  facilityId: 'shanghai',
  durationDays: 14,
};
const simulate = (n) =>
  runFacilityShutdown(
    n.facilities,
    n.routes,
    disruption,
    'custom',
    n.inventoryRecords,
    n.skuSourcing,
  );
const projections = (n) =>
  simulate(n)
    .facilities.find((f) => f.id === 'toronto')
    .skuInventory.map((r) => r.projection);

test('SKU sourcing uses source shares, leaves unrelated SKUs whole, and keeps unsourced fallback', () => {
  const n = network();
  validateNetwork(n);
  const [a, b, c] = projections(n);
  assert.equal(a.supplyAvailability, 0.4);
  assert.equal(a.dailyDepletion, 6);
  assert.equal(a.state, 'stockout');
  assert.deepEqual(a.disruptedSourceIds, ['shanghai']);
  assert.equal(b.supplyAvailability, 1);
  assert.equal(b.dailyDepletion, 0);
  assert.equal(b.state, 'protected');
  assert.equal(c.supplyBasis, 'route-count');
  assert.ok(Math.abs(c.supplyAvailability - 2 / 3) < 1e-10);
  assert.equal(n.inventoryRecords[0].projection, undefined);
});

test('one source loses all supply; omitted multi-source shares split equally', () => {
  const one = network();
  one.skuSourcing.splice(1, 1);
  delete one.skuSourcing[0].supplyShare;
  validateNetwork(one);
  assert.equal(projections(one)[0].supplyAvailability, 0);
  const equal = network();
  delete equal.skuSourcing[0].supplyShare;
  delete equal.skuSourcing[1].supplyShare;
  validateNetwork(equal);
  assert.equal(projections(equal)[0].supplyAvailability, 0.5);
});

test('sourcing rejects invalid SKUs, facilities, routes, duplicate relationships and shares', () => {
  for (const change of [
    (n) => {
      n.skuSourcing[0].skuId = 'missing';
    },
    (n) => {
      n.skuSourcing[0].sourceFacilityId = 'missing';
    },
    (n) => {
      n.skuSourcing[0].destinationFacilityId = 'shanghai';
    },
    (n) => {
      n.skuSourcing[0].routeId = 'missing';
    },
    (n) => {
      n.skuSourcing[0].routeId = 'rail';
    },
    (n) => {
      n.skuSourcing[0].supplyShare = -0.1;
    },
    (n) => {
      n.skuSourcing[0].supplyShare = 0.8;
    },
    (n) => {
      delete n.skuSourcing[0].supplyShare;
    },
    (n) => {
      n.skuSourcing.push({ ...n.skuSourcing[0] });
    },
  ]) {
    const n = network();
    change(n);
    assert.throws(() => validateNetwork(n));
  }
});

test('sourcing survives local storage and backup; legacy records stay unchanged', () => {
  const n = network();
  n.skuSourcing[0].projection = 'never save';
  const serialized = parseNetworks(
    serializeNetworks({ version: 1, networks: [n], activeNetworkId: n.id }),
  ).networks[0];
  assert.equal(serialized.skuSourcing[0].projection, undefined);
  assert.deepEqual(serialized.skuSourcing[0].supplyShare, 0.6);
  assert.deepEqual(
    importNetworkBackup(exportNetwork(n), 'restored').skuSourcing,
    serialized.skuSourcing,
  );
  const old = network();
  delete old.skuSourcing;
  assert.equal(
    parseNetworks(
      serializeNetworks({
        version: 1,
        networks: [old],
        activeNetworkId: old.id,
      }),
    ).networks[0].skuSourcing,
    undefined,
  );
  assert.equal(projections(old)[0].supplyBasis, 'route-count');
});

test('route and facility edits clean stale sourcing references without changing other allocations', () => {
  const n = network();
  const withoutRoute = editNetwork(n, { type: 'delete-route', id: 'ocean' });
  assert.equal(withoutRoute.skuSourcing.length, 1);
  const withoutSource = editNetwork(n, {
    type: 'delete-facility',
    id: 'shanghai',
  });
  assert.equal(withoutSource.skuSourcing.length, 1);
  assert.equal(n.skuSourcing.length, 3);
});

test('scenario fingerprints change with sourcing and reopen recomputes sourced exposure', () => {
  const n = network();
  const result = simulate(n);
  const scenario = createSavedScenario({
    id: 'one',
    name: 'One',
    createdAt: '2026-09-29T00:00:00Z',
    network: n,
    disruption,
    mitigation: { kind: 'custom', choice: { id: 'do-nothing' } },
    result,
  });
  assert.deepEqual(reproduceSavedScenario(scenario, [n]).result, result);
  const changed = structuredClone(n);
  changed.skuSourcing[0].supplyShare = 0.7;
  changed.skuSourcing[1].supplyShare = 0.3;
  assert.notEqual(
    scenarioNetworkFingerprint(changed),
    scenarioNetworkFingerprint(n),
  );
  assert.equal(reproduceSavedScenario(scenario, [changed]).ok, false);
});

const facilities = [
  ['id', 'name', 'type', 'latitude', 'longitude'],
  ['shanghai', 'Shanghai', 'Supplier', 0, 0],
  ['mexico', 'Mexico', 'Supplier', 1, 1],
  ['toronto', 'Toronto', 'Distribution Center', 2, 2],
];
const routes = [
  ['id', 'source', 'destination', 'mode'],
  ['ocean', 'shanghai', 'toronto', 'Ocean'],
  ['rail', 'mexico', 'toronto', 'Rail'],
];
const inventory = [
  ['sku_id', 'sku_name', 'facility_id', 'current_inventory', 'daily_demand'],
  ['A', 'Part A', 'toronto', 20, 10],
];
const sourcing = [
  ['Part Number', 'Supplier', 'Receiving Facility', 'Lane ID', 'Supply %'],
  ['A', 'shanghai', 'toronto', 'ocean', '60%'],
  ['A', 'mexico', 'toronto', 'rail', 40],
];
const mapping = () =>
  applyColumnMapping(
    sourcing,
    'sourcing',
    suggestColumnMapping(sourcing, 'sourcing').fields,
  );

test('mapped sourcing aliases import fractions/percentages into the shared network', () => {
  const mapped = mapping();
  const preview = previewImport(
    facilities,
    routes,
    mapped.issues,
    inventory,
    mapped.table,
  );
  assert.equal(
    preview.issues.filter((issue) => issue.severity === 'error').length,
    0,
  );
  assert.deepEqual(
    preview.skuSourcing.map((source) => source.supplyShare),
    [0.6, 0.4],
  );
  assert.equal(
    createImportedNetwork(preview, 'imported', 'Imported').skuSourcing.length,
    2,
  );
  const manual = {
    ...suggestColumnMapping(sourcing, 'sourcing').fields,
    source_facility_id: 2,
    destination_facility_id: 1,
  };
  assert.equal(
    applyColumnMapping(sourcing, 'sourcing', manual).table[1][1],
    'toronto',
  );
});

test('sourcing import errors retain row and field context and block atomic creation', () => {
  for (const changed of [
    [sourcing[0], ['missing', 'shanghai', 'toronto', 'ocean', 60], sourcing[2]],
    [sourcing[0], ['A', 'missing', 'toronto', 'ocean', 60], sourcing[2]],
    [sourcing[0], ['A', 'shanghai', 'toronto', 'rail', 60], sourcing[2]],
    [sourcing[0], ['A', 'shanghai', 'toronto', 'ocean', 90], sourcing[2]],
    [sourcing[0], sourcing[1], sourcing[1]],
  ]) {
    const mapped = applyColumnMapping(
      changed,
      'sourcing',
      suggestColumnMapping(changed, 'sourcing').fields,
    );
    const preview = previewImport(
      facilities,
      routes,
      mapped.issues,
      inventory,
      mapped.table,
    );
    assert.ok(
      preview.issues.some(
        (issue) =>
          issue.severity === 'error' &&
          issue.table === 'SKU Sourcing' &&
          issue.row,
      ),
    );
    assert.throws(() => createImportedNetwork(preview, 'bad', 'Bad'));
  }
});

test('optional workbook sheet and fourth CSV use the same sourcing mapper', async () => {
  const source = {
    sheets: [
      { name: 'Facilities', data: facilities },
      { name: 'Routes', data: routes },
      { name: 'Inventory', data: inventory },
      { name: 'SKU Sourcing', data: sourcing },
    ],
    issues: [],
    standardSheets: true,
  };
  const mappings = source.sheets.map((sheet, index) =>
    suggestColumnMapping(
      sheet.data,
      ['facilities', 'routes', 'inventory', 'sourcing'][index],
    ),
  );
  const preview = previewMappedImport(
    source,
    'Facilities',
    'Routes',
    mappings[0],
    mappings[1],
    'Inventory',
    mappings[2],
    'SKU Sourcing',
    mappings[3],
  );
  assert.equal(preview.skuSourcing.length, 2);
  const csv = source.sheets.map(
    (sheet) =>
      new File(
        [sheet.data.map((row) => row.join(',')).join('\n')],
        `${sheet.name}.csv`,
        { type: 'text/csv' },
      ),
  );
  const uploaded = await readImportSource('csv', csv);
  const csvPreview = previewMappedImport(
    uploaded,
    'Facilities',
    'Routes',
    mappings[0],
    mappings[1],
    'Inventory',
    mappings[2],
    'SKU Sourcing',
    mappings[3],
  );
  assert.equal(csvPreview.skuSourcing.length, 2);
  assert.equal(
    csvPreview.issues.filter((issue) => issue.severity === 'error').length,
    0,
  );
});
