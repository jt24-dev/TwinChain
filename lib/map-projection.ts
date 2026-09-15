import type { Facility } from './data/network.ts';
export const MAP_WIDTH = 1100;
export const MAP_HEIGHT = 550;
export const WEST_EDGE = -30;
export function projectCoordinates(
  latitude: number,
  longitude: number,
): [number, number] {
  return [
    (((((longitude - WEST_EDGE) % 360) + 360) % 360) / 360) * MAP_WIDTH,
    ((90 - latitude) / 180) * MAP_HEIGHT,
  ];
}
/** Inverse of the existing Pacific-centered map, after undoing camera translation and scale. */
export function coordinatesAtPoint(
  x: number,
  y: number,
  scale: number,
  translate: { x: number; y: number },
) {
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const worldX = (x - translate.x) / scale,
    worldY = (y - translate.y) / scale;
  if (
    !Number.isFinite(worldX) ||
    !Number.isFinite(worldY) ||
    worldX < 0 ||
    worldX > MAP_WIDTH ||
    worldY < 0 ||
    worldY > MAP_HEIGHT
  )
    return null;
  const rawLongitude = (worldX / MAP_WIDTH) * 360 + WEST_EDGE;
  return {
    latitude: 90 - (worldY / MAP_HEIGHT) * 180,
    longitude: rawLongitude > 180 ? rawLongitude - 360 : rawLongitude,
  };
}
export function facilityPoint(
  f: Facility,
  _demoLayout = false,
): [number, number] {
  // Marker centers always anchor to the stored coordinate. Only labels may be offset.
  return projectCoordinates(f.latitude, f.longitude);
}

/** Great-circle samples for schematic lanes, not road/sea navigation. Split at the world seam. */
export function routeGeometry(
  from: Facility,
  to: Facility,
  curved = true,
): string {
  const rad = Math.PI / 180;
  const vector = (f: Facility) => [
    Math.cos(f.latitude * rad) * Math.cos(f.longitude * rad),
    Math.cos(f.latitude * rad) * Math.sin(f.longitude * rad),
    Math.sin(f.latitude * rad),
  ];
  const a = vector(from),
    b = vector(to);
  const omega = Math.acos(
    Math.max(
      -1,
      Math.min(
        1,
        a.reduce((s, v, i) => s + v * b[i], 0),
      ),
    ),
  );
  const samples = Math.max(2, Math.ceil(omega / rad / 3));
  let previous: [number, number] | undefined;
  const parts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    let lat: number, lon: number;
    if (curved && Math.abs(Math.sin(omega)) > 1e-6) {
      const v = a.map(
        (value, j) =>
          (Math.sin((1 - t) * omega) * value + Math.sin(t * omega) * b[j]) /
          Math.sin(omega),
      );
      lat = Math.atan2(v[2], Math.hypot(v[0], v[1])) / rad;
      lon = Math.atan2(v[1], v[0]) / rad;
    } else {
      lat = from.latitude + (to.latitude - from.latitude) * t;
      lon =
        from.longitude +
        (((to.longitude - from.longitude + 540) % 360) - 180) * t;
    }
    const p = projectCoordinates(lat, lon);
    if (previous && Math.abs(p[0] - previous[0]) > MAP_WIDTH / 2) {
      const adjustedX = p[0] + (p[0] > previous[0] ? -MAP_WIDTH : MAP_WIDTH);
      const edge = adjustedX < 0 ? 0 : MAP_WIDTH;
      const edgeY =
        previous[1] +
        ((p[1] - previous[1]) * (edge - previous[0])) /
          (adjustedX - previous[0]);
      parts.push(
        `L${edge},${edgeY.toFixed(3)}M${edge === 0 ? MAP_WIDTH : 0},${edgeY.toFixed(3)}`,
      );
    }
    parts.push(`${previous ? 'L' : 'M'}${p[0].toFixed(3)},${p[1].toFixed(3)}`);
    previous = p;
  }
  return parts.join('');
}
