'use client';
import { memo, useState, useRef } from 'react';
import { Globe2, Plus, Minus, Scan, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { landPaths } from '@/lib/data/land';
import type { NetworkView } from '@/lib/networks';
import type { NetworkBuilder } from '@/lib/use-network-builder';
import { facilityPoint, coordinatesAtPoint } from '@/lib/map-projection';
import {
  constrainCamera,
  FIT_CAMERA,
  MAX_ZOOM,
  MIN_ZOOM,
  zoomCamera,
} from '@/lib/map-camera';
import { useMapCamera } from '@/lib/use-map-camera';
import { FacilityMarker } from './facility-marker';
import { NetworkRoutes } from './network-routes';
import { MapLegend } from './map-legend';
import { FacilityDetails } from './facility-details';
import { RouteDetails } from './route-details';

const Geography = memo(function Geography() {
  return (
    <>
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
    </>
  );
});
export function NetworkMap({
  state,
  name = 'Global network',
  demoLayout = true,
  builder,
  selectedId,
  onSelectionChange,
}: {
  state: NetworkView;
  name?: string;
  demoLayout?: boolean;
  builder?: NetworkBuilder;
  selectedId?: string | null;
  onSelectionChange?: (id: string | null) => void;
}) {
  const active = state.active;
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const selected = selectedId === undefined ? localSelected : selectedId;
  const setSelected = onSelectionChange ?? setLocalSelected;
  const [paused, setPaused] = useState(false);
  const [routeSelection, setRouteSelection] = useState<string | null>(null);
  const selectedRoute = !selected
    ? state.routes.find((r) => r.id === routeSelection)
    : undefined;
  const {
    viewport,
    size,
    camera,
    scale,
    translate,
    dragging,
    setCamera,
    handlers,
  } = useMapCamera(!demoLayout);
  const placementPointer = useRef<{
    x: number;
    y: number;
    moved: boolean;
    id: number;
  } | null>(null);
  const selectedFacility = state.facilities.find((f) => f.id === selected);
  const dismiss = () => {
    setSelected(null);
    setRouteSelection(null);
    viewport.current?.focus({ preventScroll: true });
  };
  return (
    <section
      className="network-panel"
      aria-label="Global supply chain network"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && (selected || routeSelection)) {
          event.preventDefault();
          dismiss();
        }
      }}
    >
      <div className="map-heading">
        <div>
          <Globe2 size={18} />
          <h2>{name}</h2>
          <span className="map-count">
            {state.facilities.length} facilities · {state.routes.length} routes
            {state.routes.some((r) => r.alternate) ? ' (2 alternate)' : ''}
          </span>
        </div>
        <span className={`map-live ${active ? 'disruption-live' : ''}`}>
          <i />
          {active ? 'Disruption view' : 'Baseline view'}
        </span>
      </div>
      <div
        ref={viewport}
        className={`map-canvas interactive-map ${dragging ? 'dragging' : ''} ${paused ? 'flow-paused' : ''} ${builder?.placing ? 'placing-facility' : ''}`}
        tabIndex={0}
        role="region"
        aria-label="Interactive network map"
        aria-describedby="map-help"
        data-zoom={camera.zoom.toFixed(2)}
        data-pan-x={camera.x.toFixed(2)}
        data-pan-y={camera.y.toFixed(2)}
        {...handlers}
        onPointerDown={(event) => {
          if (
            builder?.placing &&
            event.button === 0 &&
            !(event.target as Element).closest('button,[data-route-hit]')
          ) {
            if (placementPointer.current) placementPointer.current.moved = true;
            else
              placementPointer.current = {
                x: event.clientX,
                y: event.clientY,
                moved: false,
                id: event.pointerId,
              };
          }
          handlers.onPointerDown(event);
        }}
        onPointerMove={(event) => {
          const p = placementPointer.current;
          if (p && Math.hypot(event.clientX - p.x, event.clientY - p.y) > 5)
            p.moved = true;
          handlers.onPointerMove(event);
        }}
        onPointerUp={(event) => {
          const p = placementPointer.current;
          placementPointer.current = null;
          handlers.onPointerUp(event);
          if (p && !p.moved && p.id === event.pointerId && builder?.placing) {
            const rect = event.currentTarget.getBoundingClientRect();
            builder.place(
              coordinatesAtPoint(
                event.clientX - rect.left,
                event.clientY - rect.top,
                scale,
                translate,
              ),
            );
          }
        }}
        onPointerCancel={(event) => {
          placementPointer.current = null;
          handlers.onPointerCancel(event);
        }}
        onLostPointerCapture={(event) => {
          placementPointer.current = null;
          handlers.onLostPointerCapture(event);
        }}
        onKeyDown={(event) => {
          if (
            builder?.placing &&
            event.key === 'Enter' &&
            event.target === event.currentTarget
          ) {
            event.preventDefault();
            builder.place(
              coordinatesAtPoint(
                size.width / 2,
                size.height / 2,
                scale,
                translate,
              ),
            );
          } else handlers.onKeyDown(event);
        }}
      >
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          className="world-map"
          role="group"
          aria-label="Network routes"
        >
          <defs>
            <marker
              id="route-direction"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a1eddd" />
            </marker>
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
          <g
            transform={`translate(${translate.x} ${translate.y}) scale(${scale})`}
          >
            <g aria-hidden="true">
              <Geography />
            </g>
            <NetworkRoutes
              routes={state.routes}
              facilities={state.facilities}
              demoLayout={demoLayout}
              selectionLabel={builder ? 'Edit route' : 'Inspect route'}
              onSelect={
                builder?.selectRoute ??
                ((id) => {
                  setSelected(null);
                  setRouteSelection(id);
                })
              }
              selectedRoute={builder?.route?.id ?? selectedRoute?.id}
            />
          </g>
        </svg>
        <TooltipProvider delay={160}>
          {state.facilities.map((f) => {
            const [x, y] = facilityPoint(f, demoLayout);
            const screenX = x * scale + translate.x,
              screenY = y * scale + translate.y;
            return (
              <FacilityMarker
                key={f.id}
                facility={f}
                x={screenX}
                y={screenY}
                selected={
                  builder
                    ? builder.facility?.id === f.id ||
                      builder.origin === f.id ||
                      builder.destination === f.id
                    : selected === f.id
                }
                onSelect={() => {
                  if (builder) builder.selectFacility(f.id);
                  else {
                    setRouteSelection(null);
                    setSelected(f.id);
                  }
                }}
                onFocus={() => {
                  // Keep keyboard traversal useful even when a facility is outside the camera.
                  if (
                    screenX < 30 ||
                    screenX > size.width - 30 ||
                    screenY < 30 ||
                    screenY > size.height - 30
                  )
                    setCamera((current) =>
                      constrainCamera({
                        ...current,
                        x: (550 - x) * current.zoom,
                        y: (250 - y) * current.zoom,
                      }),
                    );
                }}
              />
            );
          })}
        </TooltipProvider>
        {state.facilities.length === 0 && !builder?.placing && (
          <div className="network-empty">
            <strong>Build your supply chain</strong>
            <p>Add your first facility to begin mapping your network.</p>
            {builder && (
              <Button onClick={builder.startAdd}>Add Facility</Button>
            )}
          </div>
        )}
        {builder && builder.operation !== 'idle' && (
          <div className="map-builder-hint" aria-live="polite">
            {builder.prompt}
          </div>
        )}
        <div className="map-controls" aria-label="Map controls">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            title="Zoom in (+)"
            disabled={camera.zoom >= MAX_ZOOM}
            onClick={() =>
              setCamera((current) => zoomCamera(current, current.zoom * 1.25))
            }
          >
            <Plus size={17} />
          </Button>
          <span className="zoom-level">{Math.round(camera.zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            title="Zoom out (−)"
            disabled={camera.zoom <= MIN_ZOOM}
            onClick={() =>
              setCamera((current) => zoomCamera(current, current.zoom / 1.25))
            }
          >
            <Minus size={17} />
          </Button>
          <span className="control-divider" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fit network"
            title="Fit network (0)"
            onClick={() => setCamera(FIT_CAMERA)}
          >
            <Scan size={17} />
          </Button>
        </div>
        <Button
          variant="ghost"
          className="flow-toggle"
          aria-label={paused ? 'Resume route movement' : 'Pause route movement'}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          <span>{paused ? 'Flow paused' : 'Network flow'}</span>
        </Button>
        <span className="map-attribution">Natural Earth</span>
      </div>
      <div className="map-help" id="map-help">
        Scroll to zoom · Drag to pan · Select to inspect
        <span>Keyboard: + / −, arrows, 0 to fit</span>
      </div>
      <MapLegend
        alternate={state.routes.some((r) => r.alternate)}
        protectedFlow={state.facilities.some(
          (f) => f.mitigation?.emergencyProtection,
        )}
      />
      {!builder && selectedRoute ? (
        <RouteDetails
          route={selectedRoute}
          facilities={state.facilities}
          onDismiss={dismiss}
        />
      ) : (
        !builder && (
          <FacilityDetails
            facility={selectedFacility}
            active={active}
            onDismiss={dismiss}
          />
        )
      )}
    </section>
  );
}
