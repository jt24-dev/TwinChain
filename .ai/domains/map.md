# Map

## Responsibility

Render every Demo, Custom, imported, baseline, disrupted, and mitigated network on one geographic SVG/HTML map. This domain owns projection, basemap context, facility and route visuals, labels/details, camera math and gestures, fit behavior, and Build mode coordinate placement. It does not calculate disruption, inventory, or KPIs.

## Key Files

- `components/simulator/network-map.tsx` — shared map shell, controls, selection, placement coordination, and detail panels.
- `lib/map-projection.ts` — geographic projection/inverse projection and route geometry, including great-circle samples and seam splitting.
- `lib/map-camera.ts` — zoom bounds, camera constraints, and facility-bounds fitting.
- `lib/use-map-camera.ts` — resize measurement, wheel/keyboard/touch/pointer interaction, pan, zoom, and fit state.
- `components/simulator/basemap.tsx` and `lib/data/geography.json` — Natural Earth-derived countries and contextual labels.
- `components/simulator/facility-marker.tsx` — facility glyph, status, selection, stockout/protection badges, and labels.
- `components/simulator/network-routes.tsx` — route paths, movement, state, mode, alternate styling, and route hit targets.
- `lib/route-visuals.ts` and `components/simulator/route-mode-indicator.tsx` — shared mode tokens, legend samples, and detail badge.
- `components/simulator/map-legend.tsx` — visual key matching facility/route state styling.
- `components/simulator/facility-details.tsx` and `route-details.tsx` — selected entity explanations.
- `app/globals.css` — map dimensions and visual state selectors.

## Data Flow

`Dashboard` selects a `NetworkView` from normal, disrupted, or mitigated state and passes it to `NetworkMap`. Facilities use stored latitude/longitude through `facilityPoint`. Routes resolve their `from`/`to` facilities and use `routeGeometry`; ocean/feeder/air modes use sampled geodesic-style arcs, while land modes remain schematic. Geometry crossing the projection seam is split.

`useMapCamera` combines map dimensions with camera zoom/translation. `fitNetworkCamera` uses actual facility bounds. Build placement converts a pointer position back to latitude/longitude with `coordinatesAtPoint`, then the builder stores those source coordinates. Simulation status changes only decorations and route movement; camera is component state.

Normal wheel/trackpad events scroll the page. Map wheel zoom requires Ctrl/Cmd. Buttons, drag/pan, touch gestures, keyboard controls, Show World, and Fit Network remain available.

## Important Invariants

- Stored coordinates are the geographic truth. Never offset a Demo marker to conceal bad source data; correct `lib/data/network.ts` instead.
- The forward projection and Build placement inverse must remain consistent.
- Route endpoints must remain anchored to facility coordinates, including at high zoom.
- Dateline/seam routes must not draw a false segment across the world.
- Running, mitigating, or resetting a simulation must not unexpectedly reset camera, selection, or map dimensions.
- The map remains the stable visual anchor; result panels belong below it rather than changing its size/position.
- Keep zoom within `MIN_ZOOM`/`MAX_ZOOM`, and preserve sensible bounds for empty, single-node, regional, and global networks.
- Dense-network animation safeguards must remain in place; do not assume Demo-scale data.
- Transportation mode determines route pattern/weight and movement cadence; operational state determines color/emphasis. Alternate, blocked, affected, and normal routes must stay visually distinguishable without erasing mode identity, and the legend must describe actual styling.
- Natural Earth attribution must stay usable without triggering map placement or movement.

## Relevant Tests

- `tests/geospatial.test.mjs` — projection round trips, anchors, route curvature/seams, fitted bounds, bundled geography, source-coordinate fidelity, and simulation isolation.
- `tests/map-camera.test.mjs` — pointer-anchored zoom and camera constraints.
- `tests/networks.test.mjs` — inverse placement and no Demo offsets.
- `tests/ontario-location.test.mjs` — corrected Toronto/Ontario source location and fit inclusion.
- `tests/custom-mitigation.test.mjs` and `tests/mitigation.test.mjs` — alternate result metadata consumed by route styling.
- `tests/route-visuals.test.mjs` — complete, unique, stable route-mode visual mapping.

## Common Change Areas

- Projection, fit, or dateline bugs: `map-projection.ts`, `map-camera.ts`, then geospatial tests.
- Input/gesture behavior: `use-map-camera.ts` and `network-map.tsx`.
- Marker/route status visuals: marker/routes/legend components plus tightly scoped CSS.
- Build placement: `network-map.tsx`, `use-network-builder.ts`, projection inverse, and network tests.

## Usually Unrelated

Avoid import parsing, persistence schemas, KPI coefficients, mitigation formulas, pricing/home content, and JSON backup code unless the map task explicitly changes their contract. Do not inspect generated `dist/`, `node_modules/`, or the nested `TwinChain/` repository.
