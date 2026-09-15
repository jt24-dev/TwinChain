'use client';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';
import {
  constrainCamera,
  FIT_CAMERA,
  zoomCamera,
  type Camera,
} from './map-camera';
import { fitNetworkCamera } from './map-camera';
import { MAP_WIDTH, MAP_HEIGHT } from './map-projection';
import type { Facility } from './data/network';

export function useMapCamera(facilities: readonly Facility[]) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: MAP_WIDTH, height: MAP_HEIGHT });
  const [measured, setMeasured] = useState(false);
  const initialFit = useRef(false);
  const [camera, setCamera] = useState<Camera>(FIT_CAMERA);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const base = Math.min(size.width / MAP_WIDTH, size.height / MAP_HEIGHT);
  const scale = base * camera.zoom;
  const translate = {
    x: (size.width - MAP_WIDTH * scale) / 2 + base * camera.x,
    y: (size.height - MAP_HEIGHT * scale) / 2 + base * camera.y,
  };
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setMeasured(true);
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fit = () =>
    setCamera(fitNetworkCamera(facilities, size.width, size.height));
  useEffect(() => {
    if (!measured || initialFit.current) return;
    initialFit.current = true;
    setCamera(fitNetworkCamera(facilities, size.width, size.height));
  }, [measured, facilities, size]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('button, a')) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1);
      setCamera((current) =>
        zoomCamera(
          current,
          current.zoom *
            Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.003),
          {
            x: (event.clientX - rect.left - size.width / 2) / base,
            y: (event.clientY - rect.top - size.height / 2) / base,
          },
        ),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [base, size]);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      (event.target as HTMLElement).closest('button, a, [data-route-hit]') ||
      (event.pointerType === 'mouse' && event.button !== 0)
    )
      return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const oldPoints = [...pointers.current.values()];
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const newPoints = [...pointers.current.values()];
    if (newPoints.length === 2) {
      const midpoint = (points: typeof newPoints) => ({
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      });
      const distance = (points: typeof newPoints) =>
        Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const oldMid = midpoint(oldPoints),
        newMid = midpoint(newPoints);
      const rect = event.currentTarget.getBoundingClientRect();
      setCamera((current) => {
        const next = zoomCamera(
          current,
          (current.zoom * distance(newPoints)) /
            Math.max(distance(oldPoints), 1),
          {
            x: (oldMid.x - rect.left - size.width / 2) / base,
            y: (oldMid.y - rect.top - size.height / 2) / base,
          },
        );
        return constrainCamera({
          ...next,
          x: next.x + (newMid.x - oldMid.x) / base,
          y: next.y + (newMid.y - oldMid.y) / base,
        });
      });
    } else if (newPoints.length === 1) {
      setCamera((current) =>
        constrainCamera({
          ...current,
          x: current.x + (event.clientX - previous.x) / base,
          y: current.y + (event.clientY - previous.y) / base,
        }),
      );
    }
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(pointers.current.size > 0);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (
      [
        '+',
        '=',
        '-',
        '0',
        'Home',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(event.key)
    )
      event.preventDefault();
    if (event.key === '+' || event.key === '=')
      setCamera((current) => zoomCamera(current, current.zoom * 1.25));
    if (event.key === '-')
      setCamera((current) => zoomCamera(current, current.zoom / 1.25));
    if (event.key === '0' || event.key === 'Home') fit();
    const movement: Record<string, [number, number]> = {
      ArrowUp: [0, 50],
      ArrowDown: [0, -50],
      ArrowLeft: [50, 0],
      ArrowRight: [-50, 0],
    };
    const delta = movement[event.key];
    if (delta)
      setCamera((current) =>
        constrainCamera({
          ...current,
          x: current.x + delta[0],
          y: current.y + delta[1],
        }),
      );
  };
  return {
    viewport,
    size,
    camera,
    scale,
    translate,
    dragging,
    setCamera,
    fit,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onLostPointerCapture: onPointerUp,
      onKeyDown,
    },
  };
}
