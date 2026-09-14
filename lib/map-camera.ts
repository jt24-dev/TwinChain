export interface Camera {
  zoom: number;
  x: number;
  y: number;
}
export const FIT_CAMERA: Camera = { zoom: 1, x: 0, y: 0 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export function constrainCamera(camera: Camera): Camera {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom));
  const limitX = 550 * (zoom - 1),
    limitY = 250 * (zoom - 1);
  return {
    zoom,
    x: Math.max(-limitX, Math.min(limitX, camera.x)),
    y: Math.max(-limitY, Math.min(limitY, camera.y)),
  };
}
// Anchors and translation use unscaled map units, relative to the viewport center.
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
