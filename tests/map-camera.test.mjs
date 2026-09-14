import assert from 'node:assert/strict';
import test from 'node:test';
import { FIT_CAMERA, constrainCamera, zoomCamera } from '../lib/map-camera.ts';
test('zoom preserves the world point under the pointer', () => {
  const before = { zoom: 2, x: 30, y: -20 },
    anchor = { x: 80, y: 40 };
  const after = zoomCamera(before, 3, anchor);
  assert.equal(
    (anchor.x - before.x) / before.zoom,
    (anchor.x - after.x) / after.zoom,
  );
  assert.equal(
    (anchor.y - before.y) / before.zoom,
    (anchor.y - after.y) / after.zoom,
  );
});
test('zoom and drag stay bounded and fit returns the original camera', () => {
  assert.equal(zoomCamera(FIT_CAMERA, 20).zoom, 4);
  assert.deepEqual(zoomCamera({ zoom: 3, x: 300, y: 200 }, 0.1), FIT_CAMERA);
  assert.deepEqual(constrainCamera({ zoom: 2, x: 100000, y: -100000 }), {
    zoom: 2,
    x: 550,
    y: -250,
  });
});
