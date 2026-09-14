import type { Facility } from './data/network.ts';
export function projectCoordinates(
  latitude: number,
  longitude: number,
): [number, number] {
  return [
    (((longitude < -30 ? longitude + 360 : longitude) + 30) / 360) * 1100,
    ((80 - latitude) / 140) * 500,
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
    worldX > 1100 ||
    worldY < 0 ||
    worldY > 500
  )
    return null;
  const rawLongitude = (worldX / 1100) * 360 - 30;
  return {
    latitude: 80 - (worldY / 500) * 140,
    longitude: rawLongitude > 180 ? rawLongitude - 360 : rawLongitude,
  };
}
export function facilityPoint(
  f: Facility,
  demoLayout = false,
): [number, number] {
  const offsets: Record<string, [number, number]> = {
    suzhou: [-34, -23],
    taipei: [14, 9],
    shenzhen: [-15, 8],
    hcm: [-14, 10],
    singapore: [-13, 14],
    ontario: [12, -28],
    duisburg: [16, 22],
    berlin: [15, -12],
  };
  const [dx, dy] = demoLayout ? (offsets[f.id] ?? [0, 0]) : [0, 0];
  const [x, y] = projectCoordinates(f.latitude, f.longitude);
  return [x + dx, y + dy];
}
