import test from 'node:test';
import assert from 'node:assert/strict';
import { facilities, routes } from '../lib/data/network.ts';
import { fitNetworkCamera } from '../lib/map-camera.ts';
import { facilityPoint } from '../lib/map-projection.ts';

test('Ontario Demo distribution center is in Toronto, Canada with original connections', () => {
  const ontario = facilities.find((f) => f.id === 'ontario');
  assert.equal(ontario.city, 'Toronto, Ontario');
  assert.equal(ontario.latitude, 43.65);
  assert.equal(ontario.longitude, -79.38);
  assert.deepEqual(
    routes
      .filter((r) => r.from === 'ontario' || r.to === 'ontario')
      .map((r) => [r.from, r.to]),
    [
      ['la', 'ontario'],
      ['ontario', 'chicago'],
    ],
  );
  assert.equal(facilities.length, 14);
  assert.equal(routes.length, 13);
});
test('Corrected Ontario remains within the fitted Demo viewport', () => {
  const camera = fitNetworkCamera(facilities, 1100, 550);
  const p = facilityPoint(facilities.find((f) => f.id === 'ontario'));
  assert.ok(Math.abs((p[0] - 550) * camera.zoom + camera.x) < 550);
  assert.ok(Math.abs((p[1] - 275) * camera.zoom + camera.y) < 275);
});
