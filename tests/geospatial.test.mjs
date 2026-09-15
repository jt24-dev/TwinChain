import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  projectCoordinates,
  coordinatesAtPoint,
  facilityPoint,
  routeGeometry,
  MAP_WIDTH,
  MAP_HEIGHT,
} from '../lib/map-projection.ts';
import { fitNetworkCamera, FIT_CAMERA, MAX_ZOOM } from '../lib/map-camera.ts';
import { facilities, routes } from '../lib/data/network.ts';
import { getNetworkState } from '../lib/data/scenario.ts';
import { exportNetwork, importNetworkBackup } from '../lib/network-backup.ts';
import { demoNetwork } from '../lib/networks.ts';
const node = (latitude, longitude) => ({
  ...facilities[0],
  latitude,
  longitude,
});
test('known Shanghai anchor matches full-latitude plate carree math', () => {
  const [x, y] = projectCoordinates(31.2, 121.5);
  assert.ok(Math.abs(x - 462.9166666667) < 1e-7);
  assert.ok(Math.abs(y - 179.6666666667) < 1e-7);
});
test('round trips cover six continents and polar coordinates at several cameras', () => {
  for (const [lat, lon] of [
    [34, -118],
    [-23.55, -46.63],
    [51.5, -0.12],
    [-33.92, 18.42],
    [31.2, 121.5],
    [-33.86, 151.21],
    [90, 0],
    [-90, 0],
  ]) {
    for (const scale of [0.4, 1, 8, 24]) {
      const [x, y] = projectCoordinates(lat, lon);
      const c = coordinatesAtPoint(x * scale - 200, y * scale + 75, scale, {
        x: -200,
        y: 75,
      });
      assert.ok(Math.abs(c.latitude - lat) < 1e-8);
      assert.ok(Math.abs(c.longitude - lon) < 1e-8);
    }
  }
});
test('longitude wrapping is periodic and dateline points remain adjacent', () => {
  assert.deepEqual(projectCoordinates(0, 181), projectCoordinates(0, -179));
  assert.deepEqual(projectCoordinates(0, 541), projectCoordinates(0, -179));
  assert.ok(
    Math.abs(projectCoordinates(0, 179)[0] - projectCoordinates(0, -179)[0]) <
      7,
  );
});
test('all demo centers and route endpoints use exact geographic positions without offsets', () => {
  for (const f of facilities)
    assert.deepEqual(
      facilityPoint(f, true),
      projectCoordinates(f.latitude, f.longitude),
    );
  for (const r of routes) {
    const from = facilities.find((f) => f.id === r.from),
      to = facilities.find((f) => f.id === r.to);
    const d = routeGeometry(from, to);
    const a = facilityPoint(from),
      b = facilityPoint(to);
    assert.ok(d.startsWith(`M${a[0].toFixed(3)},${a[1].toFixed(3)}`));
    assert.ok(d.endsWith(`${b[0].toFixed(3)},${b[1].toFixed(3)}`));
  }
});
test('ocean and air geodesics bend poleward while land lanes stay schematic', () => {
  const a = node(35, 120),
    b = node(35, -120);
  const points = routeGeometry(a, b)
    .match(/[ML]([\d.-]+),([\d.-]+)/g)
    .map((p) => p.slice(1).split(',').map(Number));
  assert.ok(Math.min(...points.map((p) => p[1])) < facilityPoint(a)[1] - 10);
  const land = routeGeometry(a, b, false)
    .match(/[ML]([\d.-]+),([\d.-]+)/g)
    .map((p) => Number(p.split(',')[1]));
  assert.ok(land.every((y) => Math.abs(y - facilityPoint(a)[1]) < 0.001));
});
test('route seam crossing is split without a false line across the world', () => {
  const d = routeGeometry(node(10, -40), node(20, -20));
  assert.equal((d.match(/M/g) || []).length, 2);
  assert.ok(!d.includes('NaN'));
  assert.ok(d.includes('L1100,') && d.includes('M0,'));
});
test('coincident and antipodal routes never produce invalid geometry', () => {
  for (const [a, b] of [
    [node(0, 0), node(0, 0)],
    [node(0, 0), node(0, 180)],
  ])
    assert.ok(!/NaN|Infinity/.test(routeGeometry(a, b)));
});
test('fit handles empty and single-facility networks with sensible zoom', () => {
  assert.deepEqual(fitNetworkCamera([]), FIT_CAMERA);
  const c = fitNetworkCamera([node(40, -74)]);
  assert.equal(c.zoom, 8);
  assert.ok(c.zoom < MAX_ZOOM);
});
test('fit bounds include demo and regional networks with padding on laptop viewports', () => {
  for (const ns of [
    facilities,
    [node(48, 2), node(51, 5)],
    [node(0, 179), node(0, -179)],
  ])
    for (const [w, h] of [
      [700, 350],
      [1100, 550],
    ]) {
      const c = fitNetworkCamera(ns, w, h),
        base = Math.min(w / MAP_WIDTH, h / MAP_HEIGHT),
        scale = base * c.zoom;
      for (const f of ns) {
        const [x, y] = facilityPoint(f);
        const sx = (w - MAP_WIDTH * scale) / 2 + base * c.x + x * scale,
          sy = (h - MAP_HEIGHT * scale) / 2 + base * c.y + y * scale;
        assert.ok(sx >= 30 && sx <= w - 30);
        assert.ok(sy >= 30 && sy <= h - 30);
      }
    }
});
test('switching distant networks produces different bounds without mutating data', () => {
  const a = [node(40, -74)],
    b = [node(31, 121)];
  const before = JSON.stringify([a, b]);
  assert.notDeepEqual(fitNetworkCamera(a), fitNetworkCamera(b));
  assert.equal(JSON.stringify([a, b]), before);
});
test('local country paths stay inside the map and include geographic labels', () => {
  const g = JSON.parse(
    readFileSync(new URL('../lib/data/geography.json', import.meta.url)),
  );
  assert.equal(g.countries.length, 242);
  assert.ok(g.countries.some((c) => c.name === 'China'));
  assert.ok(g.countries.some((c) => c.name === 'Brazil'));
  assert.ok(g.places.length > 200);
  for (const c of g.countries) {
    for (const match of c.path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)) {
      assert.ok(+match[1] >= 0 && +match[1] <= MAP_WIDTH);
      assert.ok(+match[2] >= 0 && +match[2] <= MAP_HEIGHT);
    }
  }
});
test('JSON restored coordinate anchors match source and do not inherit layout offsets', () => {
  const n = importNetworkBackup(
    exportNetwork({ ...demoNetwork, id: 'a', kind: 'custom' }),
    'b',
  );
  for (let i = 0; i < n.facilities.length; i++)
    assert.deepEqual(
      facilityPoint(n.facilities[i]),
      facilityPoint(facilities[i], true),
    );
});
test('camera/projection work does not change simulation, stockout or mitigation outputs', () => {
  const before = JSON.stringify(getNetworkState(true));
  fitNetworkCamera(facilities);
  routes.forEach((r) =>
    routeGeometry(
      facilities.find((f) => f.id === r.from),
      facilities.find((f) => f.id === r.to),
    ),
  );
  assert.equal(JSON.stringify(getNetworkState(true)), before);
  assert.deepEqual(getNetworkState(true).kpis, {
    serviceLevel: 89,
    leadTime: 20,
    logisticsCost: 1480000,
    facilitiesAtRisk: 3,
  });
  assert.equal(
    getNetworkState(true, 'reroute').inventorySummary.earliestStockoutDay,
    8,
  );
});
