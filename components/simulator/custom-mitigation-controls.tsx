import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  applyCustomMitigation,
  customStrategyNames,
  expediteTargets,
  mitigationSummary,
  rerouteOptions,
  type CustomMitigation,
} from '@/lib/simulation/custom-mitigation';
import type { StrategyId } from '@/lib/simulation/mitigation';
import type { SimulationResult } from '@/lib/simulation/model';

export function CustomMitigationControls({
  original,
  result,
  choice,
  onApply,
}: {
  original: SimulationResult;
  result: SimulationResult;
  choice: CustomMitigation;
  onApply: (choice: CustomMitigation) => void;
}) {
  const [draft, setDraft] = useState<StrategyId>('do-nothing');
  const [route, setRoute] = useState('');
  const [alternate, setAlternate] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const targets = expediteTargets(original);
  const flows = original.routes.filter(
    (r) => r.status !== 'operational' && targets.some((f) => f.id === r.to),
  );
  const options = rerouteOptions(original, route);
  const name = (id: string) =>
    original.facilities.find((f) => f.id === id)?.name ?? id;
  const stockout = (r: SimulationResult) =>
    r.inventorySummary?.earliestStockoutDay === undefined
      ? 'None calculated'
      : `Day ${r.inventorySummary.earliestStockoutDay.toFixed(1)}`;
  const rows = [
    [
      'Service level',
      `${original.kpis.serviceLevel}%`,
      `${result.kpis.serviceLevel}%`,
    ],
    [
      'Lead time',
      `${original.kpis.leadTime} days`,
      `${result.kpis.leadTime} days`,
    ],
    [
      'Logistics cost',
      `$${original.kpis.logisticsCost.toLocaleString('en-US')}`,
      `$${result.kpis.logisticsCost.toLocaleString('en-US')}`,
    ],
    [
      'Facilities at risk',
      String(original.kpis.facilitiesAtRisk),
      String(result.kpis.facilitiesAtRisk),
    ],
    ['Earliest stockout', stockout(original), stockout(result)],
  ];
  return (
    <section
      className="custom-mitigation"
      aria-label="Custom network mitigation"
    >
      <h3>Mitigate this disruption</h3>
      <p>
        Choose an existing alternate connection or emergency supply. Each
        response starts from Do Nothing.
      </p>
      <label className="builder-field">
        Response
        <select
          value={draft}
          onChange={(e) => {
            const id = e.target.value as StrategyId;
            setDraft(id);
            setError('');
            onApply({ id: 'do-nothing' });
          }}
        >
          {Object.entries(customStrategyNames).map(([id, label]) => (
            <option value={id} key={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {draft === 'reroute' && (
        <>
          <label className="builder-field">
            Disrupted flow
            <select
              value={route}
              onChange={(e) => {
                setRoute(e.target.value);
                setAlternate('');
                setError('');
              }}
            >
              <option value="">Select a flow</option>
              {flows.map((r) => (
                <option key={r.id} value={r.id}>
                  {name(r.from)} → {name(r.to)}
                </option>
              ))}
            </select>
          </label>
          <label className="builder-field">
            Alternate connection
            <select
              value={alternate}
              onChange={(e) => setAlternate(e.target.value)}
            >
              <option value="">Select an existing connection</option>
              {options.map((r) => (
                <option key={r.id} value={r.id}>
                  {name(r.from)} → {name(r.to)} ({r.mode})
                </option>
              ))}
            </select>
          </label>
          {route && !options.length && (
            <p role="status">
              No alternate route is available for this disrupted flow. A healthy
              inbound connection to the same destination is required.
            </p>
          )}
        </>
      )}
      {draft === 'air-freight' && (
        <label className="builder-field">
          Expedite facility
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Select an affected facility</option>
            {targets.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {draft !== 'do-nothing' && (
        <Button
          onClick={() => {
            try {
              const next: CustomMitigation =
                draft === 'reroute'
                  ? { id: draft, routeId: route, alternateRouteId: alternate }
                  : { id: 'air-freight', facilityId: target };
              applyCustomMitigation(original, next);
              onApply(next);
              setError('');
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : 'Unable to calculate mitigation.',
              );
            }
          }}
        >
          Apply mitigation
        </Button>
      )}
      {error && (
        <p className="builder-error" role="alert">
          {error}
        </p>
      )}
      <p role="status">
        <strong>Applied: {customStrategyNames[choice.id]}.</strong>{' '}
        {mitigationSummary(choice)}
      </p>
      <details>
        <summary>Assumptions and limits</summary>
        <p>
          Only the selected facility receives recovery; no automatic downstream
          reallocation. Reroute uses spare capacity after existing flow, or
          restores half the selected flow’s share when capacity is missing.
          Missing demand uses 100 units/day; missing transit uses 3 days.
          Reroute adds 1.5 × cost per shipment × closure days (one added
          shipment/day, $500 fallback). Expedite restores 80% of missing supply,
          retains 20% of delay, and costs $32 per added unit. Missing inventory
          stays “No data”; no stockout protection is invented. Estimates assume
          recovery from Day 0.
        </p>
      </details>
      <div className="comparison-scroll">
        <table>
          <caption>
            Same disruption: Do Nothing vs applied response. “None calculated”
            may include missing inventory data.
          </caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Do Nothing</th>
              <th scope="col">{customStrategyNames[choice.id]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, before, after]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{before}</td>
                <td>{after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
