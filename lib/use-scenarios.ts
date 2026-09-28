'use client';
import { useEffect, useRef, useState } from 'react';
import {
  addSavedScenario,
  emptyScenarioLibrary,
  parseScenarioLibrary,
  removeSavedScenario,
  SCENARIO_STORAGE_KEY,
  serializeScenarioLibrary,
  type SavedScenario,
  type SavedScenarioLibrary,
} from './scenarios';

export function useScenarios() {
  const [saved, setSaved] =
    useState<SavedScenarioLibrary>(emptyScenarioLibrary);
  const current = useRef(saved);
  const [ready, setReady] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCENARIO_STORAGE_KEY);
      if (raw) {
        const parsed = parseScenarioLibrary(raw);
        current.current = parsed;
        setSaved(parsed);
      }
    } catch {
      setCanSave(false);
      setStorageError(
        'Scenario history could not be read. Existing browser data is untouched; new scenarios cannot be saved in this session.',
      );
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !canSave) return;
    try {
      localStorage.setItem(
        SCENARIO_STORAGE_KEY,
        serializeScenarioLibrary(saved),
      );
      setStorageError('');
    } catch {
      setStorageError(
        'Scenario history could not be saved. Keep this page open and check browser storage settings.',
      );
    }
  }, [saved, ready, canSave]);

  return {
    scenarios: saved.scenarios,
    ready,
    canSave,
    storageError,
    save(scenario: SavedScenario) {
      const next = addSavedScenario(current.current, scenario);
      current.current = next;
      setSaved(next);
    },
    remove(id: string) {
      const next = removeSavedScenario(current.current, id);
      current.current = next;
      setSaved(next);
    },
  };
}
