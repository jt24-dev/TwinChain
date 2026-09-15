import { memo } from 'react';
import geography from '@/lib/data/geography.json';
import type { Facility } from '@/lib/data/network';
import { facilityPoint } from '@/lib/map-projection';

export const Geography = memo(function Geography() {
  return (
    <g aria-hidden="true" className="country-geography">
      <rect width="1100" height="550" fill="url(#ocean)" />
      <rect width="1100" height="550" fill="url(#grid)" />
      {geography.countries.map((c) => (
        <path key={c.id} d={c.path} fillRule="evenodd" />
      ))}
    </g>
  );
});

/** Screen-space labels retain readable size and omit collisions with facilities and other labels. */
export function BasemapLabels({
  scale,
  translate,
  size,
  zoom,
  facilities,
}: {
  scale: number;
  translate: { x: number; y: number };
  size: { width: number; height: number };
  zoom: number;
  facilities: readonly Facility[];
}) {
  const occupied = facilities.map((f) => {
    const [x, y] = facilityPoint(f);
    return {
      x: x * scale + translate.x - 24,
      y: y * scale + translate.y - 24,
      w: 48,
      h: 48,
    };
  });
  const labels: { name: string; x: number; y: number; city: boolean }[] = [];
  const candidates = [
    ...geography.countries.map((c) => ({ ...c, city: false })),
    ...(zoom >= 3 ? geography.places.map((c) => ({ ...c, city: true })) : []),
  ];
  for (const c of candidates.sort(
    (a, b) => Number(a.city) - Number(b.city) || a.rank - b.rank,
  )) {
    if (!c.city && zoom < [1, 1, 1, 1.7, 3, 5, 8][Math.min(6, c.rank)])
      continue;
    const x = c.point[0] * scale + translate.x,
      y = c.point[1] * scale + translate.y;
    const w = c.name.length * (c.city ? 5.7 : 6.5) + 14,
      h = 18;
    const box = { x: x - w / 2, y: y - h / 2, w, h };
    if (
      box.x < 8 ||
      box.x + w > size.width - 8 ||
      y < 20 ||
      y > size.height - 20 ||
      occupied.some(
        (b) =>
          box.x < b.x + b.w &&
          box.x + w > b.x &&
          box.y < b.y + b.h &&
          box.y + h > b.y,
      )
    )
      continue;
    occupied.push(box);
    labels.push({ name: c.name, x, y, city: c.city });
  }
  return (
    <g aria-hidden="true" className="basemap-labels">
      {labels.map((l, i) => (
        <text
          key={`${l.name}-${i}`}
          x={l.x}
          y={l.y}
          className={l.city ? 'place-label' : 'country-label'}
        >
          {l.city ? '· ' : ''}
          {l.name}
        </text>
      ))}
    </g>
  );
}
