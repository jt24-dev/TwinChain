import {
  parseNetworks,
  type SupplyNetwork,
  type SavedNetworks,
} from './networks.ts';

/** Reuse the strict persistence allowlist, excluding camera, selection and derived simulation data. */
export function exportNetwork(network: SupplyNetwork): string {
  const source = parseNetworks(
    JSON.stringify({
      version: 1,
      networks: [network],
      activeNetworkId: network.id,
    }),
  ).networks[0];
  return JSON.stringify(
    { format: 'supply-chain-network', version: 1, network: source },
    null,
    2,
  );
}
export function importNetworkBackup(raw: string, newId: string): SupplyNetwork {
  try {
    if (raw.length > 10 * 1024 * 1024) throw new Error();
    const backup = JSON.parse(raw);
    if (
      backup.format !== 'supply-chain-network' ||
      backup.version !== 1 ||
      !backup.network ||
      backup.network.facilities?.length > 2000 ||
      backup.network.routes?.length > 10000
    )
      throw new Error();
    const source = parseNetworks(
      JSON.stringify({
        version: 1,
        networks: [backup.network],
        activeNetworkId: backup.network.id,
      }),
    ).networks[0];
    if (!newId || newId === 'demo') throw new Error();
    return parseNetworks(
      JSON.stringify({
        version: 1,
        networks: [{ ...source, id: newId }],
        activeNetworkId: newId,
      }),
    ).networks[0];
  } catch {
    throw new Error(
      'This backup could not be opened. Choose a valid simulator JSON backup (up to 10 MB, 2,000 facilities and 10,000 routes). Your networks have not changed.',
    );
  }
}
/** Read valid records independently, without overwriting the original damaged library. */
export function recoverSavedNetworks(raw: string): {
  saved: SavedNetworks;
  rejected: number;
} {
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 || !Array.isArray(value.networks))
    throw new Error('Unsupported saved library.');
  const networks: SupplyNetwork[] = [];
  let rejected = 0;
  for (const record of value.networks) {
    try {
      const n = parseNetworks(
        JSON.stringify({
          version: 1,
          networks: [record],
          activeNetworkId: record?.id,
        }),
      ).networks[0];
      if (networks.some((x) => x.id === n.id)) throw new Error();
      networks.push(n);
    } catch {
      rejected++;
    }
  }
  return {
    saved: {
      version: 1,
      networks,
      activeNetworkId: networks.some((n) => n.id === value.activeNetworkId)
        ? value.activeNetworkId
        : 'demo',
    },
    rejected,
  };
}
export function deleteCustomNetwork(
  saved: SavedNetworks,
  id: string,
): SavedNetworks {
  if (id === 'demo' || !saved.networks.some((n) => n.id === id))
    throw new Error('Choose an existing Custom Network.');
  return {
    ...saved,
    networks: saved.networks.filter((n) => n.id !== id),
    activeNetworkId:
      saved.activeNetworkId === id ? 'demo' : saved.activeNetworkId,
  };
}
