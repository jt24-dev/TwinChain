'use client';
import { useEffect, useRef, useState } from 'react';
import type { KPIs } from './data/scenario';
export function useAnimatedKpis(target: KPIs) {
  const [display, setDisplay] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      current.current = target;
      setDisplay(target);
    };
    if (preference.matches) {
      finish();
      return;
    }
    const start = current.current,
      started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 650),
        eased = 1 - Math.pow(1 - progress, 3);
      const next = Object.fromEntries(
        Object.keys(target).map((key) => {
          const k = key as keyof KPIs;
          return [k, start[k] + (target[k] - start[k]) * eased];
        }),
      ) as unknown as KPIs;
      current.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
    const onPreference = () => {
      if (preference.matches) finish();
    };
    preference.addEventListener('change', onPreference);
    return () => {
      cancelAnimationFrame(frame);
      preference.removeEventListener('change', onPreference);
    };
  }, [target]);
  return display;
}
