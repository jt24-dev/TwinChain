'use client';
import { useEffect, useState } from 'react';
import { recoverSavedNetworks, deleteCustomNetwork } from './network-backup';
import {
  demoNetwork,
  createNetwork,
  editNetwork,
  emptySavedNetworks,
  serializeNetworks,
  NETWORK_STORAGE_KEY,
  type NetworkEdit,
  type SavedNetworks,
  type SupplyNetwork,
  addCustomNetwork,
} from './networks';
export function useNetworks() {
  const [saved, setSaved] = useState<SavedNetworks>(emptySavedNetworks);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [canSave, setCanSave] = useState(true);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NETWORK_STORAGE_KEY);
      if (raw) {
        const recovery = recoverSavedNetworks(raw);
        setSaved(recovery.saved);
        setHasSavedSession(true);
        if (recovery.rejected) {
          setCanSave(false);
          setStorageError(
            `${recovery.rejected} saved network records could not be read. Valid networks are available. Export backups before closing; original storage is untouched and session edits cannot be saved.`,
          );
        }
      }
    } catch {
      setCanSave(false);
      setStorageError(
        'Saved networks could not be read. Your stored data is untouched. You can continue here, but export a JSON backup before closing because session edits cannot be saved.',
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !canSave) return;
    try {
      localStorage.setItem(NETWORK_STORAGE_KEY, serializeNetworks(saved));
      setStorageError('');
    } catch {
      setStorageError(
        'Local saving failed. Keep this page open and export a JSON backup to retain your edits. Check browser storage settings or available space.',
      );
    }
  }, [saved, ready, canSave]);
  const network =
    saved.networks.find((n) => n.id === saved.activeNetworkId) ?? demoNetwork;
  return {
    network,
    networks: saved.networks,
    ready,
    hasSavedSession,
    storageError,
    remove(id: string) {
      setSaved((current) => deleteCustomNetwork(current, id));
    },
    importNetwork(next: SupplyNetwork) {
      const updated = addCustomNetwork(saved, next);
      setSaved(updated);
    },
    open(id: string) {
      setSaved((current) => ({ ...current, activeNetworkId: id }));
    },
    create() {
      const next = createNetwork(crypto.randomUUID());
      setSaved((current) => ({
        ...current,
        networks: [...current.networks, next],
        activeNetworkId: next.id,
      }));
    },
    edit(edit: NetworkEdit) {
      // Validate before scheduling so errors can be shown by the originating control.
      const next = editNetwork(network, edit);
      setSaved((current) => ({
        ...current,
        networks: current.networks.map((n) => (n.id === next.id ? next : n)),
      }));
    },
  };
}
