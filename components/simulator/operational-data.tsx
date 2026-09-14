import { useState } from 'react';
import {
  criticalities,
  facilityOperationFields,
  routeOperationFields,
  numericOperation,
  inventoryCoverage,
  type FacilityOperations,
  type RouteOperations,
  type OperationField,
} from '@/lib/operations';

function NumericField({
  field,
  value,
  onChange,
}: {
  field: OperationField;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const [error, setError] = useState('');
  return (
    <label className="builder-field">
      {field.label} ({field.unit})
      <input
        inputMode="decimal"
        value={draft}
        placeholder="Not set"
        aria-invalid={!!error}
        onChange={(e) => {
          setDraft(e.target.value);
          try {
            const next = numericOperation(e.target.value, field);
            setError('');
            onChange(next);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
      {error && (
        <small role="alert">{error} Previous saved value is unchanged.</small>
      )}
    </label>
  );
}
export function OperationsEditor({
  kind,
  data,
  onChange,
}: {
  kind: 'facility' | 'route';
  data: FacilityOperations | RouteOperations;
  onChange: (changes: FacilityOperations & RouteOperations) => void;
}) {
  return (
    <details className="operations-editor">
      <summary>Operational Data · optional</summary>
      <p>
        {kind === 'facility'
          ? 'Generic units. Inventory and daily demand inform stockout projections; other facility fields remain metadata.'
          : 'Generic units. Comparable route capacities can weight supply availability; other route fields remain metadata.'}
      </p>
      {(kind === 'facility'
        ? facilityOperationFields
        : routeOperationFields
      ).map((field) => (
        <NumericField
          key={field.key}
          field={field}
          value={(data as Record<string, number | undefined>)[field.key]}
          onChange={(value) => onChange({ [field.key]: value })}
        />
      ))}
      {kind === 'facility' && (
        <label className="builder-field">
          Criticality
          <select
            value={(data as FacilityOperations).criticality ?? ''}
            onChange={(e) =>
              onChange({
                criticality: (e.target.value ||
                  undefined) as FacilityOperations['criticality'],
              })
            }
          >
            <option value="">Not set</option>
            {criticalities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
      {kind === 'facility' &&
        inventoryCoverage(data as FacilityOperations) !== undefined && (
          <p>
            Inventory coverage:{' '}
            {inventoryCoverage(data as FacilityOperations)!.toFixed(1)} days ·
            at full daily demand
          </p>
        )}
    </details>
  );
}
export function OperationsDetails({
  kind,
  data,
}: {
  kind: 'facility' | 'route';
  data: FacilityOperations | RouteOperations;
}) {
  const fields = (
    kind === 'facility' ? facilityOperationFields : routeOperationFields
  ).filter((f) => (data as Record<string, unknown>)[f.key] !== undefined);
  const criticality =
    kind === 'facility' ? (data as FacilityOperations).criticality : undefined;
  const coverage =
    kind === 'facility'
      ? inventoryCoverage(data as FacilityOperations)
      : undefined;
  if (!fields.length && !criticality)
    return <p className="operations-empty">Operational data not set.</p>;
  return (
    <details className="operations-details" open>
      <summary>Operations</summary>
      <dl>
        {fields.map((f) => (
          <div key={f.key}>
            <dt>{f.label}</dt>
            <dd>
              {Number((data as Record<string, unknown>)[f.key]).toLocaleString(
                'en-US',
                { maximumFractionDigits: 4 },
              )}{' '}
              {f.unit}
            </dd>
          </div>
        ))}
        {criticality && (
          <div>
            <dt>Criticality</dt>
            <dd>{criticality}</dd>
          </div>
        )}
        {coverage !== undefined && (
          <div>
            <dt>Inventory coverage</dt>
            <dd>{coverage.toFixed(1)} days</dd>
          </div>
        )}
      </dl>
      <p>Stored operational data · generic units</p>
    </details>
  );
}
