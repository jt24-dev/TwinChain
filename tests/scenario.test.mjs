import assert from 'node:assert/strict';
import test from 'node:test';
import { facilities, routes } from '../lib/data/network.ts';
import { baseline, getNetworkState } from '../lib/data/scenario.ts';

test('network references are valid and all facilities participate', () => {
  const ids = new Set(facilities.map((f) => f.id));
  assert.equal(ids.size, 14);
  assert.equal(new Set(routes.map((r) => r.id)).size, routes.length);
  for (const route of routes) {
    assert.ok(ids.has(route.from) && ids.has(route.to));
    assert.notEqual(route.from, route.to);
  }
  for (const id of ids)
    assert.ok(routes.some((r) => r.from === id || r.to === id));
});
test('closure blocks Shanghai and exposes exactly the four downstream facilities', () => {
  const state = getNetworkState(true);
  assert.deepEqual(
    state.facilities.filter((f) => f.status === 'disrupted').map((f) => f.id),
    ['shanghai'],
  );
  assert.deepEqual(
    state.facilities.filter((f) => f.status === 'at risk').map((f) => f.id),
    ['la', 'ontario', 'chicago', 'ny'],
  );
  assert.equal(state.routes.filter((r) => r.status === 'blocked').length, 3);
  assert.equal(state.routes.filter((r) => r.status === 'affected').length, 3);
  assert.equal(state.kpis.facilitiesAtRisk, state.atRiskFacilityIds.length);
  assert.deepEqual(state.kpis, {
    serviceLevel: 89,
    leadTime: 20,
    logisticsCost: 1480000,
    facilitiesAtRisk: 3,
  });
  for (const r of state.routes.filter(
    (r) => r.from === 'singapore' || r.from === 'rotterdam',
  ))
    assert.equal(r.status, 'operational');
});
test('repeated activation and reset fully restore the baseline without mutating data', () => {
  const original = JSON.stringify({ facilities, routes, baseline });
  for (let i = 0; i < 3; i++) {
    getNetworkState(true);
    const reset = getNetworkState(false);
    assert.deepEqual(reset.kpis, baseline);
    assert.ok(reset.facilities.every((f) => f.status === 'operational'));
    assert.ok(reset.routes.every((r) => r.status === 'operational'));
    assert.ok(reset.facilities.every((f) => f.impact === null));
    assert.deepEqual(reset.atRiskFacilityIds, []);
    assert.deepEqual(reset.blockedRouteIds, []);
    assert.deepEqual(reset.affectedRouteIds, []);
  }
  assert.equal(JSON.stringify({ facilities, routes, baseline }), original);
});
