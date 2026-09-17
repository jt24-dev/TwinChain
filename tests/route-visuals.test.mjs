import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUTE_MODE_VISUALS,
  routeModeClass,
  routeModeVisuals,
} from '../lib/route-visuals.ts';

const modes = ['Ocean', 'Truck', 'Rail', 'Air', 'Road', 'Feeder'];

test('every supported transportation mode has one distinct visual token', () => {
  assert.deepEqual(Object.keys(ROUTE_MODE_VISUALS), modes);
  assert.equal(new Set(routeModeVisuals.map((visual) => visual.token)).size, 6);
  assert.ok(routeModeVisuals.every((visual) => visual.description.length > 0));
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
