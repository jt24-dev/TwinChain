import test from 'node:test';
import assert from 'node:assert/strict';
import { facilities, routes } from '../lib/data/network.ts';
import { simulateDisruption } from '../lib/simulation/propagate-disruption.ts';
import { baseline, IMPACT_MODEL, kpiChanges } from '../lib/simulation/model.ts';
const run = (duration = 14, edges = routes, source = 'shanghai') =>
  simulateDisruption(facilities, edges, source, duration);

test('Shanghai propagation records shortest downstream hops, graded risk, and delay', () => {
  const result = run();
  const affected = result.facilities.filter((f) => f.impact);
  assert.deepEqual(
    affected.map((f) => [
      f.id,
      f.impact.hops,
      f.impact.severity,
      f.impact.additionalDelayDays,
    ]),
    [
      ['shanghai', 0, 'disrupted', 14],
      ['la', 1, 'high', 14],
      ['ontario', 2, 'medium', 9],
      ['chicago', 3, 'low', 6],
      ['ny', 4, 'low', 4],
    ],
  );
  assert.ok(
    affected.every(
      (f) =>
        f.impact.sourceFacilityId === 'shanghai' &&
        f.impact.sourceName === 'Shanghai Port',
    ),
  );
  assert.deepEqual(result.blockedRouteIds, ['r3', 'r4', 'r5']);
  assert.deepEqual(result.affectedRouteIds, ['r6', 'r7', 'r8']);
});

test('blocked inbound routes do not propagate risk upstream or onto independent branches', () => {
  const result = run();
  for (const id of [
    'suzhou',
    'shenzhen',
    'taipei',
    'hcm',
    'singapore',
    'rotterdam',
    'duisburg',
    'berlin',
    'sydney',
  ]) {
    const f = result.facilities.find((f) => f.id === id);
    assert.equal(f.status, 'operational');
    assert.equal(f.impact, null);
  }
  assert.ok(
    result.routes
      .filter((r) =>
        ['r1', 'r2', 'r9', 'r10', 'r11', 'r12', 'r13'].includes(r.id),
      )
      .every((r) => r.status === 'operational'),
  );
});

test('cycles, self-loops, and converging paths terminate and count each node once', () => {
  const edges = [
    ...routes,
    { id: 'cycle', from: 'ny', to: 'la', mode: 'Road' },
    { id: 'back-to-source', from: 'ny', to: 'shanghai', mode: 'Ocean' },
    { id: 'self', from: 'la', to: 'la', mode: 'Road' },
    { id: 'shortcut', from: 'shanghai', to: 'chicago', mode: 'Ocean' },
  ];
  const result = run(14, edges);
  assert.equal(result.atRiskFacilityIds.length, 4);
  assert.equal(new Set(result.atRiskFacilityIds).size, 4);
  assert.equal(
    result.facilities.find((f) => f.id === 'chicago').impact.hops,
    1,
  );
  assert.equal(result.facilities.find((f) => f.id === 'ny').impact.hops, 2);
  assert.equal(
    result.facilities.find((f) => f.id === 'shanghai').impact.hops,
    0,
  );
  const reordered = run(14, [...edges].reverse());
  assert.deepEqual(result.facilities, reordered.facilities);
  assert.deepEqual(result.kpis, reordered.kpis);
});

test('changing network connections changes discovered impacts without scenario lists', () => {
  const cut = run(
    14,
    routes.filter((r) => r.id !== 'r7'),
  );
  assert.deepEqual(cut.atRiskFacilityIds, ['la', 'ontario']);
  assert.equal(cut.facilities.find((f) => f.id === 'ny').impact, null);
  const added = run(14, [
    ...routes,
    { id: 'new-dependency', from: 'ny', to: 'berlin', mode: 'Ocean' },
  ]);
  assert.equal(added.atRiskFacilityIds.length, 5);
  assert.equal(added.facilities.find((f) => f.id === 'berlin').impact.hops, 5);
  assert.ok(added.kpis.serviceLevel < run().kpis.serviceLevel);
  assert.ok(added.kpis.logisticsCost > run().kpis.logisticsCost);
});

