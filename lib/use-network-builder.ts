'use client';
import { useEffect, useState } from 'react';
import type { FacilityType, Route } from './data/network';
import type { NetworkEdit, SupplyNetwork } from './networks';
export function useNetworkBuilder(
  network: SupplyNetwork,
  edit: (edit: NetworkEdit) => void,
  enabled: boolean,
) {
  const [operation, setOperation] = useState<'idle' | 'add' | 'move' | 'route'>(
    'idle',
  );
  const [selection, setSelection] = useState<{
    kind: 'facility' | 'route';
    id: string;
  } | null>(null);
  const [facilityType, setFacilityType] = useState<FacilityType>('Supplier');
  const [transport, setTransport] = useState<Route['mode']>('Truck');
  const [origin, setOrigin] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const cancel = () => {
    setOperation('idle');
    setOrigin(null);
    setDestination(null);
    setError('');
  };
  useEffect(() => {
    cancel();
    setSelection(null);
    setDeleting(false);
  }, [network.id, enabled]);
  useEffect(() => {
    if (!enabled) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancel();
        setDeleting(false);
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [enabled]);
  const apply = (change: NetworkEdit) => {
    if (!enabled) return false;
    try {
      edit(change);
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update network.');
      return false;
    }
  };
  const facility = network.facilities.find(
    (f) => selection?.kind === 'facility' && f.id === selection.id,
  );
  const route = network.routes.find(
    (r) => selection?.kind === 'route' && r.id === selection.id,
  );
  const placing = operation === 'add' || operation === 'move';
  const prompt =
    operation === 'add'
      ? `Place ${facilityType.toLowerCase()}: click the map, or focus the map and press Enter to place at its center.`
      : operation === 'move'
        ? `Move ${facility?.name ?? 'facility'}: click a new map location.`
        : operation === 'route'
          ? !origin
            ? 'Select the origin facility.'
            : !destination
              ? 'Select the destination facility.'
              : 'Choose transportation mode and confirm the route.'
          : facility
            ? 'Editing facility'
            : route
              ? 'Editing route'
              : 'Add a facility or select an existing element to edit.';
  return {
    operation,
    selection,
    facilityType,
    setFacilityType,
    transport,
    setTransport,
    origin,
    destination,
    error,
    deleting,
    setDeleting,
    facility,
    route,
    placing,
    prompt,
    cancel,
    apply,
    selectFacility(id: string) {
      if (placing) return;
      setError('');
      if (operation === 'route') {
        if (!origin) setOrigin(id);
        else if (origin === id)
          setError('Origin and destination must be different facilities.');
        else setDestination(id);
      } else setSelection({ kind: 'facility', id });
    },
    selectRoute(id: string) {
      if (operation !== 'idle') return;
      setSelection({ kind: 'route', id });
      setError('');
    },
    startAdd() {
      cancel();
      setOperation('add');
      setSelection(null);
    },
    startMove() {
      if (facility) {
        cancel();
        setOperation('move');
      }
    },
    startRoute() {
      cancel();
      setOperation('route');
      setSelection(null);
    },
    place(point: { latitude: number; longitude: number } | null) {
      if (!placing) return;
      if (!point) {
        setError('Choose a location within the world map.');
        return;
      }
      if (operation === 'move' && facility) {
        if (apply({ type: 'edit-facility', id: facility.id, changes: point }))
          cancel();
      } else if (operation === 'add') {
        const id = crypto.randomUUID();
        if (
          apply({
            type: 'add-facility',
            facility: {
              id,
              name: `${facilityType} ${network.facilities.length + 1}`,
              type: facilityType,
              city: '',
              region: '',
              status: 'operational',
              ...point,
            },
          })
        ) {
          cancel();
          setSelection({ kind: 'facility', id });
        }
      }
    },
    confirmRoute() {
      if (!origin || !destination) {
        setError('Select two facilities first.');
        return;
      }
      const id = crypto.randomUUID();
      if (
        apply({
          type: 'add-route',
          route: { id, from: origin, to: destination, mode: transport },
        })
      ) {
        cancel();
        setSelection({ kind: 'route', id });
      }
    },
    deleteSelected() {
      if (!selection) return;
      if (
        apply(
          selection.kind === 'facility'
            ? { type: 'delete-facility', id: selection.id }
            : { type: 'delete-route', id: selection.id },
        )
      ) {
        setDeleting(false);
        setSelection(null);
        cancel();
      }
    },
  };
}
export type NetworkBuilder = ReturnType<typeof useNetworkBuilder>;
