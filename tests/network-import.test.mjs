import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import readWorkbook from 'read-excel-file/node';
import {
  previewImport,
  parseCsv,
  workbookTables,
  createImportedNetwork,
  importName,
  IMPORT_LIMITS,
} from '../lib/import/network-import.ts';
import {
  validateNetwork,
  serializeNetworks,
  parseNetworks,
  addCustomNetwork,
  emptySavedNetworks,
  demoNetwork,
  editNetwork,
} from '../lib/networks.ts';
import { runFacilityShutdown } from '../lib/simulation/facility-shutdown.ts';

const fh = [
  'id',
  'name',
  'type',
  'latitude',
  'longitude',
  'city',
  'region',
  'country',
];
const rh = ['id', 'source', 'destination', 'mode'];
const fs = [
  fh,
  ['a', 'Source', 'Supplier', 22.5, 114, 'Shenzhen', 'East Asia', 'China'],
  ['b', 'Plant', 'Factory', 25, -100],
  ['c', 'Market', 'Customer Market', 32, -96],
];
const rs = [rh, ['r1', 'a', 'b', 'Ocean'], ['r2', 'b', 'c', 'Truck']];
const errors = (p) => p.issues.filter((i) => i.severity === 'error');
const withFacility = (index, value) => {
  const f = structuredClone(fs);
  f[1][index] = value;
  return previewImport(f, rs);
};
const withRoute = (index, value) => {
  const r = structuredClone(rs);
  r[1][index] = value;
  return previewImport(fs, r);
};

