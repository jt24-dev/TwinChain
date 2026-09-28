import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUTE_MODE_VISUALS,
  routeMarkerPoint,
  routeModeClass,
  routeModeVisuals,
} from '../lib/route-visuals.ts';

const modes = ['Ocean', 'Truck', 'Rail', 'Air', 'Road', 'Feeder'];

test('every supported transportation mode has one distinct visual token', () => {
  assert.deepEqual(Object.keys(ROUTE_MODE_VISUALS), modes);
  assert.equal(new Set(routeModeVisuals.map((visual) => visual.token)).size, 6);
  assert.equal(new Set(routeModeVisuals.map((visual) => visual.glyph)).size, 6);
  assert.ok(routeModeVisuals.every((visual) => visual.description.length > 0));
});

test('route marker uses the midpoint of the longest visible path segment', () => {
  assert.deepEqual(routeMarkerPoint('M0,0L10,0L20,0'), { x: 10, y: 0 });
  assert.deepEqual(routeMarkerPoint('M0,0L4,0M100,0L120,0'), {
    x: 110,
    y: 0,
  });
  assert.equal(routeMarkerPoint(''), null);
});

test('route mode classes are stable for renderer, legend, and detail UI', () => {
  assert.deepEqual(
    modes.map((mode) => routeModeClass(mode)),
    [
      'mode-ocean',
      'mode-truck',
      'mode-rail',
      'mode-air',
      'mode-road',
      'mode-feeder',
    ],
  );
});
