import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Facility } from '@/lib/data/network';
import type { FacilityShutdown } from '@/lib/simulation/facility-shutdown';
import type { SimulationResult } from '@/lib/simulation/model';

export function CustomShutdownControls({
  facilities,
  selected,
  onSelect,
  result,
  running,
  onRun,
  onReset,
}: {
  facilities: Facility[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  result: SimulationResult;
  running: FacilityShutdown | null;
  onRun: (input: FacilityShutdown) => void;
  onReset: () => void;
}) {
  const [duration, setDuration] = useState('14');
  const days = Number(duration);
  const valid = Number.isInteger(days) && days >= 1 && days <= 90;
  const validSelection = facilities.some(f => f.id === selected);
  return (
    <aside
      className="scenario-panel custom-simulation"
      aria-label="Facility shutdown controls"
    >
      <div className="eyebrow">CUSTOM SCENARIO</div>
      <h2>Facility Shutdown</h2>
      <p>Select a facility on the map or below, then run a shutdown.</p>
      <label className="builder-field">
        Shutdown facility
        <select
          value={validSelection ? selected! : ''}
          onChange={(e) => onSelect(e.target.value || null)}
          disabled={!facilities.length}
        >
          <option value="">Select a facility</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label className="builder-field">
        Shutdown duration
        <select value={duration} onChange={(e) => setDuration(e.target.value)}>
          {[7, 14, 21, 30, 60, 90].map((n) => (
            <option key={n} value={n}>
              {n} days
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={!validSelection || !valid}
        onClick={() =>
          onRun({
            type: 'facility-shutdown',
            facilityId: selected!,
            durationDays: days,
          })
        }
      >
        Run shutdown
      </Button>
      <Button variant="outline" disabled={!result.active} onClick={onReset}>
        Reset to baseline
      </Button>
      <div role="status">
        {!facilities.length ? (
          <p>Add at least one facility in Build mode to run a shutdown.</p>
        ) : running ? (
          <>
            <p>
              <strong>
                {facilities.find((f) => f.id === running.facilityId)?.name}
              </strong>{' '}
              · {running.durationDays}-day shutdown
            </p>
            <p>
              {result.atRiskFacilityIds.length
                ? `${result.atRiskFacilityIds.length} downstream facilities at risk · ${result.blockedRouteIds.length} blocked routes · ${result.affectedRouteIds.length} affected routes.`
                : 'This facility has no downstream dependencies. The shutdown is localized to this node.'}
            </p>
          </>
        ) : (
          <p>Network operating normally.</p>
        )}
      </div>
      <p>
        Illustrative KPIs based on network size and calculated impact. Returning
        to Build clears the shutdown.
      </p>
      <p>Mitigation strategies are currently available on the Demo Network.</p>
    </aside>
  );
}
