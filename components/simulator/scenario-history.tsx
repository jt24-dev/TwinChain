import { useEffect, useState } from 'react';
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

  useEffect(() => {
    setName(defaultName);
    setError('');
  }, [defaultName]);

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
      <details className="scenario-history-list" open>
        <summary>Saved scenarios</summary>
        {scenarios.length ? (
          <ul>
            {scenarios.map((scenario) => (
              <li key={scenario.id}>
                <div className="scenario-history-primary">
                  <strong>{scenario.name}</strong>
                  <span>
                    {scenario.networkName} · {scenario.disruptedFacilityName} ·{' '}
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
