import { useState } from 'react';
import { Plus, Route as RouteIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  facilityTypes,
  transportModes,
  type SupplyNetwork,
} from '@/lib/networks';
import type { Facility, Route } from '@/lib/data/network';
import type { NetworkBuilder } from '@/lib/use-network-builder';
import { OperationsEditor } from './operational-data';

function TextEdit({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="builder-field">
      {label}
      <input
        value={draft}
        maxLength={160}
        aria-invalid={required && !draft.trim()}
        onChange={(event) => {
          setDraft(event.target.value);
          if (!required || event.target.value.trim())
            onChange(event.target.value);
        }}
        onBlur={() => {
          if (required && !draft.trim()) setDraft(value);
        }}
      />
      {required && !draft.trim() && (
        <small>
          A name is required; the previous name is kept until entered.
        </small>
      )}
    </label>
  );
}
function FacilityEditor({
  facility,
  builder,
}: {
  facility: Facility;
  builder: NetworkBuilder;
}) {
  return (
    <div className="builder-editor">
      <h3>Edit facility</h3>
      <TextEdit
        label="Facility name"
        value={facility.name}
        required
        onChange={(name) =>
          builder.apply({
            type: 'edit-facility',
            id: facility.id,
            changes: { name },
          })
        }
      />
      <label className="builder-field">
        Facility type
        <select
          value={facility.type}
          onChange={(event) =>
            builder.apply({
              type: 'edit-facility',
              id: facility.id,
              changes: { type: event.target.value as Facility['type'] },
            })
          }
        >
          {facilityTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <TextEdit
        label="Location label"
        value={facility.region}
        onChange={(region) =>
          builder.apply({
            type: 'edit-facility',
            id: facility.id,
            changes: { region },
          })
        }
      />
      <p className="coordinate-label">
        {facility.latitude.toFixed(3)}°, {facility.longitude.toFixed(3)}° ·
        Operational
      </p>
      <OperationsEditor
        kind="facility"
        data={facility}
        onChange={(changes) =>
          builder.apply({ type: 'edit-facility', id: facility.id, changes })
        }
      />
      <Button variant="outline" onClick={builder.startMove}>
        Move on map
      </Button>
      <Button
        variant="ghost"
        className="builder-danger"
        onClick={() => builder.setDeleting(true)}
      >
        Delete facility
      </Button>
    </div>
  );
}
function RouteEditor({
  route,
  network,
  builder,
}: {
  route: Route;
  network: SupplyNetwork;
  builder: NetworkBuilder;
}) {
  return (
    <div className="builder-editor">
      <h3>Edit route</h3>
      {(['from', 'to'] as const).map((field) => (
        <label className="builder-field" key={field}>
          {field === 'from' ? 'Origin facility' : 'Destination facility'}
          <select
            value={route[field]}
            onChange={(event) =>
              builder.apply({
                type: 'edit-route',
                id: route.id,
                changes: { [field]: event.target.value },
              })
            }
          >
            {network.facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="builder-field">
        Transportation mode
        <select
          value={route.mode}
          onChange={(event) =>
            builder.apply({
              type: 'edit-route',
              id: route.id,
              changes: { mode: event.target.value as Route['mode'] },
            })
          }
        >
          {transportModes.map((mode) => (
            <option key={mode}>{mode}</option>
          ))}
        </select>
      </label>
      <Button
        variant="ghost"
        className="builder-danger"
        onClick={() => builder.setDeleting(true)}
      >
        Delete route
      </Button>
      <OperationsEditor
        kind="route"
        data={route}
        onChange={(changes) =>
          builder.apply({ type: 'edit-route', id: route.id, changes })
        }
      />
    </div>
  );
}
export function NetworkBuilderPanel({
  network,
  builder,
  onCreate,
}: {
  network: SupplyNetwork;
  builder: NetworkBuilder;
  onCreate: () => void;
}) {
  const name = (id: string | null) =>
    network.facilities.find((f) => f.id === id)?.name ?? 'Choose on map';
  if (network.kind === 'demo')
    return (
      <aside className="scenario-panel builder-panel">
        <h2>Demo Network</h2>
        <p>
          This example is read-only. Create a custom network to start building,
          or switch to Simulate to stress-test the demo.
        </p>
        <Button onClick={onCreate}>Create New Network</Button>
      </aside>
    );
  const connected = network.routes.filter(
    (r) => r.from === builder.facility?.id || r.to === builder.facility?.id,
  ).length;
  return (
    <aside
      className="scenario-panel builder-panel"
      aria-label="Network builder"
    >
      <h2>Build your supply chain</h2>
      <p className="builder-intro">Place facilities, then connect the flow.</p>
      <div className="builder-actions">
        <Button onClick={builder.startAdd}>
          <Plus size={15} />
          Add Facility
        </Button>
        <Button
          variant="outline"
          onClick={builder.startRoute}
          disabled={network.facilities.length < 2}
        >
          <RouteIcon size={15} />
          Create Route
        </Button>
      </div>
      <p className="builder-state" role="status">
        {builder.prompt}
      </p>
      {builder.operation !== 'idle' && (
        <Button variant="ghost" onClick={builder.cancel}>
          <X size={14} />
          Cancel · Esc
        </Button>
      )}
      {builder.operation === 'add' && (
        <label className="builder-field">
          New facility type
          <select
            value={builder.facilityType}
            onChange={(event) =>
              builder.setFacilityType(event.target.value as Facility['type'])
            }
          >
            {facilityTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      )}
      {builder.operation === 'route' && (
        <div className="route-draft">
          <p>
            <strong>Origin</strong> {name(builder.origin)}
          </p>
          <p>
            <strong>Destination</strong> {name(builder.destination)}
          </p>
          <label className="builder-field">
            New route mode
            <select
              value={builder.transport}
              onChange={(event) =>
                builder.setTransport(event.target.value as Route['mode'])
              }
            >
              {transportModes.map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
          </label>
          <Button
            onClick={builder.confirmRoute}
            disabled={!builder.origin || !builder.destination}
          >
            Confirm route
          </Button>
        </div>
      )}
      {builder.error && (
        <p className="builder-error" role="alert">
          {builder.error}
        </p>
      )}
      {builder.operation === 'idle' && builder.facility && (
        <FacilityEditor
          key={builder.facility.id}
          facility={builder.facility}
          builder={builder}
        />
      )}
      {builder.operation === 'idle' && builder.route && (
        <RouteEditor
          key={builder.route.id}
          route={builder.route}
          network={network}
          builder={builder}
        />
      )}
      <details className="builder-inventory">
        <summary>
          Facilities ({network.facilities.length}) · Routes (
          {network.routes.length})
        </summary>
        <div>
          {network.facilities.map((f) => (
            <button
              type="button"
              key={f.id}
              onClick={() => builder.selectFacility(f.id)}
            >
              {f.name}
              <small>{f.type}</small>
            </button>
          ))}
          {network.routes.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => builder.selectRoute(r.id)}
            >
              {name(r.from)} → {name(r.to)}
              <small>{r.mode}</small>
            </button>
          ))}
        </div>
      </details>
      <AlertDialog open={builder.deleting} onOpenChange={builder.setDeleting}>
        <AlertDialogContent className="builder-confirm">
          <AlertDialogTitle>
            Delete {builder.facility ? 'facility' : 'route'}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {builder.facility
              ? `${builder.facility.name} and ${connected} connected ${connected === 1 ? 'route' : 'routes'} will be removed.`
              : 'This directional connection will be removed.'}{' '}
            This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="builder-danger"
              onClick={builder.deleteSelected}
            >
              Confirm deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
export function NetworkName({
  network,
  onRename,
}: {
  network: SupplyNetwork;
  onRename: (name: string) => void;
}) {
  return (
    <TextEdit
      label="Network name"
      value={network.name}
      required
      onChange={onRename}
    />
  );
}
