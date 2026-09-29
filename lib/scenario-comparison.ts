import type { SavedScenario } from './scenarios';

export const MIN_SCENARIOS_TO_COMPARE = 2;
export const MAX_SCENARIOS_TO_COMPARE = 4;

export type ComparisonMetric =
  | 'serviceLevel'
  | 'leadTime'
  | 'logisticsCost'
  | 'facilitiesAtRisk'
  | 'projectedStockouts'
  | 'earliestStockout';

export type StockoutComparison =
  | { kind: 'day'; label: string; rank: number }
  | { kind: 'protected'; label: 'Protected'; rank: number }
  | { kind: 'no-stockout'; label: 'No projected stockout'; rank: number }
  | { kind: 'no-data'; label: 'No data' };

export interface ScenarioComparison {
  scenarios: SavedScenario[];
  referenceId: string;
  baselineId?: string;
  standings: Record<
    ComparisonMetric,
    { bestIds: string[]; worstIds: string[] }
  >;
}

export type ScenarioComparisonResult =
  | { ok: true; comparison: ScenarioComparison }
  | {
      ok: false;
      reason: 'selection-count' | 'missing-scenario' | 'incompatible-network';
      message: string;
    };

export function isDoNothingScenario(scenario: SavedScenario) {
  return scenario.mitigation.kind === 'demo'
    ? scenario.mitigation.strategy === 'do-nothing'
    : scenario.mitigation.choice.id === 'do-nothing';
}

export function scenarioStockoutComparison(
  scenario: SavedScenario,
): StockoutComparison {
  const day = scenario.snapshot.earliestStockoutDay;
  if (day !== undefined)
    return { kind: 'day', label: `Day ${day.toFixed(1)}`, rank: day };
  if (scenario.snapshot.protectedFacilities > 0)
    return {
      kind: 'protected',
      label: 'Protected',
      rank: Number.POSITIVE_INFINITY,
    };
  if (scenario.snapshot.noDataFacilities === 0)
    return {
      kind: 'no-stockout',
      label: 'No projected stockout',
      rank: Number.POSITIVE_INFINITY,
    };
  return { kind: 'no-data', label: 'No data' };
}

export function toggleScenarioSelection(
  selectedIds: readonly string[],
  scenarioId: string,
) {
  if (selectedIds.includes(scenarioId))
    return {
      ids: selectedIds.filter((id) => id !== scenarioId),
      message: '',
    };
  if (selectedIds.length >= MAX_SCENARIOS_TO_COMPARE)
    return {
      ids: [...selectedIds],
      message: `Compare up to ${MAX_SCENARIOS_TO_COMPARE} scenarios at a time.`,
    };
  return { ids: [...selectedIds, scenarioId], message: '' };
}

function metricValue(scenario: SavedScenario, metric: ComparisonMetric) {
  if (metric === 'projectedStockouts')
    return scenario.snapshot.projectedStockouts;
  if (metric === 'earliestStockout') {
    const stockout = scenarioStockoutComparison(scenario);
    return stockout.kind === 'no-data' ? undefined : stockout.rank;
  }
  return scenario.snapshot.kpis[metric];
}

function metricStanding(
  scenarios: readonly SavedScenario[],
  metric: ComparisonMetric,
) {
  const values = scenarios.flatMap((scenario) => {
    const value = metricValue(scenario, metric);
    return value === undefined ? [] : [{ id: scenario.id, value }];
  });
  if (values.length < 2) return { bestIds: [], worstIds: [] };
  const numbers = values.map(({ value }) => value);
  const minimum = Math.min(...numbers);
  const maximum = Math.max(...numbers);
  if (minimum === maximum) return { bestIds: [], worstIds: [] };
  const higherIsBetter =
    metric === 'serviceLevel' || metric === 'earliestStockout';
  const best = higherIsBetter ? maximum : minimum;
  const worst = higherIsBetter ? minimum : maximum;
  return {
    bestIds: values.filter(({ value }) => value === best).map(({ id }) => id),
    worstIds: values.filter(({ value }) => value === worst).map(({ id }) => id),
  };
}

export function buildScenarioComparison(
  savedScenarios: readonly SavedScenario[],
  selectedIds: readonly string[],
): ScenarioComparisonResult {
  const uniqueIds = [...new Set(selectedIds)];
  if (
    uniqueIds.length < MIN_SCENARIOS_TO_COMPARE ||
    uniqueIds.length > MAX_SCENARIOS_TO_COMPARE
  )
    return {
      ok: false,
      reason: 'selection-count',
      message: `Select ${MIN_SCENARIOS_TO_COMPARE}–${MAX_SCENARIOS_TO_COMPARE} saved scenarios to compare.`,
    };
  const byId = new Map(savedScenarios.map((scenario) => [scenario.id, scenario]));
  const scenarios = uniqueIds.flatMap((id) => {
    const scenario = byId.get(id);
    return scenario ? [scenario] : [];
  });
  if (scenarios.length !== uniqueIds.length)
    return {
      ok: false,
      reason: 'missing-scenario',
      message: 'One of the selected scenarios is no longer available.',
    };
  const first = scenarios[0];
  if (
    scenarios.some(
      (scenario) =>
        scenario.networkId !== first.networkId ||
        scenario.networkFingerprint !== first.networkFingerprint,
    )
  )
    return {
      ok: false,
      reason: 'incompatible-network',
      message:
        'Select scenarios from the same unchanged network for a meaningful comparison.',
    };
  const baseline = scenarios.find(isDoNothingScenario);
  const metrics: ComparisonMetric[] = [
    'serviceLevel',
    'leadTime',
    'logisticsCost',
    'facilitiesAtRisk',
    'projectedStockouts',
    'earliestStockout',
  ];
  return {
    ok: true,
    comparison: {
      scenarios,
      referenceId: baseline?.id ?? first.id,
      ...(baseline ? { baselineId: baseline.id } : {}),
      standings: Object.fromEntries(
        metrics.map((metric) => [
          metric,
          metricStanding(scenarios, metric),
        ]),
      ) as ScenarioComparison['standings'],
    },
  };
}
