'use client';
import { useState } from 'react';
import {
  Anchor,
  Factory,
  Package,
  Warehouse,
  MapPin,
  Globe2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { landPaths } from '@/lib/data/land';
import {
  facilityById,
  type Facility,
  type FacilityType,
} from '@/lib/data/network';
import { getNetworkState } from '@/lib/data/scenario';
export const typeIcons = {
  Supplier: Package,
  Factory: Factory,
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
function point(f: Facility): [number, number] {
  return [
    (((f.longitude < -30 ? f.longitude + 360 : f.longitude) + 30) / 360) * 1100,
    ((80 - f.latitude) / 140) * 500,
  ];
}
// Small display offsets separate neighboring facilities without changing geographic data.
function markerPoint(f: Facility): [number, number] {
  const [x, y] = point(f);
  const offset: Record<string, [number, number]> = {
    suzhou: [-23, -16],
    ontario: [12, -28],
    duisburg: [16, 22],
    berlin: [15, -12],
  };
  const [dx, dy] = offset[f.id] ?? [0, 0];
  return [x + dx, y + dy];
}
export function NetworkMap({ active }: { active: boolean }) {
  const state = getNetworkState(active);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section className="network-panel" aria-label="Global supply chain network">
      <div className="map-heading">
        <div>
          <Globe2 size={18} />
          <h2>Global network</h2>
          <span className="map-count">14 facilities · 13 routes</span>
        </div>
        <span className="map-live">
          <i /> {active ? 'Disruption view' : 'Baseline view'}
        </span>
      </div>
      <div
        className="map-scroll"
        tabIndex={0}
        aria-label="Network map. Scroll horizontally on small screens."
      >
        <div className="map-canvas">
          <svg viewBox="0 0 1100 500" className="world-map" aria-hidden="true">
            <defs>
              <pattern
                id="grid"
                width="91.66"
                height="89.28"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 91.66 0 L 0 0 0 89.28"
                  fill="none"
                  stroke="#233340"
                  strokeWidth=".7"
                />
              </pattern>
              <radialGradient id="ocean">
                <stop stopColor="#142c35" />
                <stop offset="1" stopColor="#101c27" />
              </radialGradient>
            </defs>
            <rect width="1100" height="500" fill="url(#ocean)" />
            <rect width="1100" height="500" fill="url(#grid)" />
            <g fill="#263742" stroke="#344753" strokeWidth=".6">
              {landPaths.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g className="continent-label">
              <text x="110" y="165">
                EUROPE
              </text>
              <text x="170" y="322">
                AFRICA
              </text>
              <text x="438" y="142">
                ASIA
              </text>
              <text x="635" y="404">
                OCEANIA
              </text>
              <text x="880" y="164">
                NORTH AMERICA
              </text>
              <text x="999" y="379">
                SOUTH AMERICA
              </text>
            </g>
            <g className="ocean-label">
              <text x="675" y="256">
                PACIFIC OCEAN
              </text>
              <text x="310" y="391">
                INDIAN OCEAN
              </text>
            </g>
            {state.routes.map((r) => {
              const [x1, y1] = markerPoint(facilityById[r.from]);
              const [x2, y2] = markerPoint(facilityById[r.to]);
              const bend =
                r.mode === 'Ocean' ? Math.min(Math.abs(x2 - x1) * 0.25, 90) : 8;
              const d =
                r.id === 'r10'
                  ? `M ${x1} ${y1} Q 340 365 220 300 Q 90 245 ${x2} ${y2}`
                  : `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - bend} ${x2} ${y2}`;
              return (
                <path
                  key={r.id}
                  d={d}
                  fill="none"
                  className={`route ${r.status}`}
                >
                  <title>{`${facilityById[r.from].city} → ${facilityById[r.to].city}: ${r.status}`}</title>
                </path>
              );
            })}
          </svg>
          <TooltipProvider delay={100}>
            {state.facilities.map((f) => {
              const [x, y] = markerPoint(f);
              const Icon = typeIcons[f.type];
              const color =
                f.status === 'disrupted'
                  ? '#fb7b69'
                  : f.status === 'at risk'
                    ? '#f2ba68'
                    : typeColors[f.type];
              const [dx, dy] = f.labelOffset ?? [0, 25];
              return (
                <Tooltip
                  key={f.id}
                  open={selected === f.id}
                  onOpenChange={(open) => setSelected(open ? f.id : null)}
                >
                  <TooltipTrigger
                    render={<button type="button" />}
                    className={`facility ${f.status.replace(' ', '-')}`}
                    style={
                      {
                        left: `${x / 11}%`,
                        top: `${y / 5}%`,
                        '--node-color': color,
                      } as React.CSSProperties
                    }
                    onClick={() => setSelected(selected === f.id ? null : f.id)}
                    aria-label={`${f.name}, ${f.type}, ${f.status}`}
                  >
                    <Icon size={13} />
                    <span
                      className={`facility-label ${dx < 0 ? 'label-left' : dx > 15 ? 'label-right' : ''}`}
                      style={
                        {
                          '--label-x': `${dx}px`,
                          '--label-y': `${dy}px`,
                        } as React.CSSProperties
                      }
                    >
                      {f.city}
                      {f.status === 'disrupted' && <b> CLOSED</b>}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="facility-tooltip">
                    <strong>{f.name}</strong>
                    <span>
                      {f.type} · {f.region}
                    </span>
                    <span style={{ color }}>
                      {f.status === 'operational'
                        ? '● Operational'
                        : f.status === 'disrupted'
                          ? '■ Port closed · 14 days'
                          : '▲ At risk · Shanghai dependency'}
                    </span>
                    <small>
                      {f.latitude.toFixed(1)}°, {f.longitude.toFixed(1)}°
                    </small>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
          <div className="map-corner">
            <span className="crosshair">+</span> GLOBAL NETWORK / 01
          </div>
          <span className="map-attribution">Natural Earth</span>
        </div>
      </div>
      <div className="map-legend">
        <div>
          {Object.entries(typeIcons).map(([type, Icon]) => (
            <span key={type}>
              <Icon
                size={14}
                style={{ color: typeColors[type as FacilityType] }}
              />
              {type === 'Distribution center'
                ? 'Distribution'
                : type === 'Customer market'
                  ? 'Market'
                  : type}
            </span>
          ))}
        </div>
        <div>
          <span>
            <i className="line normal" />
            Operational
          </span>
          {active && (
            <>
              <span>
                <i className="line blocked" />
                Blocked
              </span>
              <span>
                <i className="line affected" />
                Affected
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
