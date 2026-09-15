export interface Camera {
  zoom: number;
  x: number;
  y: number;
}
export const FIT_CAMERA: Camera = { zoom: 1, x: 0, y: 0 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 24;
export function constrainCamera(camera: Camera): Camera {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom));
  const limitX = (MAP_WIDTH / 2) * (zoom - 1),
    limitY = (MAP_HEIGHT / 2) * (zoom - 1);
  return {
    zoom,
    x: Math.max(-limitX, Math.min(limitX, camera.x)),
    y: Math.max(-limitY, Math.min(limitY, camera.y)),
  };
}
// Anchors and translation use unscaled map units, relative to the viewport center.
export function fitNetworkCamera(
  facilities: readonly Facility[],
  width = 1100,
  height = 550,
): Camera {
  if (!facilities.length || width <= 0 || height <= 0) return { ...FIT_CAMERA };
  const points = facilities.map((f) => facilityPoint(f));
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const base = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
  const padding = 64;
  const zoom =
    facilities.length === 1
      ? 8
      : Math.min(
          (width - padding * 2) / base / Math.max(10, maxX - minX),
          (height - padding * 2) / base / Math.max(10, maxY - minY),
          16,
        );
  const bounded = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  return constrainCamera({
    zoom: bounded,
    x: (MAP_WIDTH / 2 - (minX + maxX) / 2) * bounded,
    y: (MAP_HEIGHT / 2 - (minY + maxY) / 2) * bounded,
  });
}

export function zoomCamera(
  camera: Camera,
  nextZoom: number,
  anchor = { x: 0, y: 0 },
): Camera {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  const ratio = zoom / camera.zoom;
  return constrainCamera({
    zoom,
    x: anchor.x - (anchor.x - camera.x) * ratio,
    y: anchor.y - (anchor.y - camera.y) * ratio,
  });
}
import { MAP_WIDTH, MAP_HEIGHT, facilityPoint } from './map-projection.ts';
import type { Facility } from './data/network.ts';
