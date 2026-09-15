import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNetwork,
  editNetwork,
  validateNetwork,
  demoNetwork,
  normalNetworkView,
  serializeNetworks,
  parseNetworks,
  emptySavedNetworks,
} from '../lib/networks.ts';
import {
  coordinatesAtPoint,
  projectCoordinates,
  facilityPoint,
} from '../lib/map-projection.ts';
const node = (id, type = 'Supplier') => ({
  id,
  name: id,
  type,
  city: '',
  region: 'Pacific',
  latitude: 31.2,
  longitude: 121.5,
  status: 'operational',
});
const add = (network, id, type) =>
  editNetwork(network, { type: 'add-facility', facility: node(id, type) });
const fixture = () =>
  add(add(add(createNetwork('custom-a'), 'a'), 'b', 'Factory'), 'c', 'Port');
const connect = (network, id, from, to, mode = 'Truck') =>
  editNetwork(network, { type: 'add-route', route: { id, from, to, mode } });

test('blank custom network and facility creation preserve coordinates and unique IDs', () => {
  const blank = createNetwork('custom-a');
  assert.equal(blank.name, 'Untitled Network');
  assert.deepEqual(blank.routes, []);
  const result = add(blank, 'a');
  assert.deepEqual(result.facilities, [node('a')]);
  assert.equal(blank.facilities.length, 0);
  assert.throws(() => add(result, 'a'), /unique/);
});
test('facility edits and repositioning preserve identity, routes and original input', () => {
  const original = connect(fixture(), 'r', 'a', 'b');
  const result = editNetwork(original, {
    type: 'edit-facility',
    id: 'a',
    changes: {
      name: 'Updated supplier',
      type: 'Factory',
      region: 'Canada',
      latitude: 45.5,
      longitude: -73.6,
    },
  });
  assert.equal(result.facilities[0].name, 'Updated supplier');
  assert.equal(result.facilities[0].region, 'Canada');
  assert.equal(result.facilities[0].latitude, 45.5);
  assert.equal(result.facilities[0].longitude, -73.6);
  assert.deepEqual(result.routes, original.routes);
  assert.equal(original.facilities[0].name, 'a');
});
test('deleting a facility cleans up inbound and outbound routes but preserves unrelated routes', () => {
  const original = connect(
    connect(connect(fixture(), 'r1', 'a', 'b'), 'r2', 'b', 'c'),
    'r3',
    'a',
    'c',
  );
  const result = editNetwork(original, { type: 'delete-facility', id: 'b' });
  assert.deepEqual(
    result.facilities.map((f) => f.id),
    ['a', 'c'],
  );
  assert.deepEqual(
    result.routes.map((r) => r.id),
    ['r3'],
  );
  validateNetwork(result);
  assert.equal(original.routes.length, 3);
});
test('route direction and all supported transportation modes are descriptive, preserved data', () => {
  let network = fixture();
  for (const mode of ['Ocean', 'Truck', 'Rail', 'Air', 'Road', 'Feeder'])
    network = connect(network, mode, 'a', 'b', mode);
  assert.ok(network.routes.every((r) => r.from === 'a' && r.to === 'b'));
  assert.deepEqual(
    network.routes.map((r) => r.mode),
    ['Ocean', 'Truck', 'Rail', 'Air', 'Road', 'Feeder'],
  );
  assert.equal(connect(network, 'reverse', 'b', 'a').routes.length, 7);
});
test('self routes, missing references, duplicate IDs and identical routes are rejected', () => {
  const network = connect(fixture(), 'r', 'a', 'b');
  assert.throws(() => connect(network, 'self', 'a', 'a'), /different/);
  assert.throws(() => connect(network, 'missing', 'a', 'missing'), /existing/);
  assert.throws(() => connect(network, 'r', 'b', 'c'), /unique/);
  assert.throws(() => connect(network, 'duplicate', 'a', 'b'), /already exist/);
  assert.throws(
    () => connect(network, 'mode', 'a', 'b', 'Teleport'),
    /supported/,
  );
});
test('route editing and deletion validate endpoints and leave facilities intact', () => {
  const original = connect(fixture(), 'r', 'a', 'b');
  const updated = editNetwork(original, {
    type: 'edit-route',
    id: 'r',
    changes: { mode: 'Rail', to: 'c' },
  });
  assert.deepEqual(updated.routes, [
    { id: 'r', from: 'a', to: 'c', mode: 'Rail' },
  ]);
  assert.throws(
    () =>
      editNetwork(updated, {
        type: 'edit-route',
        id: 'r',
        changes: { from: 'c' },
      }),
    /different/,
  );
  const deleted = editNetwork(updated, { type: 'delete-route', id: 'r' });
  assert.deepEqual(deleted.routes, []);
  assert.equal(deleted.facilities.length, 3);
});
test('invalid names, coordinates, IDs and stale edits fail without mutating a network', () => {
  const network = fixture(),
    before = JSON.stringify(network);
  for (const changes of [
    { name: '' },
    { latitude: NaN },
    { latitude: 91 },
    { longitude: 181 },
    { type: 'Unknown' },
  ])
    assert.throws(() =>
      editNetwork(network, { type: 'edit-facility', id: 'a', changes }),
    );
  assert.throws(() => editNetwork(network, { type: 'rename', name: ' ' }));
  assert.throws(
    () => editNetwork(network, { type: 'delete-facility', id: 'missing' }),
    /no longer/,
  );
  assert.throws(
    () => editNetwork(network, { type: 'delete-route', id: 'missing' }),
    /no longer/,
  );
  assert.equal(JSON.stringify(network), before);
});
test('local persistence round trips names, coordinates, routes and the last opened custom network', () => {
  const network = editNetwork(connect(fixture(), 'r', 'a', 'b', 'Air'), {
    type: 'rename',
    name: 'My supply chain',
  });
  const saved = {
    version: 1,
    networks: [network, createNetwork('second')],
    activeNetworkId: network.id,
  };
  assert.deepEqual(parseNetworks(serializeNetworks(saved)), saved);
  assert.deepEqual(
    parseNetworks(serializeNetworks(emptySavedNetworks)),
    emptySavedNetworks,
  );
});
test('malformed and unsupported storage is rejected, missing selection falls back to demo', () => {
  for (const raw of [
    'bad',
    'null',
    '{}',
    JSON.stringify({ version: 2, networks: [] }),
    JSON.stringify({ version: 1, networks: [demoNetwork] }),
  ])
    assert.throws(() => parseNetworks(raw));
  const n = fixture();
  assert.throws(
    () => parseNetworks(JSON.stringify({ version: 1, networks: [n, n] })),
    /ID/,
  );
  assert.equal(
    parseNetworks(
      JSON.stringify({ version: 1, networks: [n], activeNetworkId: 'missing' }),
    ).activeNetworkId,
    'demo',
  );
});
test('stored simulation and demo-only display metadata cannot enter a custom network', () => {
  const n = fixture();
  n.facilities[0].mitigation = { name: 'fake' };
  n.facilities[0].labelOffset = [999, 999];
  const loaded = parseNetworks(
    JSON.stringify({ version: 1, networks: [n], activeNetworkId: n.id }),
  ).networks[0];
  assert.equal(loaded.facilities[0].mitigation, undefined);
  assert.equal(loaded.facilities[0].labelOffset, undefined);
});
test('Demo Network remains 14 facilities / 13 routes and rejects all builder mutations', () => {
  const before = JSON.stringify(demoNetwork);
  for (const edit of [
    { type: 'rename', name: 'Changed' },
    { type: 'add-facility', facility: node('a') },
    { type: 'delete-facility', id: 'shanghai' },
    {
      type: 'add-route',
      route: { id: 'x', from: 'shanghai', to: 'la', mode: 'Air' },
    },
  ])
    assert.throws(() => editNetwork(demoNetwork, edit), /read-only/);
  assert.throws(() => createNetwork('demo'), /reserved/);
  assert.equal(demoNetwork.facilities.length, 14);
  assert.equal(demoNetwork.routes.length, 13);
  assert.equal(JSON.stringify(demoNetwork), before);
});
test('common renderer view does not inject Shanghai, risk, or KPIs into a custom network', () => {
  const network = fixture(),
    view = normalNetworkView(network);
  assert.equal(view.facilities.length, 3);
  assert.equal(view.active, false);
  assert.equal(view.kpis, undefined);
  assert.ok(
    view.facilities.every(
      (f) => f.impact === null && f.status === 'operational',
    ),
  );
  assert.equal(
    view.facilities.some((f) => f.id === 'shanghai'),
    false,
  );
});
test('map placement correctly reverses zoom and pan, including western longitudes', () => {
  const scale = 2.75,
    translate = { x: -500, y: 80 };
  for (const [latitude, longitude] of [
    [31.2, 121.5],
    [40, -74],
    [-33, 151],
    [50, -10],
  ]) {
    const [x, y] = projectCoordinates(latitude, longitude);
    const actual = coordinatesAtPoint(
      x * scale + translate.x,
      y * scale + translate.y,
      scale,
      translate,
    );
    assert.ok(Math.abs(actual.latitude - latitude) < 1e-9);
    assert.ok(Math.abs(actual.longitude - longitude) < 1e-9);
  }
  assert.equal(coordinatesAtPoint(-1, 50, 1, { x: 0, y: 0 }), null);
  assert.equal(coordinatesAtPoint(1, 1, 0, { x: 0, y: 0 }), null);
});
test('custom facilities never inherit demo offsets, even with a matching ID', () => {
  const f = node('suzhou');
  assert.deepEqual(
    facilityPoint(f),
    projectCoordinates(f.latitude, f.longitude),
  );
  assert.deepEqual(facilityPoint(f, true), facilityPoint(f));
});
