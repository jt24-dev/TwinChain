import { typeColors, typeIcons } from './facility-marker';
import type { FacilityType } from '@/lib/data/network';
export function MapLegend({
  alternate = false,
  protectedFlow = false,
}: {
  alternate?: boolean;
  protectedFlow?: boolean;
}) {
  return (
    <div className="map-legend complete-legend" aria-label="Map legend">
      <details className="transport-key">
        <summary>Transport lanes</summary>
        <span>
          Curved: ocean / feeder / air · Solid: road / truck · Patterned: rail.
          Schematic, not navigable routes.
        </span>
      </details>
      <div className="legend-types">
        <strong>FACILITIES</strong>
        {Object.entries(typeIcons).map(([type, Icon]) => (
          <span key={type}>
            <Icon
              size={14}
              style={{ color: typeColors[type as FacilityType] }}
            />
            {type}
          </span>
        ))}
      </div>
      <div className="legend-states">
        <strong>ROUTES</strong>
        <span>
          <i className="line normal" />
          Normal
        </span>
        <span>
          <i className="line affected" />
          Affected
        </span>
        <span>
          <i className="line blocked" />
          Blocked
        </span>
        {alternate && (
          <span>
            <i className="line alternate" />
            Alternate route
          </span>
        )}
        <strong>STATUS</strong>
        <span className="inventory-stockout-badge">! Projected stockout</span>
        <span className="inventory-protected-badge">✓ Inventory protected</span>
        {protectedFlow && (
          <span>
            <i className="status-key protected" />
            Emergency protected
          </span>
        )}
        <span>
          <i className="status-key normal" />
          Normal
        </span>
        <span>
          <i className="status-key risk-high" />
          High risk
        </span>
        <span>
          <i className="status-key risk-medium" />
          Medium risk
        </span>
        <span>
          <i className="status-key risk-low" />
          Low risk
        </span>
        <span>
          <i className="status-key disrupted" />
          Disrupted
        </span>
      </div>
    </div>
  );
}
