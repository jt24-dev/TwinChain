import type {
  ImpactedFacility,
  SimulationResult,
} from '@/lib/simulation/model';
export const inventoryLabels = {
  protected: 'Protected by inventory',
  stockout: 'Projected stockout',
  'no-data': 'No data · topology estimate',
};
const number = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 1 });
export function InventoryDetails({ facility }: { facility: ImpactedFacility }) {
  const i = facility.inventory;
  if (!i) return null;
  return (
    <details open className="operations-details inventory-details">
      <summary>Inventory Impact</summary>
      <p className={`inventory-outcome ${i.state}`}>
        {inventoryLabels[i.state]}
      </p>
      {i.state === 'no-data' ? (
        <p>
          Inventory and positive daily demand are needed. Risk and service
          impact use the existing network estimate.
        </p>
      ) : (
        <dl>
          <div>
            <dt>Starting inventory</dt>
            <dd>{number(i.startingInventory!)} units</dd>
          </div>
          <div>
            <dt>Daily demand / flow</dt>
            <dd>{number(i.dailyDemand!)} units/day</dd>
          </div>
          <div>
            <dt>Daily inventory depletion</dt>
            <dd>{number(i.dailyDepletion!)} units/day</dd>
          </div>
          <div>
            <dt>Inventory coverage</dt>
            <dd>{number(i.coverageDays!)} days at full demand</dd>
          </div>
          <div>
            <dt>Projected stockout</dt>
            <dd>
              {i.projectedStockoutDay === undefined
                ? 'None at this supply level'
                : `Day ${number(i.projectedStockoutDay)}`}
            </dd>
          </div>
          <div>
            <dt>Inventory at disruption end</dt>
            <dd>{number(i.remainingInventory!)} units</dd>
          </div>
        </dl>
      )}
      <p>
        Supply availability: {number(i.supplyAvailability * 100)}% ·{' '}
        {i.supplyBasis === 'route-capacity'
          ? 'capacity-weighted inbound routes'
          : i.supplyBasis === 'mitigation'
            ? 'predefined mitigation protection'
            : 'share of normal inbound routes'}
      </p>
      <p>
        Projection from Day 0; starting inventory stays unchanged. Network risk
        and transport delays are shown separately.
      </p>
    </details>
  );
}
export function InventorySummary({ result }: { result: SimulationResult }) {
  const summary = result.inventorySummary;
  if (!result.active || !summary) return null;
  const byId = new Map(result.facilities.map((f) => [f.id, f]));
  const ids = [...summary.stockoutFacilityIds, ...summary.protectedFacilityIds];
  return (
    <section
      className="inventory-summary"
      aria-label="Inventory outlook"
      aria-live="polite"
    >
      <strong>
        Earliest Stockout ·{' '}
        {summary.earliestStockoutDay === undefined
          ? summary.noDataFacilityIds.length
            ? `None calculated within ${summary.durationDays} days`
            : `No stockout within ${summary.durationDays} days`
          : `Day ${number(summary.earliestStockoutDay)}`}
      </strong>
      <span>
        {summary.stockoutFacilityIds.length} projected stockouts ·{' '}
        {summary.protectedFacilityIds.length} protected ·{' '}
        {summary.noDataFacilityIds.length} topology estimates
      </span>
      {ids.length > 0 && (
        <details>
          <summary>Projected Stockouts & Inventory Protection</summary>
          <ul>
            {ids.map((id) => {
              const f = byId.get(id)!;
              return (
                <li key={id}>
                  <span>{f.name}</span>
                  <b>
                    {f.inventory!.state === 'stockout'
                      ? `Day ${number(f.inventory!.projectedStockoutDay!)}`
                      : `Protected through Day ${summary.durationDays}`}
                  </b>
                </li>
              );
            })}
          </ul>
        </details>
      )}
      {summary.noDataFacilityIds.length > 0 && (
        <small>
          Missing inventory data is not proof of protection; those facilities
          retain topology-based risk.
        </small>
      )}
    </section>
  );
}
