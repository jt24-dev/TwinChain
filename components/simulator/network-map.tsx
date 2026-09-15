'use client';
import { useState, useRef } from 'react';
import { Globe2, Plus, Minus, Scan, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Geography, BasemapLabels } from './basemap';
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
  const [placementPreview, setPlacementPreview] = useState<{
    x: number;
    y: number;
    latitude: number;
    longitude: number;
  } | null>(null);
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
    fit,
  } = useMapCamera(state.facilities);
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
        className={`map-canvas interactive-map ${state.routes.length > 200 ? 'dense-network' : ''} ${dragging ? 'dragging' : ''} ${paused ? 'flow-paused' : ''} ${builder?.placing ? 'placing-facility' : ''}`}
        tabIndex={0}
        role="region"
        aria-label="Interactive network map"
        aria-describedby="map-help"
        data-zoom={camera.zoom.toFixed(2)}
        data-pan-x={camera.x.toFixed(2)}
        data-pan-y={camera.y.toFixed(2)}
        {...handlers}
        onPointerLeave={() => setPlacementPreview(null)}
        onWheelCapture={() => {
          if (placementPointer.current) placementPointer.current.moved = true;
        }}
        onPointerDown={(event) => {
          if (
            builder?.placing &&
            event.button === 0 &&
            !(event.target as Element).closest('button,a,[data-route-hit]')
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
          if (builder?.placing) {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left,
              y = event.clientY - rect.top;
            const coordinate = coordinatesAtPoint(x, y, scale, translate);
            setPlacementPreview(coordinate ? { x, y, ...coordinate } : null);
          }
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
              width="91.6667"
              height="91.6667"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 91.6667 0 L 0 0 0 91.6667"
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
          <BasemapLabels
            scale={scale}
            translate={translate}
            size={size}
            zoom={camera.zoom}
            facilities={state.facilities}
          />
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
                showLabel={camera.zoom >= 4 || f.status === 'disrupted'}
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
                        y: (275 - y) * current.zoom,
                      }),
                    );
                }}
              />
            );
          })}
        </TooltipProvider>
        {builder?.placing && placementPreview && (
          <div
            className="placement-preview"
            style={{ left: placementPreview.x, top: placementPreview.y }}
            aria-hidden="true"
          >
            <span>+</span>
            <small>
              {placementPreview.latitude.toFixed(3)}°,{' '}
              {placementPreview.longitude.toFixed(3)}°
            </small>
          </div>
        )}
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Show world"
            title="Show world"
            onClick={() => setCamera(FIT_CAMERA)}
          >
            <Globe2 size={17} />
          </Button>
          <span className="control-divider" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fit network"
            title="Fit network (0)"
            onClick={fit}
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
        <a
          className="map-attribution"
          href="https://www.naturalearthdata.com/about/terms-of-use/"
          target="_blank"
          rel="noreferrer"
        >
          Natural Earth · public domain
        </a>
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
