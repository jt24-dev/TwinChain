import test from 'node:test';
import assert from 'node:assert/strict';
import {
  exportNetwork,
  importNetworkBackup,
  recoverSavedNetworks,
  deleteCustomNetwork,
} from '../lib/network-backup.ts';
import {
  createNetwork,
  demoNetwork,
  emptySavedNetworks,
} from '../lib/networks.ts';
const network = () => ({
  ...structuredClone(demoNetwork),
  id: 'custom',
  kind: 'custom',
  name: 'Backup test',
});
test('JSON backup preserves source topology and all operational fields', () => {
  const n = network();
  n.routes[0].routeCapacity = 100;
  const restored = importNetworkBackup(exportNetwork(n), 'new-id');
  assert.equal(restored.id, 'new-id');
  assert.equal(restored.name, n.name);
  assert.equal(
    restored.facilities.find((f) => f.id === 'la').currentInventory,
    4000,
  );
  assert.equal(restored.routes[0].routeCapacity, 100);
  assert.equal(restored.facilities.length, 14);
  assert.equal(restored.routes.length, 13);
});
test('backup strips simulation, camera, selected state and unknown metadata', () => {
  const n = network();
  n.camera = { zoom: 3 };
  n.selectedId = 'la';
  n.inventorySummary = {};
  n.facilities[0].inventory = { remainingInventory: 0 };
  n.facilities[0].impact = { hops: 2 };
  n.routes[0].alternate = true;
  const data = JSON.parse(exportNetwork(n));
  assert.equal(data.network.camera, undefined);
  assert.equal(data.network.selectedId, undefined);
  assert.equal(data.network.inventorySummary, undefined);
  assert.equal(data.network.facilities[0].inventory, undefined);
  assert.equal(data.network.facilities[0].impact, undefined);
  assert.equal(data.network.routes[0].alternate, undefined);
});
test('backup supports blank custom networks without simulation state', () => {
  const n = importNetworkBackup(
    exportNetwork(createNetwork('empty')),
    'restored',
  );
  assert.deepEqual(n.facilities, []);
  assert.deepEqual(n.routes, []);
});
test('invalid backup formats fail with actionable error and cannot become demo', () => {
  for (const raw of [
    'bad',
    'null',
    '{}',
    JSON.stringify({
      format: 'supply-chain-network',
      version: 2,
      network: network(),
    }),
  ])
    assert.throws(() => importNetworkBackup(raw, 'x'), /valid simulator JSON/);
  assert.throws(() => importNetworkBackup(exportNetwork(network()), 'demo'));
  assert.throws(() => exportNetwork(demoNetwork));
});
test('invalid backup coordinates and references are rejected', () => {
  for (const change of [
    (n) => (n.facilities[0].latitude = 200),
    (n) => (n.routes[0].from = 'missing'),
  ]) {
    const n = network();
    change(n);
    assert.throws(() =>
      importNetworkBackup(
        JSON.stringify({
          format: 'supply-chain-network',
          version: 1,
          network: n,
        }),
        'x',
      ),
    );
  }
});
test('storage recovery preserves valid neighbors around malformed records', () => {
  const good = network(),
    raw = JSON.stringify({
      version: 1,
      networks: [null, good, { bad: true }],
      activeNetworkId: 'custom',
    });
  const r = recoverSavedNetworks(raw);
  assert.equal(r.rejected, 2);
  assert.equal(r.saved.networks.length, 1);
  assert.equal(r.saved.activeNetworkId, 'custom');
  assert.equal(r.saved.networks[0].facilities.length, 14);
});
test('storage recovery rejects duplicate IDs and falls back from missing selection', () => {
  const n = network();
  const r = recoverSavedNetworks(
    JSON.stringify({
      version: 1,
      networks: [n, n],
      activeNetworkId: 'missing',
    }),
  );
  assert.equal(r.rejected, 1);
  assert.equal(r.saved.activeNetworkId, 'demo');
  assert.throws(() => recoverSavedNetworks('broken'));
  assert.throws(() => recoverSavedNetworks('{"version":2,"networks":[]}'));
});
test('custom deletion is immutable, changes active selection and protects demo', () => {
  const n = network(),
    saved = { ...emptySavedNetworks, networks: [n], activeNetworkId: n.id };
  const next = deleteCustomNetwork(saved, n.id);
  assert.deepEqual(next.networks, []);
  assert.equal(next.activeNetworkId, 'demo');
  assert.equal(saved.networks.length, 1);
  assert.throws(() => deleteCustomNetwork(saved, 'demo'));
  assert.throws(() => deleteCustomNetwork(saved, 'missing'));
});
