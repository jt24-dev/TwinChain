'use client';
import { useState } from 'react';
import type { SupplyNetwork } from '@/lib/networks';
import type { SimulationResult } from '@/lib/simulation/model';
export function SkuInventoryView({
  network,
  result,
  selectedId,
}: {
  network: SupplyNetwork;
  result: SimulationResult;
  selectedId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!network.inventoryRecords?.length) return null;
  const names = new Map(network.skus?.map((s) => [s.id, s.name]));
  const facilities = new Map(network.facilities.map((f) => [f.id, f.name]));
  const projections = new Map(
    result.facilities.flatMap((f) =>
      (f.skuInventory ?? []).map(
        (r) => [JSON.stringify([r.facilityId, r.skuId]), r.projection] as const,
      ),
    ),
  );
  const records = network.inventoryRecords.filter(
    (r) => !selectedId || r.facilityId === selectedId,
  );
  const outcomes = [...projections.values()];
  const stockouts = outcomes.filter((p) => p.state === 'stockout');
  const earliest = stockouts.length
    ? Math.min(...stockouts.map((p) => p.projectedStockoutDay!))
    : undefined;
  const number = (n?: number) =>
    n === undefined
      ? '—'
      : n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return (
    <section className="inventory-summary" aria-label="Inventory by SKU">
      <strong>
        Inventory by SKU{selectedId ? ' · ' + facilities.get(selectedId) : ''}
      </strong>
      <p>
        {records.length} facility-SKU records. Quantities are shown per SKU;
        units may differ.
      </p>
      {result.active && (
        <p>
          {stockouts.length} facility-SKUs at risk ·{' '}
          {outcomes.filter((p) => p.state === 'protected').length} protected ·{' '}
          {outcomes.filter((p) => p.state === 'no-data').length} No Data ·
          Earliest SKU stockout:{' '}
          {earliest === undefined
            ? 'None calculated'
            : 'Day ' + number(earliest)}
        </p>
      )}
      {selectedId &&
        result.facilities.find((f) => f.id === selectedId)?.skuRollup &&
        (() => {
          const rollup = result.facilities.find(
            (f) => f.id === selectedId,
          )!.skuRollup!;
          return (
            <p>
              Selected facility: {rollup.stockouts} stockouts ·{' '}
              {rollup.protected} protected · {rollup.noData} No Data · Earliest:{' '}
              {number(rollup.earliestStockoutDay)}
            </p>
          );
        })()}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Facility / SKU</th>
              <th>On hand</th>
              <th>Daily demand</th>
              <th>Projected stockout</th>
            </tr>
          </thead>
          <tbody>
            {records.slice(0, expanded ? records.length : 8).map((r) => {
              const key = JSON.stringify([r.facilityId, r.skuId]),
                projection = projections.get(key);
              return (
                <tr key={key}>
                  <td>
                    {facilities.get(r.facilityId)} / {names.get(r.skuId)} (
                    {r.skuId})
                  </td>
                  <td>{number(r.currentInventory)}</td>
                  <td>{number(r.dailyDemand)}</td>
                  <td>
                    {!result.active
                      ? 'Run a disruption'
                      : !projection
                        ? 'Not downstream'
                        : projection.state === 'no-data'
                          ? 'No Data'
                          : projection.state === 'protected'
                            ? 'Protected'
                            : 'Day ' + number(projection.projectedStockoutDay)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {records.length > 8 && (
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer' : 'Show all ' + records.length + ' records'}
        </button>
      )}
      <small>
        Each SKU uses the facility-level supply-loss fraction. SKU-specific
        sourcing is not modeled.
      </small>
    </section>
  );
}
