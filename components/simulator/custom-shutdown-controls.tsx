import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Facility, Route } from '@/lib/data/network';
import { disruptionLabels, type Disruption } from '@/lib/simulation/disruption';
import type { SimulationResult } from '@/lib/simulation/model';

export function CustomDisruptionControls({
  facilities,
  routes,
  selected,
  onSelect,
  result,
  running,
  onRun,
  onReset,
}: {
  facilities: Facility[];
  routes: Route[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  result: SimulationResult;
  running: Disruption | null;
  onRun: (input: Disruption) => void;
  onReset: () => void;
}) {
  const [type, setType] = useState<Disruption['type']>('facility-shutdown');
  const [duration, setDuration] = useState('14');
  const [routeId, setRouteId] = useState('');
  const [remaining, setRemaining] = useState('50');
  useEffect(() => {
    if (!running) return;
    setType(running.type);
    setDuration(String(running.durationDays));
    if (running.type === 'route-closure') setRouteId(running.routeId);
    if (running.type === 'capacity-reduction')
      setRemaining(String(running.remainingCapacityPercent));
  }, [running]);
  const days = Number(duration);
  const capacity = Number(remaining);
  const validDays = Number.isInteger(days) && days >= 1 && days <= 90;
  const validFacility = facilities.some((f) => f.id === selected);
  const validRoute = routes.some((r) => r.id === routeId);
  const validCapacity =
    Number.isFinite(capacity) && capacity >= 0 && capacity <= 100;
  const ready =
    validDays &&
    (type === 'route-closure' ? validRoute : validFacility) &&
    (type !== 'capacity-reduction' || validCapacity);
  const name = (id: string) => facilities.find((f) => f.id === id)?.name ?? id;
  return (
    <aside
      className="scenario-panel custom-simulation"
      aria-label="Disruption controls"
    >
      <div className="eyebrow">CUSTOM SCENARIO</div>
      <h2>{disruptionLabels[type]}</h2>
      <p>
        Choose a disruption and target. Results use the network and its
        available inventory data.
      </p>
      <label className="builder-field">
        Disruption type
        <select
          value={type}
          onChange={(event) =>
            setType(event.target.value as Disruption['type'])
          }
        >
          {Object.entries(disruptionLabels).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {type === 'route-closure' ? (
        <label className="builder-field">
          Route to close
          <select
            value={routeId}
            onChange={(event) => setRouteId(event.target.value)}
            disabled={!routes.length}
          >
            <option value="">Select a route</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {name(route.from)} → {name(route.to)} ({route.mode})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="builder-field">
          {type === 'facility-shutdown'
            ? 'Shutdown facility'
            : type === 'shipment-delay'
              ? 'Delayed facility / outbound flow'
              : 'Reduced-capacity facility'}
          <select
            value={validFacility ? selected! : ''}
            onChange={(event) => onSelect(event.target.value || null)}
            disabled={!facilities.length}
          >
            <option value="">Select a facility</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="builder-field">
        {type === 'shipment-delay'
          ? 'Additional delay (days)'
          : 'Disruption duration (days)'}
        <input
          type="number"
          min="1"
          max="90"
          step="1"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </label>
      {type === 'capacity-reduction' && (
        <label className="builder-field">
          Remaining capacity (%)
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={remaining}
            onChange={(event) => setRemaining(event.target.value)}
          />
          <small>100% is normal operation; 0% leaves no capacity.</small>
        </label>
      )}
      <Button
        disabled={!ready}
        onClick={() => {
          const input: Disruption =
            type === 'route-closure'
              ? { type, routeId, durationDays: days }
              : type === 'capacity-reduction'
                ? {
                    type,
                    facilityId: selected!,
                    durationDays: days,
                    remainingCapacityPercent: capacity,
                  }
                : { type, facilityId: selected!, durationDays: days };
          onRun(input);
        }}
      >
        Run disruption
      </Button>
      <Button variant="outline" disabled={!result.active} onClick={onReset}>
        Reset to baseline
      </Button>
      <div role="status">
        {running && result.active ? (
          <p>
            <strong>{disruptionLabels[running.type]}</strong> ·{' '}
            {running.durationDays} days · {result.atRiskFacilityIds.length}{' '}
            {result.atRiskFacilityIds.length === 1 ? 'facility' : 'facilities'}{' '}
            at risk · {result.blockedRouteIds.length} blocked routes ·{' '}
            {result.affectedRouteIds.length} affected routes.
          </p>
        ) : (
          <p>Network operating normally.</p>
        )}
      </div>
      <p>
        {type === 'shipment-delay'
          ? `Flow resumes after Day ${duration || '—'}; no shipment-level schedule is modeled.`
          : type === 'route-closure'
            ? 'Only the selected route closes. No automatic rerouting.'
            : type === 'capacity-reduction'
              ? 'Remaining capacity sets the available share; 100% leaves flow unchanged.'
              : 'The selected facility and its incident routes close for the duration.'}
      </p>
    </aside>
  );
}
