# TwinChain Architecture

## Application Entry and Routing

TwinChain uses React with Vinext/Next-style App Router files. `app/layout.tsx` defines global metadata, fonts, viewport settings, and `app/globals.css`. `app/page.tsx` renders `components/simulator/dashboard.tsx` inside `product-boundary.tsx`. `app/pricing/page.tsx` is the dedicated Pricing route.

The main page uses URL query state rather than separate simulator pages. `lib/product-entry.ts` defines `/` for Home, `/?view=app` for the workspace chooser, `/?view=demo` for direct Demo entry, and `/?view=network` for the selected simulator workspace. `Dashboard` synchronizes these views with browser history. `/` defaults to Home even when local networks exist. About/Methodology is a dialog (`product-info.tsx`), not a route. `product-navigation.tsx` supplies shared header/footer navigation.

Home content is in `product-home.tsx`; the saved-network chooser is `workspace-home.tsx`; Pricing content is `pricing-page.tsx`. `Dashboard` owns the selected product view, Build/Simulate mode, active disruption, facility selection, and mitigation selections.

## Core Data Model

`lib/data/network.ts` defines `Facility`, `Route`, supported facility/route types, and the Demo data. Route direction is explicit: `from` is the source and `to` is the downstream destination. `lib/operations.ts` adds optional facility and route operational fields and shared parsing/validation helpers.

`lib/networks.ts` defines the shared `SupplyNetwork` model:

- `kind: "demo" | "custom"`
- structural `facilities` and `routes`
- network identity and name

It also owns network validation, immutable edits, serialization/parsing, creation, and atomic insertion into the saved library. The Demo is read-only. Manual and imported Custom Networks use exactly this model.

Derived types live in `lib/simulation/model.ts`: facility impact, severity, route state, inventory projection, KPI values, mitigation metadata, and `SimulationResult`. These values decorate a source network for display; they are not the persisted network schema.

## Simulation Pipeline

The effective flow is:

```text
SupplyNetwork
→ facility shutdown input
→ directed downstream propagation
→ route/facility impact and delay
→ topology KPI calculation
→ inventory impact and stockout projection
→ optional mitigation from the original disruption
→ inventory/KPI recalculation
→ shared map, KPI, detail, and result components
```

`lib/simulation/propagate-disruption.ts` performs the directed breadth-first traversal and base impact/KPI calculations. It records hop distance, applies severity by proximity, prevents duplicate processing, and safely terminates on cycles.

`lib/simulation/facility-shutdown.ts` validates generalized shutdown inputs, invokes propagation, calculates Custom Network baselines and portfolio-scaled KPIs, then calls the inventory layer. `lib/simulation/inventory.ts` derives inbound supply availability, depletion, stockout timing, remaining inventory, risk count, and inventory-adjusted service impact. It leaves facilities without usable inventory/demand as `no-data`.

Demo orchestration begins in `lib/data/scenario.ts`; Demo response rules live in `lib/simulation/mitigation.ts`. Generalized Custom mitigation is in `lib/simulation/custom-mitigation.ts`. `Dashboard` retains both the original Custom disruption and the selected mitigated result so switching strategies does not compound changes.

## Persistence and Backup

`lib/use-networks.ts` is the client state/persistence hook. It reads and writes the versioned `supply-chain-networks-v1` localStorage record, exposes create/open/edit/import/delete operations, and surfaces storage failures without deliberately overwriting unreadable data.

`lib/networks.ts` validates and allowlists persisted fields. `lib/network-backup.ts` uses the same strict parser to export one Custom Network and restore it under a new ID. Persisted data includes network identity, facility/route structure, coordinates, modes, and optional operational fields. Simulation result state, mitigation state, camera state, selection, and display-only fields are intentionally excluded.

## Imports

`components/simulator/network-import.tsx` owns the client-side dialog, file choice, preview, issue display, and final confirmation. `lib/import/read-files.ts` reads `.xlsx` through `read-excel-file/browser` or paired CSV text. `lib/import/network-import.ts` normalizes approved headers/types, validates row data and references, creates warnings for isolated/disconnected topology, and converts valid rows into the shared model. `createImportedNetwork` runs shared network validation before creation; `useNetworks.importNetwork` inserts it atomically. Templates are in `public/templates/`.

## Builder and Rendering

`lib/use-network-builder.ts` manages Build mode operations and sends immutable edits through `useNetworks`. `network-builder.tsx` renders editing controls. Placement uses the inverse of the same projection used for rendering.

`network-map.tsx` is the shared map shell for all network kinds and result states. It composes `basemap.tsx`, `facility-marker.tsx`, `network-routes.tsx`, `map-legend.tsx`, and facility/route detail components. Projection/route geometry is in `lib/map-projection.ts`; fitting and zoom math are in `lib/map-camera.ts`; interactive camera gestures are in `lib/use-map-camera.ts`. Country/place context comes from bundled Natural Earth-derived data under `lib/data/`.

`Dashboard` chooses a normal, disrupted, or mitigated `NetworkView`, then sends it through the same map. KPI cards and inventory/mitigation results also consume the selected `SimulationResult`; no imported-network-specific rendering path exists.

## Testing

Tests use Node's built-in test runner with TypeScript stripping. They live in `tests/*.test.mjs`, with workbook fixtures in `tests/fixtures/`. The suite currently contains approximately 148 tests. Major groups include:

- `propagation.test.mjs`, `facility-shutdown.test.mjs`, `inventory.test.mjs`
- `mitigation.test.mjs`, `custom-mitigation.test.mjs`, `scenario.test.mjs`
- `networks.test.mjs`, `operations.test.mjs`, `product.test.mjs`
- `network-import.test.mjs`
- `geospatial.test.mjs`, `map-camera.test.mjs`, `ontario-location.test.mjs`
- `product-entry.test.mjs`

Run all tests with `npm test`. Prefer the directly relevant test file during iteration.

## Build and Generated Output

The project uses npm and requires Node 22.13 or newer. Commands are:

- TypeScript: `npm run typecheck`
- Tests: `npm test`
- Production build: `npm run build`
- Lint/format when needed: `npm run lint`, `npm run format`

Vinext exports the static client to `dist/client`; `scripts/prepare-static-routes.mjs` adds a directory-style Pricing entry for plain static servers. Build/server artifacts under `dist/`, dependencies under `node_modules/`, and the known untracked nested `TwinChain/` repository are not architectural source and should normally be ignored. Do not modify the nested repository.
