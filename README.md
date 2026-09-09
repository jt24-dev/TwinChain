# Supply Chain Resilience Simulator · v0.1

A single-page portfolio demo: close Shanghai Port for 14 days, trace the interrupted flows, see the business impact, and reset.

## Run locally

Requires Node.js 22.13+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by the server (normally http://localhost:3000).

```sh
npm run build     # Static production export in dist/client
npm run typecheck
npm test
```

## Demo

1. Start with 14 operational facilities and 13 connecting routes.
2. Hover or focus a facility to see its type, location, and status. Tap on touch devices. The map scrolls horizontally on narrow screens.
3. Select **Activate disruption**. Shanghai closes, three routes are blocked, three downstream routes are affected, and four downstream facilities become at risk.
4. Service level changes from 97% to 84%, average lead time from 12 to 19 days, logistics cost from $1.2M to $1.48M, and facilities at risk from 0 to 4.
5. Select **Reset to baseline** to restore the entire network and its KPIs.

## Architecture

React + TypeScript, Vite through the Sites Vinext scaffold. The production application is a static export; it has no application backend, database, authentication, or runtime data service. The provided scaffold includes build/hosting dependencies; it is intentionally preserved. The installed button and tooltip primitives handle keyboard interactions. Geography is bundled locally, with no map API key or runtime tile service.

- `lib/data/network.ts`: facility and route interfaces and mock network.
- `lib/data/scenario.ts`: explicit scenario membership, KPI assumptions, and pure state derivation.
- `components/simulator/network-map.tsx`: SVG routes and geography, interactive facility markers.
- `components/simulator/kpi-cards.tsx`: KPI display and baseline deltas.
- `components/simulator/scenario-controls.tsx`: activate/reset controls.
- `components/simulator/dashboard.tsx`: single scenario state and dashboard composition.
- `lib/use-scenario-tools.ts`: optional feature-detected WebMCP action using the same state as the controls. Browsers without the proposed API are unaffected. No supported WebMCP validation context was available during implementation; this integration is not browser-verified.

## Assumptions and limits

This is a deterministic visual demonstration, not a prediction or inventory model. KPI values represent illustrative scenario-period outcomes, not calculated forecasts. At-risk facilities exclude the closed port itself. Suppliers and factories are not marked at risk in this version, even when a connection into Shanghai is blocked. Singapore's separate Europe and Oceania flows remain operational.

Routes are schematic connections, not navigable maritime paths. Nearby markers have small display offsets to remain distinguishable; their tooltips retain the original geographic coordinates. The map uses a Pacific-centered equirectangular projection. No shipments, rerouting, mitigation recommendations, historical data, or simulation engine are included.

Land outlines: [Natural Earth 1:110m land](https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/), public domain. `lib/data/land.ts` contains projected paths from the bundled `public/land.geojson` source.

Tests cover network integrity, exact closure impacts, independent route health, KPI/risk consistency, repeatability, and full reset. Production build and TypeScript checks are run separately. Browser UI testing was not performed.
