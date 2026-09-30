import { useEffect, useMemo, useState } from 'react';
import { Clock3, History, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SavedScenario } from '@/lib/scenarios';
import { disruptionLabels } from '@/lib/simulation/disruption';
import {
  buildScenarioComparison,
  MAX_SCENARIOS_TO_COMPARE,
  scenarioStockoutComparison,
  toggleScenarioSelection,
  type ComparisonMetric,
  type ScenarioComparison,
} from '@/lib/scenario-comparison';

const compactMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

function signed(value: number, unit: string) {
  if (!value) return 'No change';
  return `${value > 0 ? '+' : ''}${value.toLocaleString()}${unit}`;
}

function signedMoney(value: number) {
  if (!value) return 'No change';
  return `${value > 0 ? '+' : '−'}${compactMoney.format(Math.abs(value))}`;
}

const tradeoffLabels: Record<
  ComparisonMetric,
  { best: string; worst: string }
> = {
  serviceLevel: { best: 'Higher service', worst: 'Lower service' },
  leadTime: { best: 'Shorter lead time', worst: 'Longer lead time' },
  logisticsCost: { best: 'Lower cost', worst: 'Higher cost' },
  facilitiesAtRisk: { best: 'Lower risk', worst: 'Higher risk' },
  projectedStockouts: {
    best: 'Fewer stockouts',
    worst: 'More stockouts',
  },
  earliestStockout: {
    best: 'Later / protected',
    worst: 'Earlier stockout',
  },
};

