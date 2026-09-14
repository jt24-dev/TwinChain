'use client';
import { Anchor, Factory, Package, Warehouse, MapPin } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Facility, FacilityType } from '@/lib/data/network';
import type { ImpactedFacility } from '@/lib/simulation/model';
import { facilityStatusLabel, severityColors } from './impact-display';
import { facilityPoint } from '@/lib/map-projection';
export const typeIcons = {
  Supplier: Package,
  Factory,
  Port: Anchor,
  'Distribution center': Warehouse,
  'Customer market': MapPin,
};
export const typeColors: Record<FacilityType, string> = {
  Supplier: '#b49aff',
  Factory: '#70aaff',
  Port: '#4bd8ca',
  'Distribution center': '#e9bb68',
  'Customer market': '#e1e8f1',
};
export const markerPoint = (f: Facility) => facilityPoint(f, true);
export function FacilityMarker({
  facility: f,
  x,
  y,
  selected,
  onSelect,
  onFocus,
}: {
  facility: ImpactedFacility;
  x: number;
  y: number;
  selected: boolean;
  onSelect: () => void;
  onFocus: () => void;
}) {
  const Icon = typeIcons[f.type];
  const color =
    f.impact && f.impact.severity !== 'normal'
      ? severityColors[f.impact.severity]
      : typeColors[f.type];
  const [dx, dy] = f.labelOffset ?? [0, 25];
  return (
    <Tooltip>
      <TooltipTrigger
        render={<button type="button" />}
        className={`facility ${f.status.replace(' ', '-')} ${f.impact ? `risk-${f.impact.severity}` : ''} ${f.mitigation?.emergencyProtection ? 'emergency-protected' : ''} ${selected ? 'selected' : ''}`}
        style={
          { left: x, top: y, '--node-color': color } as React.CSSProperties
        }
        onClick={onSelect}
        onFocus={onFocus}
        aria-pressed={selected}
        aria-label={`${f.name}, ${f.type}, ${facilityStatusLabel(f)}`}
        data-facility-id={f.id}
        data-severity={f.impact?.severity ?? 'normal'}
        data-inventory={f.inventory?.state}
      >
        <Icon size={14} />
        <span
          className={`facility-label ${dx < 0 ? 'label-left' : dx > 15 ? 'label-right' : ''}`}
          style={
            {
              '--label-x': `${dx}px`,
              '--label-y': `${dy}px`,
            } as React.CSSProperties
          }
        >
          {f.city || f.name}
          {f.status === 'disrupted' && <b> CLOSED</b>}
          {f.inventory?.state === 'stockout' ? (
            <b className="inventory-stockout-badge"> !</b>
          ) : f.inventory?.state === 'protected' ? (
            <b className="inventory-protected-badge"> ✓</b>
          ) : (
            f.status === 'at risk' && <b> ▲</b>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="facility-tooltip">
        <strong>{f.name}</strong>
        <span>
          {f.type} · {f.region}
        </span>
        <span style={{ color }}>
          {f.status === 'operational'
            ? f.mitigation
              ? `● ${facilityStatusLabel(f)} · +${f.impact?.additionalDelayDays} days`
              : '● Operational'
            : f.status === 'disrupted'
              ? `■ Facility closed · ${f.impact?.additionalDelayDays} days`
              : `▲ ${facilityStatusLabel(f)} · +${f.impact?.additionalDelayDays} days`}
        </span>
        <small>Click to inspect</small>
      </TooltipContent>
    </Tooltip>
  );
}
