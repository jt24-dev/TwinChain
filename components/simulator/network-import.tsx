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
import { readImportFiles } from '@/lib/import/read-files';
import { operationalCompleteness } from '@/lib/operations';
import { importNetworkBackup } from '@/lib/network-backup';

export function NetworkImport({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (network: SupplyNetwork) => void;
}) {
  const [format, setFormat] = useState<'excel' | 'csv' | 'backup'>('excel');
  const [backup, setBackup] = useState<SupplyNetwork | null>(null);
  const [files, setFiles] = useState<(File | undefined)[]>([]);
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resolvedName =
    name.trim() || importName(files[0]?.name ?? 'Imported Network');
  const errors = preview?.issues.filter((i) => i.severity === 'error') ?? [];
  const warnings =
    preview?.issues.filter((i) => i.severity === 'warning') ?? [];
  async function validate() {
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
      setPreview(
        await readImportFiles(
          format,
          files.filter((f): f is File => !!f),
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'The files could not be read. Check their format and upload again.',
      );
    } finally {
      setBusy(false);
    }
  }
  function confirm() {
    if (!preview) return;
    try {
      onImport(
        createImportedNetwork(preview, crypto.randomUUID(), resolvedName),
      );
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Import could not be completed. Your current network is unchanged.',
      );
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="network-import-dialog">
        <DialogTitle>Import a supply chain network</DialogTitle>
        <DialogDescription>
          Upload data, review issues, then create an editable custom network.
          Files stay in your browser.
        </DialogDescription>
        <div className="mode-switch" role="group" aria-label="Import format">
          <Button
            variant="ghost"
            aria-pressed={format === 'backup'}
            disabled={busy}
            onClick={() => {
              setFormat('backup');
              setFiles([]);
              setPreview(null);
              setBackup(null);
              setError('');
            }}
          >
            JSON backup
          </Button>
          <Button
            variant="ghost"
            aria-pressed={format === 'excel'}
            disabled={busy}
            onClick={() => {
              if (format === 'excel') return;
              setFormat('excel');
              setBackup(null);
              setFiles([]);
              setPreview(null);
              setError('');
            }}
          >
            Excel workbook
          </Button>
          <Button
            variant="ghost"
            aria-pressed={format === 'csv'}
            disabled={busy}
            onClick={() => {
              if (format === 'csv') return;
              setFormat('csv');
              setBackup(null);
              setFiles([]);
              setPreview(null);
              setError('');
            }}
          >
            Two CSV files
          </Button>
        </div>
        <p>
          {format === 'backup'
            ? 'Restore an exported simulator JSON backup as a new Custom Network.'
            : format === 'excel'
              ? 'Use Facilities and Routes worksheets (names are case-insensitive).'
              : 'Choose separate comma-separated Facilities and Routes files.'}{' '}
          Latitude and longitude are required. Up to 2,000 facilities, 10,000
          routes, and 10 MB per file.
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
                onChange={(e) => {
                  setFiles((current) => {
                    const next = [...current];
                    next[index] = e.target.files?.[0];
                    return next;
                  });
                  setPreview(null);
                  setBackup(null);
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
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="import-templates">
          <p>
            Only topology columns are required. Operational columns in the
            templates are optional; blank cells stay unset.
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
          onClick={validate}
        >
          {busy ? 'Reading and validating…' : 'Validate and preview'}
        </Button>
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
                  onImport({ ...backup, name: name.trim() || backup.name });
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
        {preview && (
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
                      (t) =>
                        [
                          t,
                          preview.facilities.filter((f) => f.type === t).length,
                        ] as const,
                    )
                    .filter(([, n]) => n)
                    .map(([t, n]) => `${t}: ${n}`)
                    .join(' · ') || 'None'}
                </dd>
              </div>
              <div>
                <dt>Transportation modes (valid rows)</dt>
                <dd>
                  {transportModes
                    .map(
                      (t) =>
                        [
                          t,
                          preview.routes.filter((r) => r.mode === t).length,
                        ] as const,
                    )
                    .filter(([, n]) => n)
                    .map(([t, n]) => `${t}: ${n}`)
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
            <Button disabled={!!errors.length || busy} onClick={confirm}>
              Import Network
            </Button>
          </section>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