test('valid rows create the shared network with counts, coordinates, direction and modes intact', () => {
  const p = previewImport(fs, rs);
  assert.equal(errors(p).length, 0);
  const n = createImportedNetwork(p, 'imported', 'Example');
  validateNetwork(n);
  assert.equal(n.kind, 'custom');
  assert.equal(n.facilities.length, 3);
  assert.equal(n.routes.length, 2);
  assert.equal(n.facilities[0].latitude, 22.5);
  assert.equal(n.facilities[0].country, 'China');
  assert.deepEqual(n.routes[0], {
    id: 'r1',
    from: 'a',
    to: 'b',
    mode: 'Ocean',
  });
});
test('duplicate facility IDs and blank IDs or names block creation with row information', () => {
  for (const [column, value] of [
    [0, 'b'],
    [0, ''],
    [1, ''],
  ]) {
    const p = withFacility(column, value);
    assert.ok(errors(p).some((i) => i.row === 2));
    assert.throws(() => createImportedNetwork(p, 'id', 'Name'));
  }
});
test('missing headers and duplicate logical headers are errors', () => {
  const p = previewImport(
    [
      ['id', 'name', 'type', 'lat', 'latitude'],
      ['a', 'A', 'Supplier', 0, 0],
    ],
    rs,
  );
  assert.ok(errors(p).some((i) => i.field === 'longitude'));
  assert.ok(errors(p).some((i) => i.message.includes('Duplicate column')));
});
test('unsupported facility types including prototype property names are rejected', () => {
  for (const value of ['Warehouse', 'constructor', '', false])
    assert.ok(errors(withFacility(2, value)).some((i) => i.field === 'type'));
});
test('latitude requires a finite decimal in range, never empty, boolean or date', () => {
  for (const value of [
    'Detroit',
    '',
    91,
    -91,
    NaN,
    Infinity,
    true,
    new Date(),
    '0x10',
  ])
    assert.ok(
      errors(withFacility(3, value)).some((i) => i.field === 'latitude'),
    );
});
test('longitude range and missing values are checked, coordinate boundaries accepted', () => {
  for (const value of ['', 181, -181, 'west'])
    assert.ok(
      errors(withFacility(4, value)).some((i) => i.field === 'longitude'),
    );
  assert.equal(errors(withFacility(4, -180)).length, 0);
  assert.equal(errors(withFacility(3, 90)).length, 0);
});
test('whitespace, case, DC alias and explicit header aliases normalize safely', () => {
  const p = previewImport(
    [
      [' ID ', 'NAME', 'Type', 'lat', 'lng'],
      [' a ', ' A ', ' dC ', ' 1.5 ', ' -2 '],
      ['b', 'B', 'PORT', 0, 0],
    ],
    [
      ['ID', 'from', 'to', 'mode'],
      [' R ', ' a ', ' b ', ' rail '],
    ],
  );
  assert.equal(errors(p).length, 0);
  assert.equal(p.facilities[0].type, 'Distribution center');
  assert.equal(p.facilities[0].id, 'a');
  assert.equal(p.routes[0].mode, 'Rail');
});
test('all existing transportation modes remain supported', () => {
  for (const mode of ['Ocean', 'Truck', 'Rail', 'Air', 'Road', 'Feeder'])
    assert.equal(withRoute(3, mode.toUpperCase()).routes[0].mode, mode);
});
test('missing route fields, duplicate IDs and missing facility references fail', () => {
  for (const [column, value] of [
    [0, 'r2'],
    [0, ''],
    [1, ''],
    [2, ''],
    [1, 'missing'],
    [2, 'A'],
  ])
    assert.ok(errors(withRoute(column, value)).length);
});
test('self routes, unsupported modes and duplicate directed mode connections fail', () => {
  assert.ok(errors(withRoute(2, 'a')).length);
  assert.ok(errors(withRoute(3, 'Spaceship')).length);
  assert.ok(
    errors(previewImport(fs, [...rs, ['r3', 'a', 'b', 'Ocean']])).some(
      (i) => i.field === 'source/destination/mode',
    ),
  );
  assert.equal(
    errors(previewImport(fs, [...rs, ['r3', 'b', 'a', 'Ocean']])).length,
    0,
  );
});
test('CSV supports BOM, quoted commas, escaped quotes, newlines, and text IDs', () => {
  const f = parseCsv(
    '\uFEFFid,name,type,latitude,longitude\r\n001,"A, ""quoted""\nname",Supplier,0,0\r\n002,B,Port,1,1\r\n',
    'Facilities',
  );
  const r = parseCsv('id,source,destination,mode\n01,001,002,Ocean', 'Routes');
  const p = previewImport(f.rows, r.rows, [...f.issues, ...r.issues]);
  assert.equal(errors(p).length, 0);
  assert.equal(p.facilities[0].id, '001');
  assert.equal(p.facilities[0].name, 'A, "quoted"\nname');
});
test('malformed CSV cannot be imported and extra row cells are flagged', () => {
  assert.ok(parseCsv('id,name\na,"unterminated', 'Facilities').issues.length);
  assert.ok(
    errors(
      previewImport([...fs, ['d', 'D', 'Port', 0, 0, '', '', '', 'extra']], rs),
    ).some((i) => i.field === 'columns'),
  );
});
test('blank rows are ignored while subsequent error rows retain their number', () => {
  const p = previewImport([fh, [], ['a', 'A', 'Supplier', 'bad', 0]], [rh]);
  assert.equal(p.facilityRows, 1);
  assert.ok(errors(p).some((i) => i.row === 3 && i.field === 'latitude'));
});
test('isolated and disconnected networks warn but remain importable', () => {
  const p = previewImport([...fs, ['d', 'Isolated', 'Port', 0, 0]], rs);
  assert.equal(errors(p).length, 0);
  assert.equal(p.issues.length, 2);
  assert.doesNotThrow(() => createImportedNetwork(p, 'id', 'Name'));
  assert.equal(errors(previewImport([fh, fs[1]], [rh])).length, 0);
});
test('empty facilities and excess row counts block import', () => {
  assert.ok(errors(previewImport([fh], [rh])).length);
  const f = [
    fh,
    ...Array.from({ length: IMPORT_LIMITS.facilities + 1 }, (_, i) => [
      'n' + i,
      'N',
      'Port',
      0,
      0,
    ]),
  ];
  assert.ok(errors(previewImport(f, [rh])).some((i) => i.field === 'rows'));
});
test('workbook worksheet names match case-insensitively and missing/ambiguous sheets fail', () => {
  const p = workbookTables([
    { sheet: ' facilities ', data: fs },
    { sheet: 'ROUTES', data: rs },
    { sheet: 'Notes', data: [] },
  ]);
  assert.equal(p.issues.length, 0);
  assert.ok(workbookTables([{ sheet: 'Facilities', data: fs }]).issues.length);
  assert.ok(
    workbookTables([
      { sheet: 'Facilities', data: fs },
      { sheet: 'FACILITIES', data: fs },
      { sheet: 'Routes', data: rs },
    ]).issues.length,
  );
});
test('invalid imports and duplicate network IDs leave existing state unchanged', () => {
  const n = createImportedNetwork(
    previewImport(fs, rs),
    'existing',
    'Existing',
  );
  const state = addCustomNetwork(emptySavedNetworks, n);
  const before = JSON.stringify(state);
  assert.throws(() =>
    addCustomNetwork(
      state,
      createImportedNetwork(withFacility(3, 'bad'), 'new', 'Bad'),
    ),
  );
  assert.throws(() => addCustomNetwork(state, n));
  assert.equal(JSON.stringify(state), before);
  assert.throws(() =>
    createImportedNetwork(previewImport(fs, rs), 'demo', 'Overwrite'),
  );
  assert.equal(demoNetwork.facilities.length, 14);
  assert.equal(demoNetwork.routes.length, 13);
});
test('imported networks use existing persistence and remain editable', () => {
  const n = createImportedNetwork(previewImport(fs, rs), 'imported', 'Example');
  const loaded = parseNetworks(
    serializeNetworks(addCustomNetwork(emptySavedNetworks, n)),
  ).networks[0];
  assert.deepEqual(loaded, n);
  assert.equal(
    editNetwork(loaded, {
      type: 'edit-facility',
      id: 'a',
      changes: { name: 'Edited' },
    }).facilities[0].country,
    'China',
  );
});
test('imported network runs the existing generalized shutdown engine', () => {
  const n = createImportedNetwork(previewImport(fs, rs), 'id', 'Name');
  const r = runFacilityShutdown(n.facilities, n.routes, {
    type: 'facility-shutdown',
    facilityId: 'a',
    durationDays: 14,
  });
  assert.deepEqual(r.atRiskFacilityIds, ['b', 'c']);
  assert.equal(r.facilities[2].impact.additionalDelayDays, 9);
});
test('600 facilities and 1794 routes validate without demo-size assumptions', () => {
  const f = [
    fh,
    ...Array.from({ length: 600 }, (_, i) => [
      'n' + i,
      'Facility ' + i,
      'Port',
      0,
      0,
    ]),
  ];
  const r = [rh];
  for (let i = 0; i < 600; i++)
    for (let j = 1; j <= 3 && i + j < 600; j++)
      r.push([`${i}-${j}`, 'n' + i, 'n' + (i + j), 'Truck']);
  const p = previewImport(f, r);
  assert.equal(errors(p).length, 0);
  assert.equal(p.facilityRows, 600);
  assert.equal(p.routeRows, 1794);
  validateNetwork(createImportedNetwork(p, 'large', 'Larger network'));
});
test('default names derive from filenames and cap shared-model text lengths', () => {
  assert.equal(
    importName('north-america_network.xlsx'),
    'North America Network',
  );
  assert.equal(importName('a'.repeat(200) + '.csv').length, 160);
  assert.ok(errors(withFacility(1, 'a'.repeat(161))).length);
});
test('downloadable CSV templates create a valid simulatable network', async () => {
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
  assert.equal(errors(previewImport(f.rows, r.rows)).length, 0);
});
test('actual xlsx reads cached formula values without calculating and rejects unresolved required values', async () => {
  const valid = workbookTables(
    await readWorkbook(
      await readFile(new URL('./fixtures/import-valid.xlsx', import.meta.url)),
    ),
  );
  const p = previewImport(valid.facilities, valid.routes, valid.issues);
  assert.equal(errors(p).length, 0);
  assert.equal(p.facilities[0].latitude, 22.5);
  const unresolved = workbookTables(
    await readWorkbook(
      await readFile(
        new URL('./fixtures/import-unresolved.xlsx', import.meta.url),
      ),
    ),
  );
  assert.ok(
    errors(previewImport(unresolved.facilities, unresolved.routes)).some(
      (i) => i.field === 'latitude',
    ),
  );
});