export function ScenarioHistory({
  active,
  defaultName,
  scenarios,
  ready,
  canSave,
  storageError,
  notice,
  onSave,
  onOpen,
  onDelete,
}: {
  active: boolean;
  defaultName: string;
  scenarios: SavedScenario[];
  ready: boolean;
  canSave: boolean;
  storageError: string;
  notice: string;
  onSave: (name: string) => void;
  onOpen: (scenario: SavedScenario) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<SavedScenario | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareRequested, setCompareRequested] = useState(false);
  const [comparisonMessage, setComparisonMessage] = useState('');

  const comparisonResult = useMemo(
    () => buildScenarioComparison(scenarios, selectedIds),
    [scenarios, selectedIds],
  );

  useEffect(() => {
    setName(defaultName);
    setError('');
  }, [defaultName]);

  useEffect(() => {
    const available = new Set(scenarios.map((scenario) => scenario.id));
    setSelectedIds((current) => current.filter((id) => available.has(id)));
  }, [scenarios]);

  return (
    <section className="scenario-history" aria-label="Scenario history">
      <div className="scenario-history-heading">
        <div>
          <span className="eyebrow">PLANNING WORKSPACE</span>
          <h3>
            <History size={18} /> Scenario History
          </h3>
        </div>
        <span>{scenarios.length} saved</span>
      </div>
      <div className="scenario-save-row">
        <label className="builder-field">
          Scenario name
          <input
            value={name}
            maxLength={160}
            disabled={!active || !ready || !canSave}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            placeholder="Run a disruption to save a scenario"
          />
        </label>
        <Button
          disabled={!active || !ready || !canSave || !name.trim()}
          onClick={() => {
            try {
              onSave(name);
              setError('');
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Scenario could not be saved.',
              );
            }
          }}
        >
          <Save size={15} /> Save Scenario
        </Button>
      </div>
      {!active && (
        <p className="scenario-history-hint">
          Run a disruption, optionally apply a response, then save it here.
        </p>
      )}
      {(error || storageError) && (
        <p className="builder-error" role="alert">
          {error || storageError}
        </p>
      )}
      {notice && (
        <p className="scenario-history-notice" role="status">
          {notice}
        </p>
      )}
      <div className="scenario-compare-toolbar">
        <div>
          <strong>{selectedIds.length} selected</strong>
          <span>Select 2–{MAX_SCENARIOS_TO_COMPARE} from one network.</span>
        </div>
        <Button
          variant="outline"
          disabled={selectedIds.length < 2}
          onClick={() => {
            setCompareRequested(true);
            setComparisonMessage(
              comparisonResult.ok ? '' : comparisonResult.message,
            );
          }}
        >
          Compare Scenarios
        </Button>
        {selectedIds.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedIds([]);
              setCompareRequested(false);
              setComparisonMessage('');
            }}
          >
            Clear
          </Button>
        )}
      </div>
      {comparisonMessage && (
        <p className="builder-error" role="alert">
          {comparisonMessage}
        </p>
      )}
      <details className="scenario-history-list" open>
        <summary>Saved scenarios</summary>
        {scenarios.length ? (
          <ul>
            {scenarios.map((scenario) => (
              <li key={scenario.id}>
                <label className="scenario-compare-select">
                  <input
                    type="checkbox"
                    aria-label={`Select scenario for comparison: ${scenario.name}`}
                    checked={selectedIds.includes(scenario.id)}
                    disabled={
                      !selectedIds.includes(scenario.id) &&
                      selectedIds.length >= MAX_SCENARIOS_TO_COMPARE
                    }
                    onChange={() => {
                      const next = toggleScenarioSelection(
                        selectedIds,
                        scenario.id,
                      );
                      setSelectedIds(next.ids);
                      setComparisonMessage(next.message);
                      setCompareRequested(false);
                    }}
                  />
                  Compare
                </label>
                <div className="scenario-history-primary">
                  <strong>{scenario.name}</strong>
                  <span>
                    {scenario.networkName} ·{' '}
                    {disruptionLabels[scenario.disruption.type]} ·{' '}
                    {scenario.disruptedFacilityName} ·{' '}
                    {scenario.disruption.durationDays} days
                  </span>
                </div>
                <div className="scenario-history-metrics">
                  <span>{scenario.mitigationName}</span>
                  <span>{scenario.snapshot.kpis.serviceLevel}% service</span>
                  <span>{scenario.snapshot.kpis.facilitiesAtRisk} at risk</span>
                  <time dateTime={scenario.createdAt}>
                    <Clock3 size={12} />{' '}
                    {new Date(scenario.createdAt).toLocaleString()}
                  </time>
                </div>
                <div className="scenario-history-actions">
                  <Button variant="outline" onClick={() => onOpen(scenario)}>
                    Reopen
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Delete scenario: ${scenario.name}`}
                    onClick={() => setDeleting(scenario)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No saved scenarios yet.</p>
        )}
      </details>
      {compareRequested && comparisonResult.ok && (
        <ScenarioComparisonPanel
          comparison={comparisonResult.comparison}
          onOpen={onOpen}
        />
      )}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes only the saved scenario. Its underlying network remains
            available.
          </AlertDialogDescription>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (deleting) onDelete(deleting.id);
              setDeleting(null);
            }}
          >
            Delete Scenario
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function ScenarioComparisonPanel({
  comparison,
  onOpen,
}: {
  comparison: ScenarioComparison;
  onOpen: (scenario: SavedScenario) => void;
}) {
  const reference = comparison.scenarios.find(
    (scenario) => scenario.id === comparison.referenceId,
  )!;
  const metricCell = (
    scenario: SavedScenario,
    metric: ComparisonMetric,
    value: string,
    delta: string,
  ) => {
    const standing = comparison.standings[metric];
    const best = standing.bestIds.includes(scenario.id);
    const worst = standing.worstIds.includes(scenario.id);
    return (
      <td key={scenario.id} className={best ? 'best' : worst ? 'worst' : ''}>
        <strong>{value}</strong>
        <small>
          {scenario.id === comparison.referenceId
            ? comparison.baselineId
              ? 'Baseline'
              : 'Reference'
            : delta}
        </small>
        {(best || worst) && (
          <span className="scenario-tradeoff">
            {best ? tradeoffLabels[metric].best : tradeoffLabels[metric].worst}
          </span>
        )}
      </td>
    );
  };
  return (
    <section className="scenario-comparison" aria-label="Scenario comparison">
      <div className="scenario-comparison-heading">
        <div>
          <span className="eyebrow">SIDE-BY-SIDE TRADEOFFS</span>
          <h4>Scenario Comparison</h4>
        </div>
        <span>{reference.networkName}</span>
      </div>
      <p>
        Differences use{' '}
        {comparison.baselineId
          ? 'the selected Do Nothing baseline'
          : 'the first selected scenario'}{' '}
        as the reference. No overall winner is assigned.
      </p>
      <div className="scenario-comparison-scroll">
        <table style={{ minWidth: 150 + comparison.scenarios.length * 210 }}>
          <caption>
            Saved scenario inputs and result snapshots from the same network.
          </caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              {comparison.scenarios.map((scenario) => (
                <th scope="col" key={scenario.id}>
                  <strong>{scenario.name}</strong>
                  <span>
                    {scenario.id === comparison.baselineId
                      ? 'Do Nothing · Baseline'
                      : scenario.mitigationName}
                  </span>
                  <time dateTime={scenario.createdAt}>
                    {new Date(scenario.createdAt).toLocaleString()}
                  </time>
                  <Button variant="ghost" onClick={() => onOpen(scenario)}>
                    Reopen
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Disruption target</th>
              {comparison.scenarios.map((scenario) => (
                <td key={scenario.id}>
                  {disruptionLabels[scenario.disruption.type]} ·{' '}
                  {scenario.disruptedFacilityName}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Duration</th>
              {comparison.scenarios.map((scenario) => (
                <td key={scenario.id}>
                  {scenario.disruption.durationDays} days
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Mitigation</th>
              {comparison.scenarios.map((scenario) => (
                <td key={scenario.id}>{scenario.mitigationName}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Service level</th>
              {comparison.scenarios.map((scenario) =>
                metricCell(
                  scenario,
                  'serviceLevel',
                  `${scenario.snapshot.kpis.serviceLevel}%`,
                  signed(
                    scenario.snapshot.kpis.serviceLevel -
                      reference.snapshot.kpis.serviceLevel,
                    ' pp',
                  ),
                ),
              )}
            </tr>
            <tr>
              <th scope="row">Average lead time</th>
              {comparison.scenarios.map((scenario) =>
                metricCell(
                  scenario,
                  'leadTime',
                  `${scenario.snapshot.kpis.leadTime} days`,
                  signed(
                    scenario.snapshot.kpis.leadTime -
                      reference.snapshot.kpis.leadTime,
                    ' days',
                  ),
                ),
              )}
            </tr>
            <tr>
              <th scope="row">Logistics cost</th>
              {comparison.scenarios.map((scenario) =>
                metricCell(
                  scenario,
                  'logisticsCost',
                  compactMoney.format(scenario.snapshot.kpis.logisticsCost),
                  signedMoney(
                    scenario.snapshot.kpis.logisticsCost -
                      reference.snapshot.kpis.logisticsCost,
                  ),
                ),
              )}
            </tr>
            <tr>
              <th scope="row">Facilities at risk</th>
              {comparison.scenarios.map((scenario) =>
                metricCell(
                  scenario,
                  'facilitiesAtRisk',
                  scenario.snapshot.kpis.facilitiesAtRisk.toLocaleString(),
                  signed(
                    scenario.snapshot.kpis.facilitiesAtRisk -
                      reference.snapshot.kpis.facilitiesAtRisk,
                    '',
                  ),
                ),
              )}
            </tr>
            <tr>
              <th scope="row">Earliest stockout</th>
              {comparison.scenarios.map((scenario) => {
                const stockout = scenarioStockoutComparison(scenario);
                return metricCell(
                  scenario,
                  'earliestStockout',
                  stockout.label,
                  'See timing',
                );
              })}
            </tr>
            <tr>
              <th scope="row">Projected stockouts</th>
              {comparison.scenarios.map((scenario) =>
                metricCell(
                  scenario,
                  'projectedStockouts',
                  scenario.snapshot.projectedStockouts.toLocaleString(),
                  signed(
                    scenario.snapshot.projectedStockouts -
                      reference.snapshot.projectedStockouts,
                    '',
                  ),
                ),
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