test('KPI formula uses risk weights, mean delays and route/facility cost penalties', () => {
  const result = run();
  assert.deepEqual(result.kpis, {
    serviceLevel: 83,
    leadTime: 20,
    logisticsCost: 1480000,
    facilitiesAtRisk: 4,
  });
  assert.equal(result.kpis.facilitiesAtRisk, result.atRiskFacilityIds.length);
  assert.equal(
    result.kpis.serviceLevel,
    baseline.serviceLevel - 2 * (3 + 2 + 1 + 1),
  );
  assert.equal(
    result.kpis.leadTime,
    Math.round(baseline.leadTime + (14 + 9 + 6 + 4) / 4),
  );
  assert.equal(
    result.kpis.logisticsCost,
    baseline.logisticsCost + 14 * (3 * 4000 + 3 * 2000 + 4 * 500),
  );
  assert.deepEqual(kpiChanges(result.kpis), {
    serviceDrop: 14,
    additionalLeadDays: 8,
    costIncreasePercent: (280000 / 1200000) * 100,
    additionalAtRisk: 4,
  });
});

test('duration increases delay and cost, reduces service level, and respects service bounds', () => {
  const short = run(7),
    standard = run(),
    long = run(28),
    extreme = run(365);
  assert.ok(
    short.kpis.serviceLevel > standard.kpis.serviceLevel &&
      standard.kpis.serviceLevel > long.kpis.serviceLevel,
  );
  assert.ok(
    short.kpis.leadTime < standard.kpis.leadTime &&
      standard.kpis.leadTime < long.kpis.leadTime,
  );
  assert.ok(
    short.kpis.logisticsCost < standard.kpis.logisticsCost &&
      standard.kpis.logisticsCost < long.kpis.logisticsCost,
  );
  assert.equal(extreme.kpis.serviceLevel, IMPACT_MODEL.serviceLevelFloor);
  for (const result of [short, standard, long, extreme])
    assert.ok(
      result.facilities.every(
        (f) => !f.impact || f.impact.additionalDelayDays >= 0,
      ),
    );
});

test('a closer dependency has a larger service penalty than a distant dependency', () => {
  const close = run(14, [
    ...routes,
    { id: 'direct-market', from: 'shanghai', to: 'ny', mode: 'Ocean' },
  ]);
  assert.deepEqual(close.atRiskFacilityIds, run().atRiskFacilityIds);
  assert.ok(close.kpis.serviceLevel < run().kpis.serviceLevel);
});

test('zero duration restores baseline, clears metadata, and preserves inputs', () => {
  const before = JSON.stringify({ facilities, routes });
  run();
  const zero = run(0);
  assert.deepEqual(zero.kpis, baseline);
  assert.equal(zero.active, false);
  assert.ok(
    zero.facilities.every(
      (f) => f.status === 'operational' && f.impact === null,
    ),
  );
  assert.ok(zero.routes.every((r) => r.status === 'operational'));
  assert.equal(JSON.stringify({ facilities, routes }), before);
});

test('reusable engine supports another source, a sink, and an isolated source', () => {
  assert.deepEqual(run(14, routes, 'singapore').atRiskFacilityIds, [
    'rotterdam',
    'duisburg',
    'berlin',
    'sydney',
  ]);
  const sink = run(14, routes, 'ny');
  assert.deepEqual(sink.atRiskFacilityIds, []);
  assert.deepEqual(sink.blockedRouteIds, ['r8']);
  assert.equal(sink.kpis.leadTime, baseline.leadTime);
  const isolated = run(14, [], 'shanghai');
  assert.equal(
    isolated.facilities.find((f) => f.id === 'shanghai').status,
    'disrupted',
  );
  assert.deepEqual(isolated.kpis, baseline);
});

test('invalid duration, missing endpoints and duplicate IDs fail explicitly', () => {
  for (const duration of [-1, Infinity, NaN])
    assert.throws(() => run(duration), /duration/);
  assert.throws(() => run(14, routes, 'missing'), /Unknown disrupted/);
  assert.throws(
    () => run(14, [...routes, { ...routes[0], id: 'bad', to: 'missing' }]),
    /unknown facility/,
  );
  assert.throws(() => run(14, [...routes, routes[0]]), /Duplicate route/);
  assert.throws(
    () =>
      simulateDisruption(
        [...facilities, facilities[0]],
        routes,
        'shanghai',
        14,
      ),
    /unique/,
  );
});
