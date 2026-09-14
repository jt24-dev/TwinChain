import test from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateDisruption,
  calculateKpis,
} from '../lib/simulation/propagate-disruption.ts';
import {
  applyMitigation,
  compareStrategies,
  strategies,
} from '../lib/simulation/mitigation.ts';
import { facilities, routes } from '../lib/data/network.ts';
import { getNetworkState, baseline } from '../lib/data/scenario.ts';
const disrupted = simulateDisruption(facilities, routes, 'shanghai', 14);

test('Do Nothing is exactly the v0.3 disruption result', () => {
  assert.strictEqual(applyMitigation(disrupted, 'do-nothing'), disrupted);
  assert.deepEqual(disrupted.kpis, {
    serviceLevel: 83,
    leadTime: 20,
    logisticsCost: 1480000,
    facilitiesAtRisk: 4,
  });
});
test('Singapore reroute improves service, delay and exposure at a positive cost premium', () => {
  const result = applyMitigation(disrupted, 'reroute');
  assert.ok(result.kpis.serviceLevel > disrupted.kpis.serviceLevel);
  assert.ok(result.kpis.leadTime < disrupted.kpis.leadTime);
  assert.ok(result.kpis.logisticsCost > disrupted.kpis.logisticsCost);
  assert.ok(result.kpis.facilitiesAtRisk < disrupted.kpis.facilitiesAtRisk);
  assert.deepEqual(
    result.facilities
      .filter((f) => f.mitigation)
      .map((f) => [f.id, f.impact.severity, f.impact.additionalDelayDays]),
    [
      ['la', 'medium', 6],
      ['ontario', 'low', 4],
      ['chicago', 'normal', 3],
      ['ny', 'normal', 2],
    ],
  );
});
test('Reroute adds only two bypass legs, keeps Shanghai physically closed and restores downstream flow', () => {
  const result = applyMitigation(disrupted, 'reroute');
  assert.equal(result.facilities.length, 14);
  assert.equal(result.routes.length, 15);
  assert.deepEqual(result.blockedRouteIds, disrupted.blockedRouteIds);
  assert.deepEqual(
    result.routes.filter((r) => r.alternate).map((r) => [r.from, r.to]),
    [
      ['shenzhen', 'singapore'],
      ['singapore', 'la'],
    ],
  );
  assert.equal(result.routes.find((r) => r.id === 'r8').status, 'operational');
  assert.equal(
    result.facilities.find((f) => f.id === 'shanghai').status,
    'disrupted',
  );
  assert.ok(
    result.routes.every(
      (r) =>
        result.facilities.some((f) => f.id === r.from) &&
        result.facilities.some((f) => f.id === r.to),
    ),
  );
});
test('Air protects critical DCs and markets without introducing an aviation network', () => {
  const result = applyMitigation(disrupted, 'air-freight');
  const reroute = applyMitigation(disrupted, 'reroute');
  assert.ok(result.kpis.serviceLevel > reroute.kpis.serviceLevel);
  assert.ok(result.kpis.leadTime < reroute.kpis.leadTime);
  assert.ok(result.kpis.logisticsCost > reroute.kpis.logisticsCost);
  assert.ok(result.kpis.facilitiesAtRisk <= reroute.kpis.facilitiesAtRisk);
  assert.equal(result.routes.length, 13);
  assert.equal(
    result.facilities.filter(
      (f) => f.impact?.severity === 'high' || f.impact?.severity === 'medium',
    ).length,
    0,
  );
  assert.deepEqual(
    result.facilities
      .filter((f) => f.mitigation?.emergencyProtection)
      .map((f) => f.id),
    ['ontario', 'chicago', 'ny'],
  );
  assert.ok(
    result.facilities
      .filter((f) => f.mitigation?.emergencyProtection)
      .every((f) => f.impact.additionalDelayDays <= 1),
  );
  assert.deepEqual(result.blockedRouteIds, disrupted.blockedRouteIds);
});
test('Comparison uses a common immutable input and recalculates internally consistent KPIs', () => {
  const before = JSON.stringify(disrupted);
  const comparison = compareStrategies(disrupted);
  assert.equal(comparison.results.length, 3);
  for (const { strategy, result } of comparison.results) {
    assert.deepEqual(result, applyMitigation(disrupted, strategy.id));
    assert.equal(result.atRiskFacilityIds.length, result.kpis.facilitiesAtRisk);
    assert.deepEqual(
      result.affectedRouteIds,
      result.routes.filter((r) => r.status === 'affected').map((r) => r.id),
    );
    const operating = calculateKpis(
      result.facilities,
      result.blockedRouteIds.length,
      result.affectedRouteIds.length,
      14,
    );
    assert.deepEqual(result.kpis, {
      ...operating,
      logisticsCost: operating.logisticsCost + 14 * strategy.premiumPerDay,
    });
  }
  assert.equal(JSON.stringify(disrupted), before);
  assert.deepEqual(compareStrategies(disrupted), comparison);
});
test('Best metric markers use extrema, including ties, without choosing a universal strategy', () => {
  const { results, best } = compareStrategies(disrupted);
  for (const key of Object.keys(best)) {
    const values = results.map((r) => r.result.kpis[key]);
    assert.equal(
      best[key],
      key === 'serviceLevel' ? Math.max(...values) : Math.min(...values),
    );
  }
  const normal = compareStrategies(getNetworkState(false));
  for (const item of normal.results)
    assert.deepEqual(item.result.kpis, normal.best);
});
test('Reset clears all strategy overlays and metadata, and repeat switches never accumulate', () => {
  for (let i = 0; i < 3; i++)
    for (const { id } of strategies) {
      const current = getNetworkState(true, id);
      assert.equal(current.routes.length, id === 'reroute' ? 15 : 13);
      const reset = getNetworkState(false, id);
      assert.deepEqual(reset.kpis, baseline);
      assert.equal(reset.routes.length, 13);
      assert.ok(
        reset.routes.every((r) => !r.alternate && r.status === 'operational'),
      );
      assert.ok(
        reset.facilities.every(
          (f) => !f.mitigation && !f.impact && f.status === 'operational',
        ),
      );
      assert.strictEqual(applyMitigation(reset, id), reset);
    }
});
test('Mitigation only changes discovered downstream impacts and prevents stacked adjustments', () => {
  for (const id of ['reroute', 'air-freight']) {
    const result = applyMitigation(disrupted, id);
    for (const original of disrupted.facilities.filter(
      (f) => !f.impact || f.impact.hops === 0,
    ))
      assert.deepEqual(
        result.facilities.find((f) => f.id === original.id),
        original,
      );
    assert.throws(
      () => applyMitigation(result, 'reroute'),
      /original disruption/,
    );
  }
  assert.throws(
    () => applyMitigation(disrupted, 'invalid'),
    /Unknown mitigation/,
  );
  assert.throws(
    () =>
      applyMitigation(
        simulateDisruption(facilities, routes, 'singapore', 14),
        'reroute',
      ),
    /Shanghai/,
  );
});
test('Mitigation remains parameter driven when the closure duration changes', () => {
  for (const duration of [7, 28]) {
    const input = simulateDisruption(facilities, routes, 'shanghai', duration);
    const comparison = compareStrategies(input);
    const [nothing, reroute, air] = comparison.results.map(
      (r) => r.result.kpis,
    );
    assert.ok(
      reroute.serviceLevel > nothing.serviceLevel &&
        air.serviceLevel > reroute.serviceLevel,
    );
    assert.ok(
      air.leadTime <= reroute.leadTime && reroute.leadTime < nothing.leadTime,
    );
    assert.ok(
      air.logisticsCost > reroute.logisticsCost &&
        reroute.logisticsCost > nothing.logisticsCost,
    );
  }
});
