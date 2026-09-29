'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  facilityTypes,
  transportModes,
  type SupplyNetwork,
} from '@/lib/networks';
import {
  createImportedNetwork,
  importName,
  type ImportPreview,
} from '@/lib/import/network-import';
import {
  readImportSource,
  previewMappedImport,
  suggestedMappings,
  type RawImportSource,
} from '@/lib/import/read-files';
import {
  importFields,
  isStandardMapping,
  mappingSummary,
  tableHeader,
  type ColumnMapping,
  type ImportTableKind,
} from '@/lib/import/import-mapping';
import { operationalCompleteness } from '@/lib/operations';
import { importNetworkBackup } from '@/lib/network-backup';

type ImportFormat = 'excel' | 'csv' | 'backup';
type ImportStep = 'upload' | 'sheets' | 'mapping' | 'preview';
const blankMapping = (): ColumnMapping => ({ fields: {}, confidence: {} });

export function NetworkImport({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (network: SupplyNetwork) => void;
}) {
  const [format, setFormat] = useState<ImportFormat>('excel');
  const [step, setStep] = useState<ImportStep>('upload');
  const [backup, setBackup] = useState<SupplyNetwork | null>(null);
  const [files, setFiles] = useState<(File | undefined)[]>([]);
  const [name, setName] = useState('');
  const [source, setSource] = useState<RawImportSource | null>(null);
  const [facilitySheet, setFacilitySheet] = useState('');
  const [routeSheet, setRouteSheet] = useState('');
  const [facilityMapping, setFacilityMapping] =
    useState<ColumnMapping>(blankMapping);
  const [routeMapping, setRouteMapping] = useState<ColumnMapping>(blankMapping);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resolvedName =
    name.trim() || importName(files[0]?.name ?? 'Imported Network');
  const errors =
    preview?.issues.filter((issue) => issue.severity === 'error') ?? [];
  const warnings =
    preview?.issues.filter((issue) => issue.severity === 'warning') ?? [];

  function reset(nextFormat: ImportFormat) {
    setFormat(nextFormat);
    setStep('upload');
    setBackup(null);
    setFiles([]);
    setSource(null);
    setFacilitySheet('');
    setRouteSheet('');
    setFacilityMapping(blankMapping());
    setRouteMapping(blankMapping());
    setPreview(null);
    setError('');
  }

  function bestSheet(
    raw: RawImportSource,
    kind: ImportTableKind,
    excluded = '',
  ) {
    const ranked = raw.sheets
      .filter((sheet) => sheet.name !== excluded)
      .map((sheet) => {
        const mapping =
          kind === 'facilities'
            ? suggestedMappings({ ...raw, sheets: [sheet] }, sheet.name, '')
                .facilities
            : suggestedMappings({ ...raw, sheets: [sheet] }, '', sheet.name)
                .routes;
        return {
          name: sheet.name,
          score: importFields(kind).filter(
            (field) =>
              field.required && mapping.fields[field.key] !== undefined,
          ).length,
        };
      })
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.score ? ranked[0].name : '';
  }

  function setMappings(
    raw: RawImportSource,
    facilities: string,
    routes: string,
  ) {
    const mappings = suggestedMappings(raw, facilities, routes);
    setFacilityMapping(mappings.facilities);
    setRouteMapping(mappings.routes);
    return mappings;
  }

  function createPreview(
    raw: RawImportSource,
    facilities: string,
    routes: string,
    mappings: { facilities: ColumnMapping; routes: ColumnMapping },
  ) {
    setPreview(
      previewMappedImport(
        raw,
        facilities,
        routes,
        mappings.facilities,
        mappings.routes,
      ),
    );
    setStep('preview');
  }

  async function continueFromUpload() {
    setBusy(true);
    setError('');
    setPreview(null);
    setBackup(null);
    try {
      if (format === 'backup') {
        const file = files[0];
        if (
          !file ||
          !file.name.toLowerCase().endsWith('.json') ||
          file.size > 10 * 1024 * 1024
        )
          throw new Error(
            'Choose a simulator JSON backup of 10 MB or smaller.',
          );
        setBackup(importNetworkBackup(await file.text(), crypto.randomUUID()));
        return;
      }
      const raw = await readImportSource(
        format,
        files.filter((file): file is File => !!file),
      );
      setSource(raw);
      let facilities = raw.facilitySheet ?? bestSheet(raw, 'facilities');
      let routes = raw.routeSheet ?? bestSheet(raw, 'routes', facilities);
      if (!facilities) facilities = bestSheet(raw, 'facilities', routes);
      setFacilitySheet(facilities);
      setRouteSheet(routes);
      if (format === 'excel' && !raw.standardSheets) {
        setStep('sheets');
        return;
      }
      const mappings = setMappings(raw, facilities, routes);
      if (
        isStandardMapping(mappings.facilities, 'facilities') &&
        isStandardMapping(mappings.routes, 'routes')
      )
        createPreview(raw, facilities, routes, mappings);
      else setStep('mapping');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The files could not be read. Check their format and upload again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function continueFromSheets() {
    if (!source || !facilitySheet || !routeSheet) {
      setError('Choose both a Facilities worksheet and a Routes worksheet.');
      return;
    }
    if (facilitySheet === routeSheet) {
      setError('Facilities and Routes must use different worksheets.');
      return;
    }
    setError('');
    setMappings(source, facilitySheet, routeSheet);
    setStep('mapping');
  }

  function validateMapping() {
    if (!source) return;
    const missing = [
      ...importFields('facilities')
        .filter(
          (field) =>
            field.required && facilityMapping.fields[field.key] === undefined,
        )
        .map((field) => field.label),
      ...importFields('routes')
        .filter(
          (field) =>
            field.required && routeMapping.fields[field.key] === undefined,
        )
        .map((field) => field.label),
    ];
    if (missing.length) {
      setError(`Map the required fields: ${missing.join(', ')}.`);
      return;
    }
    setError('');
    createPreview(source, facilitySheet, routeSheet, {
      facilities: facilityMapping,
      routes: routeMapping,
    });
  }

  function confirm() {
    if (!preview) return;
    try {
      onImport(
        createImportedNetwork(preview, crypto.randomUUID(), resolvedName),
      );
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Import could not be completed. Your current network is unchanged.',
      );
    }
  }

  function mappingPanel(
    kind: ImportTableKind,
    mapping: ColumnMapping,
    setMapping: (value: ColumnMapping) => void,
    sheetName: string,
  ) {
    const table =
      source?.sheets.find((sheet) => sheet.name === sheetName)?.data ?? [];
    const columns = tableHeader(table).columns;
    return (
      <section className="mapping-table" aria-label={`${kind} column mapping`}>
        <h3>{kind === 'facilities' ? 'Facility columns' : 'Route columns'}</h3>
        <p>TwinChain field → uploaded column</p>
        {importFields(kind).map((field) => {
          const selected = mapping.fields[field.key];
          const confidence =
            selected === undefined
              ? 'unmapped'
              : (mapping.confidence[field.key] ?? 'exact');
          return (
            <label className="mapping-row" key={field.key}>
              <span>
                {field.label}
                <small>
                  {field.required ? 'Required' : `Optional · ${field.category}`}
                </small>
              </span>
              <select
                value={selected ?? ''}
                onChange={(event) => {
                  const value =
                    event.target.value === ''
                      ? undefined
                      : Number(event.target.value);
                  setMapping({
                    fields: { ...mapping.fields, [field.key]: value },
                    confidence: {
                      ...mapping.confidence,
                      [field.key]: value === undefined ? 'unmapped' : 'exact',
                    },
                  });
                  setPreview(null);
                  setError('');
                }}
              >
                <option value="">Unmapped / skip</option>
                {columns.map((column) => (
                  <option
                    value={column.index}
                    key={`${column.index}-${column.label}`}
                  >
                    {column.label}
                  </option>
                ))}
              </select>
              <em className={`mapping-confidence ${confidence}`}>
                {confidence === 'exact'
                  ? 'Strong match'
                  : confidence === 'suggested'
                    ? 'Suggested'
                    : 'Unmapped'}
              </em>
            </label>
          );
        })}
      </section>
    );
  }

  const facilitySummary = mappingSummary('facilities', facilityMapping.fields);
  const routeSummary = mappingSummary('routes', routeMapping.fields);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="network-import-dialog">
        <DialogTitle>Import a supply chain network</DialogTitle>
        <DialogDescription>
          Upload your data, map its columns when needed, then validate before
          creating an editable network. Files stay in your browser.
        </DialogDescription>
        <ol className="import-steps" aria-label="Import progress">
          {['Upload', 'Select sheets', 'Map columns', 'Preview & validate'].map(
            (label, index) => {
              const active = ['upload', 'sheets', 'mapping', 'preview'].indexOf(
                step,
              );
              return (
                <li
                  className={
                    index === active
                      ? 'active'
                      : index < active
                        ? 'complete'
                        : ''
                  }
                  key={label}
                >
                  {label}
                </li>
              );
            },
          )}
        </ol>

        {step === 'upload' && (
          <>
            <div
              className="mode-switch"
              role="group"
              aria-label="Import format"
            >
              {(
                [
                  ['backup', 'JSON backup'],
                  ['excel', 'Excel workbook'],
                  ['csv', 'Two CSV files'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  variant="ghost"
                  aria-pressed={format === value}
                  disabled={busy}
                  onClick={() => format !== value && reset(value)}
                  key={value}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p>
              {format === 'backup'
                ? 'Restore an exported simulator JSON backup as a new Custom Network.'
                : format === 'excel'
                  ? 'TwinChain detects standard sheets and helps map other workbook layouts.'
                  : 'Choose separate Facilities and Routes CSV files; custom headers can be mapped.'}{' '}
              Latitude and longitude are required. Up to 2,000 facilities,
              10,000 routes, and 10 MB per file.
            </p>
            <div className="import-files" key={format}>
              {(format === 'backup'
                ? ['Network JSON backup']
                : format === 'excel'
                  ? ['Excel workbook file']
                  : ['Facilities CSV', 'Routes CSV']
              ).map((label, index) => (
                <label className="builder-field" key={label}>
                  {label}
                  <input
                    type="file"
                    accept={
                      format === 'backup'
                        ? '.json'
                        : format === 'excel'
                          ? '.xlsx'
                          : '.csv'
                    }
                    disabled={busy}
                    onChange={(event) => {
                      setFiles((current) => {
                        const next = [...current];
                        next[index] = event.target.files?.[0];
                        return next;
                      });
                      setPreview(null);
                      setBackup(null);
                      setSource(null);
                      setError('');
                    }}
                  />
                </label>
              ))}
            </div>
            <label className="builder-field">
              Imported network name
              <input
                value={name}
                maxLength={160}
                placeholder={importName(files[0]?.name ?? 'Imported Network')}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className="import-templates">
              <p>
                Standard templates import directly; operational columns remain
                optional.
              </p>
              <span>CSV templates:</span>{' '}
              <a href="/templates/facilities.csv" download>
                Facilities template
              </a>
              <a href="/templates/routes.csv" download>
                Routes template
              </a>
            </div>
            <Button
              variant="outline"
              disabled={busy || !files[0] || (format === 'csv' && !files[1])}
              onClick={continueFromUpload}
            >
              {busy
                ? 'Reading files…'
                : format === 'backup'
                  ? 'Preview backup'
                  : 'Continue'}
            </Button>
          </>
        )}

        {step === 'sheets' && source && (
          <section className="sheet-selection">
            <h3>Select workbook sheets</h3>
            <p>
              TwinChain found {source.sheets.length} sheets. Confirm which two
              contain the network tables.
            </p>
            <label className="builder-field">
              Facilities worksheet
              <select
                value={facilitySheet}
                onChange={(event) => setFacilitySheet(event.target.value)}
              >
                <option value="">Choose a sheet</option>
                {source.sheets.map((sheet) => (
                  <option key={sheet.name}>{sheet.name}</option>
                ))}
              </select>
            </label>
            <label className="builder-field">
              Routes worksheet
              <select
                value={routeSheet}
                onChange={(event) => setRouteSheet(event.target.value)}
              >
                <option value="">Choose a sheet</option>
                {source.sheets.map((sheet) => (
                  <option key={sheet.name}>{sheet.name}</option>
                ))}
              </select>
            </label>
            <div className="import-navigation">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={continueFromSheets}>Map columns</Button>
            </div>
          </section>
        )}

        {step === 'mapping' && source && (
          <>
            <div className="mapping-intro">
              <h3>Review column mappings</h3>
              <p>
                Required fields must be mapped. Suggested matches are
                deterministic and can be changed.
              </p>
            </div>
            <div className="mapping-grid">
              {mappingPanel(
                'facilities',
                facilityMapping,
                setFacilityMapping,
                facilitySheet,
              )}
              {mappingPanel(
                'routes',
                routeMapping,
                setRouteMapping,
                routeSheet,
              )}
            </div>
            <div className="import-navigation">
              <Button
                variant="ghost"
                onClick={() =>
                  setStep(
                    format === 'excel' && !source.standardSheets
                      ? 'sheets'
                      : 'upload',
                  )
                }
              >
                Back
              </Button>
              <Button onClick={validateMapping}>Preview & validate</Button>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="builder-error">
            {error}
          </p>
        )}

        {backup && (
          <section className="import-preview" aria-label="Backup preview">
            <h3>{name.trim() || backup.name}</h3>
            <p>
              {backup.facilities.length} facilities · {backup.routes.length}{' '}
              routes. Restoring creates a new network and preserves existing
              networks.
            </p>
            <Button
              onClick={() => {
                try {
                  onImport({
                    ...backup,
                    name: name.trim() || backup.name,
                  });
                  onClose();
                } catch {
                  setError(
                    'The backup could not be restored. Check the network name and try again.',
                  );
                }
              }}
            >
              Restore Network Backup
            </Button>
          </section>
        )}

        {step === 'preview' && preview && (
          <section
            className="import-preview"
            aria-label="Import preview"
            aria-live="polite"
          >
            <h3>{resolvedName}</h3>
            <p>
              {operationalCompleteness(preview).facilities} facilities and{' '}
              {operationalCompleteness(preview).routes} routes include
              operational data.
            </p>
            <p>
              <strong>
                {preview.facilityRows} facilities detected · {preview.routeRows}{' '}
                routes detected
              </strong>
            </p>
            <p>
              {facilitySummary.mapped + routeSummary.mapped} fields mapped ·{' '}
              {facilitySummary.unmappedOptional + routeSummary.unmappedOptional}{' '}
              optional fields unmapped
            </p>
            <p className={errors.length ? 'builder-error' : 'import-valid'}>
              {errors.length
                ? `${errors.length} errors — import blocked`
                : `Ready to import${warnings.length ? ` with ${warnings.length} warnings` : ''}`}
            </p>
            <dl className="import-breakdown">
              <div>
                <dt>Facility types (valid rows)</dt>
                <dd>
                  {facilityTypes
                    .map(
                      (type) =>
                        [
                          type,
                          preview.facilities.filter(
                            (facility) => facility.type === type,
                          ).length,
                        ] as const,
                    )
                    .filter(([, count]) => count)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join(' · ') || 'None'}
                </dd>
              </div>
              <div>
                <dt>Transportation modes (valid rows)</dt>
                <dd>
                  {transportModes
                    .map(
                      (mode) =>
                        [
                          mode,
                          preview.routes.filter((route) => route.mode === mode)
                            .length,
                        ] as const,
                    )
                    .filter(([, count]) => count)
                    .map(([mode, count]) => `${mode}: ${count}`)
                    .join(' · ') || 'None'}
                </dd>
              </div>
            </dl>
            {!!preview.issues.length && (
              <ul className="import-issues">
                {[...errors, ...warnings].slice(0, 100).map((issue, index) => (
                  <li key={index} className={issue.severity}>
                    <strong>
                      {issue.severity === 'error' ? 'Error' : 'Warning'} ·{' '}
                      {issue.table}
                      {issue.row ? ` — Row ${issue.row}` : ''} — {issue.field}:
                    </strong>{' '}
                    {issue.message}
                  </li>
                ))}
                {preview.issues.length > 100 && (
                  <li>
                    Showing the first 100 issues. Correct these and validate
                    again.
                  </li>
                )}
              </ul>
            )}
            <p>
              Import creates a new network. Your current network remains
              unchanged.
            </p>
            <div className="import-navigation">
              <Button variant="ghost" onClick={() => setStep('mapping')}>
                Back to mappings
              </Button>
              <Button disabled={!!errors.length || busy} onClick={confirm}>
                Import Network
              </Button>
            </div>
          </section>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
