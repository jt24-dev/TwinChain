# TwinChain · v0.12A

TwinChain is an interactive digital twin for building, importing, and stress-testing supply chain networks. Create a visual network or import Excel/CSV, add operational data, shut down any facility, and inspect cascading exposure, inventory depletion, projected stockouts and KPI impact. The illustrative Demo Network includes Shanghai mitigation comparison.

## v0.12A homepage and product navigation

TwinChain’s positioning is **Supply Chain Resilience Intelligence**. The homepage introduces the product with a still view of the real Shanghai Demo result, direct Demo/Build/Import actions, saved-network continuation, four capability sections, a three-step workflow, and use cases. Product and How It Works links navigate within the homepage; About and Methodology open the existing model explanation. Open App returns to the current workspace, while returning sessions retain their existing workspace entry behavior.

The preview reuses the geographic projection, country geometry, route renderer, and calculated Demo state; it contains no invented business results or continuous animation. Navy, mint, and the existing Geist font and network mark remain the brand foundation. Homepage spacing, buttons, borders, and type hierarchy are scoped to the entry experience. No new dependencies or simulation changes. Pricing, payment, accounts, and cloud persistence remain deferred. The displayed milestone is v0.12A; the package version is 0.12.0.

Validation: TypeScript and all 129 existing tests pass; the production build succeeds with the existing chunk-size and dependency deprecation warnings. Five targeted browser checks covered the laptop homepage, Demo entry, Build and saved-network continuation, Import entry/cancellation, and responsive Home/navigation including methodology and Open App. No console errors or horizontal overflow were observed at 1366, 1440, 1536, 1024, or 390 CSS-pixel widths. No simulation changes or new visual snapshot tests were needed.

## v0.11 map and geospatial experience

The map retains the SVG/HTML architecture, with a shared full-latitude, Pacific-centered plate carrée projection (1100 × 550 world units, seam at 30°W). It can support local vector overlays without WebGL or a tile service. The prior positional error was **deliberate Demo marker offsets**, amplified by zoom; those also displaced route endpoints. The old display cropped latitudes to 80°N–60°S. Markers and routes now use unmodified coordinates in every network; no source Demo coordinate changes or storage migration were needed. This is a flat geographic projection, not a globe or distance-preserving navigation chart.

**Basemap:** bundled Natural Earth 1:50m Admin 0 countries (242 countries/territories in this source) and 1:110m populated places (243 places). Coastlines and national boundaries are visible. Country labels become denser at regional zoom; city labels begin at 3×. Labels are screen-sized and omitted when they collide with facilities or other labels. The static paths are memoized. No tile requests, API key, geocoder, or recurring map cost is required; after app assets load, the map has no external basemap failure mode.

**Markers and lanes:** constant-size facility glyphs retain type/risk/selection styling. Distinct ! and ✓ badges show stockout and protection even when labels are hidden. Selected/hovered/focused facility labels remain visible; all facility labels appear at 4×. Co-located facilities stay co-located: zoom or use keyboard focus to inspect them. Ocean/feeder/air lanes use sampled great-circle curves; road/truck/rail lanes use schematic interpolated segments. Seam crossings are split instead of drawing across the world. Rail and air have subtle patterns; blocked lanes stop movement, and mitigation lanes keep their existing styling. These are not sea corridors, turn-by-turn roads or navigable routes; geodesic ocean arcs may cross land.

**Camera and placement:** zoom spans 1–24×. Fit Network calculates bounds with padding, caps tight-network fits at 16×, and uses 8× for a single facility. A new network fits automatically; simulation reset and mode changes preserve the camera. Show World provides an overview. Build placement and its cursor preview use the exact inverse projection and show coordinates; drag/pinch gestures cancel placement. Descriptive location metadata stays editable; automatic country inference/reverse geocoding is deferred. Networks spanning the Atlantic map seam may fit to a broad world view rather than the shortest wrapped extent.

**Performance and compatibility:** route geometry is memoized; animation is disabled above 200 routes. The bundled geographic asset is about 1.6 MB before compression. This is designed for typical networks and hundreds of entities; complex clustering, spatial indexing, tile-level detail and very large network rendering remain future work. CSV, Excel, JSON backup and localStorage schemas are unchanged; simulation outputs are consumed without business-logic changes. Vercel/static hosting serves the same compiled assets from `dist/client`; no new environment settings are required.

Data sources: [Natural Earth country data](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson), [populated places](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_populated_places.geojson), and [public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/). Natural Earth uses de facto boundaries; these are cartographic context, not a statement on disputed sovereignty. Visible attribution is retained as good practice. `scripts/build-geography.py` regenerates clipped local paths from those two downloaded GeoJSON inputs using Python's standard library; the deployed browser never runs that script. Country input SHA256: `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb`.

Thirteen geospatial tests supplement the existing 116 (updating two obsolete camera/offset expectations): six-continent and polar round trips, known anchors, longitude wrapping, route seams and endpoints, degenerate routes, network fits, bundled geography, backup compatibility and unchanged simulation outputs. Total: 129 tests.

## Start here

First-time visitors can **Try Demo Network**, **Build a Network**, or **Import a Network**. Returning browsers reopen their saved workspace; **Home** returns to saved networks and entry actions. Use **About** for assumptions and privacy information. Rename Custom Networks in Build mode, export a JSON backup, or delete them with confirmation.

All file parsing happens in the browser; imported files are not uploaded. Custom Networks live in this browser's localStorage, do not sync across devices, and may disappear when browser data is cleared. **Export Network** downloads source network metadata, facilities, routes and operational fields—never projections, camera or selection. **Import → JSON backup** validates a backup and restores it as a new Custom Network. Damaged storage is preserved; valid records remain accessible, with saving disabled until the original storage issue is resolved. Export recovered networks before clearing damaged storage or closing unsaved edits.

## Deployment readiness

This is a Vinext/Vite static export, not a conventional Next.js server deployment. No application secrets, backend, database or environment variables are required. Use Node 22.13+ and `npm ci`, then `npm run build`; publish **dist/client** as the web root. Do not publish source files or server intermediates. The only application route is `/`, with assets and templates served from that same origin.

The existing Sites configuration already targets `dist/client`; public publication is a separate action and was not performed for this readiness milestone. For another static frontend host, connect the repository, select a generic/static framework preset, set build command `npm run build` and output directory `dist/client`, then deploy. Do not use automatic Next.js server settings for this scaffold. Verify `/`, direct refresh, favicon, templates, imports and persistence on the final HTTPS domain. Storage is origin-specific, so transfer networks with JSON backups when moving domains. No additional hosting configuration is needed for this single-route static app.

For a local production check after building, serve `dist/client` using any static HTTP server (for example `python3 -m http.server 4173 --directory dist/client`) and open its URL. `npm run dev` remains the development workflow.

## Portfolio context

Built as a portfolio project demonstrating supply chain resilience modeling, graph-based disruption propagation, operational data modeling, inventory simulation, scenario analysis and frontend product development. Outcomes are deterministic illustrations, not validated operational forecasts or evidence of enterprise adoption.

## Inventory-Aware Disruption Simulation

Inventory buffers buy time. The existing directed BFS still identifies exposure, hops, route states and transport delays. A pure layer in `lib/simulation/inventory.ts` then projects aggregate inventory through the selected shutdown duration, starting on Day 0. Custom and imported networks participate automatically using the existing optional columns.

- **Supply availability:** normal inbound routes retain supply; blocked and affected routes contribute none. If every inbound route has a positive finite capacity, available capacity / total capacity supplies the ratio. Otherwise use normal inbound route count / total inbound route count. Capacity weights assume comparable generic units and comparable operating frequencies; shipment frequency is not separately modeled.
- **Depletion:** daily demand × (1 − supply availability). Remaining inventory = max(0, starting inventory − depletion × shutdown days).
- **Timing:** coverage = inventory / positive daily demand; projected stockout day = inventory / depletion. Zero depletion means no disruption-driven stockout. Stockout exactly at the horizon is flagged, with zero unserved time during that horizon.
- **Outcomes:** Stockout if the buffer reaches zero within the horizon; Protected if it lasts through the horizon; No Data when inventory or positive daily demand is missing. There is no intermediate current-day state because this version evaluates the end of the selected period, not timeline playback. Unknown outcomes are never labeled proof of protection.
- **Network risk stays separate:** a facility can retain high network exposure and transport delay while inventory protects service. Map labels and the Inventory Impact detail group distinguish those concepts. The earliest-stockout insight and expandable summary order stockouts by day.
- **KPI adjustment:** Facilities at Risk counts projected stockouts plus still-at-risk topology fallbacks, excluding protected facilities and the source. Service starts with the existing rounded, bounded topology penalty and scales it by retained exposure weight / original exposure weight. A calculated stockout retains the fraction of the horizon after its stockout day; protected facilities retain zero; missing data retains full weight. Custom source shutdown weight remains 3. Criticality does not change physical or business calculations in v0.9. Lead time and logistics cost are unchanged, including their topology-based cost exposure.
- **Safety:** projections are derived results, never writes to the network. Reset, Build mode and refresh clear results; saved starting inventory remains intact. Old files and networks need no migration.

This is a static supply-loss approximation, not a full flow/inventory planner: affected legs are assumed unavailable from Day 0, even if an upstream facility has its own buffer. It does not transfer upstream inventory downstream, accumulate pipeline inventory, model transit arrival times, simulate replenishment/recovery, or solve cycles as flow equations. Existing traversal handles cycles once, and inventory calculations do not introduce another recursive traversal.

The Demo uses explicitly illustrative buffers: Los Angeles 4,000 units / 1,000 daily demand (Day 4), Ontario 7,200 / 800 (Day 9), Chicago 10,000 / 500 (protected through Day 14). New York intentionally lacks data to demonstrate fallback. These are not real company values. Mitigation recomputes inventory after its route adjustments: the Singapore bypass supplies half of LA's two inbound legs; existing emergency/normal-risk mitigation protection is treated as full supply. This remains the predefined demo behavior, not a new optimization or custom mitigation system.

## Operational Network Data Layer

Facilities and routes support optional aggregate operational data. In Build mode, select an element and expand **Operational Data**. Leave fields blank to keep them unset; clearing a field removes its saved value. Invalid entries display inline errors and preserve the last valid saved value. Existing networks and files remain valid, with no migration or invented defaults. Only three Demo facilities have illustrative inventory data.

| Facility field / optional import column | Meaning |
| --- | --- |
| `capacity` | Maximum generic units/day |
| `current_inventory` | Available generic units |
| `daily_demand` | Demand or flow requirement, generic units/day |
| `utilization` | 0–100% |
| `replenishment_lead_time` | Days |
| `criticality` | Low, Medium, High, Critical; user-entered metadata |

| Route field / optional import column | Meaning |
| --- | --- |
| `transit_time` | Days, including decimals |
| `cost_per_shipment` | USD |
| `route_capacity` | Generic units per shipment |
| `shipment_frequency` | Shipments/week |
| `reliability` | 0–100%; metadata only |

Numeric values must be finite and non-negative; percentages cannot exceed 100. These columns work in both Excel worksheets and paired CSV files. Updated CSV templates include one illustrative enriched facility and route; all additional columns are optional. Imports report how many facilities/routes contain operational values.

Facility inspection shows populated operations and **inventory coverage = current inventory / daily demand** when inventory exists and demand is positive. Missing or zero demand produces no coverage value. Select a route in Simulate mode to inspect its endpoints, mode, current state, and operations. Build mode uses the existing route editor. The network indicator counts each facility/route with at least one populated operational field as enriched; zero counts as a populated value.

Values persist through the existing schema and shared Network model. Internal property names use camelCase; imports use the snake_case columns above. Units are generic until product/SKU modeling exists. Inventory and demand now drive depletion projections; route capacity can weight inbound supply. Other operational metadata remains informational. Capacity-constrained production, custom mitigation, and SKU detail remain deferred.

## CSV / Excel Supply Chain Import

Choose **Import Network**, upload an `.xlsx` workbook or a pair of CSV files, then **Validate and preview**. Review the network name, detected facility/route counts, type/mode breakdowns, errors, and warnings before selecting **Import Network**. Confirmation creates a new custom network in Build mode; the current network and Demo Network are never overwritten. Imported networks use the same model, editor, localStorage, map, and shutdown simulator as manually built networks.

Excel requires **Facilities** and **Routes** worksheets (case-insensitive). CSV requires separate comma-separated Facilities and Routes files, with headers in the first nonempty row. Download the two minimal CSV templates from the import dialog; they can also be pasted into the corresponding Excel worksheets.

| Table | Required columns | Optional columns |
| --- | --- | --- |
| Facilities | `id`, `name`, `type`, `latitude`, `longitude` | `city`, `region`, `country` |
| Routes | `id`, `source`, `destination`, `mode` | None |

Facility types are Supplier, Factory, Port, Distribution Center, and Customer Market; `DC` is accepted. Modes are Ocean, Truck, Rail, Air, Road, and Feeder. Whitespace and capitalization are normalized for headers/types/modes. Explicit header aliases `lat`, `lon`/`lng`, `from`, and `to` are accepted. IDs remain case-sensitive; store Excel IDs as text to retain leading zeros. Unknown values are rejected rather than guessed.

Errors identify the table, row where available, field, and correction. Missing required values, duplicate IDs, invalid coordinates/types/modes, broken references, self-routes, and duplicate directional connections block import. Isolated facilities and disconnected components produce warnings but may be imported. Failed imports create nothing. Replacing files clears the old preview; confirmation is required after validation.

Parsing stays in the browser: Papa Parse handles CSV quoting/newlines, and a lazily loaded `read-excel-file` handles `.xlsx`. Formula cells use their saved calculated values; formulas, macros, and external content are not executed. Required formula cells without usable saved values fail validation; optional unresolved cells remain unset. No files are uploaded or retained in network storage.

Limits: 10 MB per file, 2,000 facilities, and 10,000 routes. Validation is tested with 600 facilities and 1,794 routes; dense-map performance is not an enterprise-scale guarantee. Coordinates are required, with no geocoding, ERP/API integration, SKU import, or custom mitigation. `.xls`, automatic column mapping, and a pre-confirmation map preview are deferred; the statistical preview covers this version.

## Visual network builder

Choose **Create New Network** to start with an empty map in **Build** mode. Name the network, choose **Add Facility**, select a facility type, then click the map. Coordinates are calculated automatically; Enter places at the map center. Select a facility to edit its name, type, or location label, move it on the map, or delete it. Deleting a facility requires confirmation and removes its connected routes.

Choose **Create Route**, click the origin and destination facilities, choose transportation mode, and confirm. Routes are directional. Ocean, Truck, Rail, and Air are available alongside the original Road and Feeder modes. Select a route on the map or in the expandable network list to edit its endpoints/mode or delete it with confirmation. Self-connections, missing endpoints, and duplicate connections with the same direction and mode are rejected. Escape or Cancel exits an unfinished action.

Custom networks save automatically in this browser's localStorage, including names, coordinates, routes, and the last selected network. The network selector reopens saved networks. Storage is local to this browser and origin, with JSON backup/restore but no account, cloud sync, or undo. Storage failures show a warning; invalid saved data is left untouched rather than overwritten. Clearing browser storage removes custom networks.

**Demo Network** is protected from builder edits and retains its 14 facilities, 13 routes, Shanghai scenario, KPIs, mitigations, and comparison. Custom networks now support Facility Shutdown in **Simulate** mode.

## Generalized Custom Disruption Simulation

Build your network, switch to **Simulate**, select any facility on the map or in the shutdown dropdown, choose 7, 14, 21, 30, 60, or 90 days, and select **Run shutdown**. Inspect affected facilities for risk, source, hops, and estimated delay. **Reset to baseline** clears the result while preserving your network, camera, and selection. Entering Build mode also clears the shutdown. Refresh saves only the network structure, never an active scenario.

Shanghai and custom shutdowns use the same directed breadth-first traversal through `lib/simulation/facility-shutdown.ts`. The source is disrupted; downstream facilities receive high risk at one hop, medium at two, and low at three or more. Direct dependencies receive the shutdown duration as delay; each additional hop retains 65%, rounded to whole days. Routes touching the closed facility are blocked; other routes leaving reached facilities are affected. Upstream facilities stay normal unless a directed cycle reaches them. Cycles are visited once at the shortest distance; disconnected components stay unaffected. Terminal and isolated shutdowns are valid, localized scenarios.

Custom KPI assumptions are centralized in `CUSTOM_MODEL` and `IMPACT_MODEL`:

- **Baseline:** 97% service, 12-day lead time, $50,000 per facility plus $25,000 per route, zero at-risk facilities.
- **Facilities at Risk:** calculated downstream count, excluding the closed source.
- **Service:** subtract 40 × weighted exposure × duration/14 percentage points, rounded, with a 50% floor. Weights are 3 for the source/high risk, 2 for medium, and 1 for low; exposure divides the total by 3 × network facility count.
- **Lead time:** baseline plus mean additional delay across all network facilities (unaffected facilities contribute zero), rounded. The closed source's delay counts so localized shutdowns still have an impact.
- **Cost:** baseline plus daily penalties of $4,000 per blocked route, $2,000 per affected route, $500 per at-risk facility, and $500 for the closed facility, multiplied by duration.

These are the topology-only formulas before the inventory adjustment above. They remain exact for networks without usable inventory data. More disconnected facilities dilute service and mean-delay exposure; they do not provide alternate supply. The public shutdown input validates whole days from 1 to 90. Mitigation remains demo-only; capacity-constrained simulation and custom mitigation are not modeled. Undo/redo remains deferred.

Both modes use the same map renderer and `{ id, name, kind, facilities, routes }` network model. `lib/networks.ts` contains pure validation, immutable edits, and versioned persistence parsing; `lib/use-networks.ts` handles browser storage; `lib/use-network-builder.ts` handles editing gestures. `lib/map-projection.ts` shares placement and rendering coordinates. Simulation state is never saved into custom network data.

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
2. Zoom with the wheel, trackpad, keyboard, or map controls. Drag to pan and use **Fit network** to restore the camera.
3. Hover or focus a facility for lightweight details. Click or tap it to keep its name, type, region, status, and disruption impact in the detail panel.
4. Select **Activate disruption**. Shanghai closes, three routes are blocked, three downstream routes are affected, and four downstream facilities become at risk.
5. Inventory buffers produce Day 4 and Day 9 stockouts and protect Chicago. Service transitions from 97% to 89%, lead time from 12 to 20 days, cost from $1.2M to $1.48M, and facilities at risk from 0 to 3 (two stockouts plus New York's topology fallback).
6. Choose **Do Nothing**, **Reroute Through Alternate Port**, or **Air Freight Critical Flow**. Open **Compare all three responses** to see the tradeoffs together. Switching updates KPIs, map states, and selected facility details.
7. Select **Reset to baseline** to clear mitigation and comparison state and restore the network and KPIs while preserving the camera and selected facility.

## Architecture

React + TypeScript, Vite through the Sites Vinext scaffold. The production application is a static export; it has no application backend, database, authentication, or runtime data service. The provided scaffold includes build/hosting dependencies; it is intentionally preserved. The installed button and tooltip primitives handle keyboard interactions. Geography is bundled locally, with no map API key or runtime tile service.

- `lib/data/network.ts`: facility and route interfaces and mock network.
- `lib/data/scenario.ts`: scenario metadata and cached calculated results.
- `components/simulator/network-map.tsx`: interactive map composition and camera controls.
- `components/simulator/network-routes.tsx`: route paths and directional flow animation.
- `components/simulator/facility-marker.tsx`: facility markers and hover tooltips.
- `components/simulator/facility-details.tsx`: persistent selected-facility inspection.
- `components/simulator/map-legend.tsx`: facility-type, facility-state, and route-state keys.
- `components/simulator/kpi-cards.tsx`: KPI display and baseline deltas.
- `components/simulator/scenario-controls.tsx`: activate/reset controls.
- `components/simulator/dashboard.tsx`: single scenario state and dashboard composition.
- `lib/map-camera.ts` and `lib/use-map-camera.ts`: bounded zoom, pan, fit, pointer, touch, wheel, and keyboard behavior.
- `lib/use-animated-kpis.ts`: restrained numeric KPI transitions with reduced-motion support.
- `lib/use-scenario-tools.ts`: optional feature-detected WebMCP action using the same state as the controls. Browsers without the proposed API are unaffected.

## Assumptions and limits

This is a deterministic visual demonstration with a simplified aggregate inventory model, not a prediction or planning system. KPI values are illustrative scenario-period outcomes, not forecasts. At-risk facilities exclude the closed source itself. In the Shanghai scenario, upstream suppliers and factories retain normal status even when a connection into Shanghai is blocked. Singapore's separate Europe and Oceania flows remain operational.

Routes are schematic connections, not navigable maritime paths. Markers use exact coordinates; only labels have display offsets. The map uses a Pacific-centered equirectangular projection. No individual shipments, automatic routing, historical data, or day-by-day inventory simulation are included.

The current basemap is `lib/data/geography.json`, generated as described above. The older `lib/data/land.ts` and `public/land.geojson` remain as historical source assets and are no longer rendered.

Tests cover camera bounds, network integrity, downstream discovery, severity and delays, route blocking, independent flows, cycles/converging paths, network edits, duration changes, KPI formulas, invalid inputs, immutability, and baseline reset.

## How the cascade works

Routes define directed goods flow (`from` → `to`). Breadth-first search starts at the closed facility and follows outbound routes, recording each facility once at its shortest hop distance. Routes entering or leaving the closed port are physically blocked, but facility risk travels downstream only. Other routes leaving affected facilities become affected.

The source is disrupted; one hop means high risk, two means medium risk, and three or more means low risk. Additional delay is closure duration × 0.65 for each hop after the first, rounded to whole days. This attenuation is an illustrative assumption, not a forecast.

Shanghai reaches Los Angeles (high, 1 hop, +14 days), Ontario (medium, 2 hops, +9 days), Chicago (low, 3 hops, +6 days), and New York (low, 4 hops, +4 days). Three routes are blocked and three affected. Changing the network changes discovered impacts without editing scenario membership lists.

Pure topology traversal and initial KPI calculations live in `lib/simulation/propagate-disruption.ts`. The following values describe the topology-only result BEFORE the v0.9 inventory layer adjusts service and risk:

- **Facilities at Risk:** downstream high-, medium-, and low-risk facilities; excludes the disrupted source. Shanghai: 4.
- **Average Lead Time:** baseline 12 days plus mean additional delay across the originally exposed downstream facilities, rounded to whole days. Keeping this cohort after mitigation counts residual delays even when risk clears. No exposed facilities means no added delay. Shanghai: 12 + (14 + 9 + 6 + 4) / 4 → 20 days.
- **Service Level:** baseline 97% minus 2 percentage points × severity weight sum × duration / 14. High/medium/low weights are 3/2/1; clamp to 50–100% and round. Shanghai: 97 − 2 × 7 → 83%.
- **Logistics Cost:** baseline $1.2M plus duration × ($4,000 per blocked route + $2,000 per affected route + $500 per at-risk facility). Shanghai: $1.2M + 14 × ($12,000 + $6,000 + $2,000) = $1.48M.

Longer disruptions increase penalties until service reaches its floor. More exposed or nearer facilities increase service penalties. Mean delay describes affected facilities, so adding a distant, lightly delayed facility can lower that average. Reset uses zero duration to remove all impacts and restore baseline KPIs (97%, 12 days, $1.2M, 0).

Every reachable dependency is initially exposed. Cycles are safe and multiple paths use shortest distance rather than duplicate impacts. The inventory layer then uses optional operational data to refine service and risk. Shanghai is the only Demo scenario; Custom Networks support any facility shutdown.

## Mitigation and comparison

The pipeline is **Network → Disruption → Downstream propagation → Business impact → Mitigation → Scenario comparison**. `lib/simulation/mitigation.ts` applies centralized recovery parameters to the same immutable v0.3 disruption result. It then uses the shared KPI calculation with adjusted risk, delays, and route states, adding the intervention premium. Switching never compounds strategies.

- **Do Nothing:** preserves the unmitigated result exactly, with no intervention premium.
- **Reroute Through Alternate Port:** uses existing Singapore Port. Two temporary legs, Shenzhen → Singapore → Los Angeles, bypass Shanghai; Suzhou can feed Shenzhen via its existing route. These legs appear in lavender only while selected (14 facilities, 15 routes). Shanghai and its three physical connections stay closed. Downstream delays retain 45% of their original value, rounded; risk improves one level (high → medium → low → normal). The premium is $10,000 per closure day, covering the illustrative alternate-flow intervention.
- **Air Freight Critical Flow:** treats exposed distribution centers and customer markets as critical demand. Delays retain 20%, with a one-day cap for these critical facilities; risk improves two levels. Critical facilities get a subtle protection ring. Los Angeles retains low risk and a three-day delay; Shanghai stays closed. No aviation routes are added. The premium is $35,000 per closure day.

These recovery assumptions stand in for partial alternate capacity and protected critical demand; they are not capacity estimates or an optimization. A normal risk level after intervention means exposure is controlled, not that all delay has disappeared. Downstream routes return to normal when their source's risk clears. Original source/hop information stays available in facility details alongside original and mitigated delays.

| Response | Service | Lead time | Logistics cost | At risk |
| --- | ---: | ---: | ---: | ---: |
| Do Nothing | 89% | 20 days | $1,480,000 | 3 |
| Reroute via Singapore | 95% | 16 days | $1,578,000 | 2 |
| Air Freight Critical Flow | 96% | 14 days | $1,893,000 | 1 |

These are calculated examples, not stored KPI overrides. Reroute delays are 6/4/3/2 days; air delays are 3/1/1/1. Before the inventory layer, the existing severity weights still give service levels of 91% and 95%. Costs use remaining topology penalties plus the daily strategy premium. There is no free mitigation: service and speed improve at a higher total logistics cost.

The comparison calculates all three results once from the same closure, highlights highest service and lowest delay/cost/risk (including ties), and marks the selected response. No strategy is universally best. Summaries are predefined business explanations, not AI recommendations. Reset removes the selected mitigation, alternate routes, protection indicators, delay metadata, and open comparison.

v0.9 retains all 85 existing tests (updating two Demo KPI expectations and keeping the old-network fixture unenriched) and adds 23 inventory tests: full/partial supply, capacity weighting and fallback, boundary stockouts, missing data, cycles, terminal/disconnected nodes, service/risk behavior, imported data, mitigation recalculation, immutable inputs, persistence and reset. Total: 108 tests. Existing stylesheet consolidation and scaffold dependency updates remain deferred, along with SKU detail, replenishment schedules, pipeline inventory, capacity-constrained production and custom mitigation.

## v0.10 validation and dependency review

116 tests pass: all 108 simulation/import/builder tests retained, plus eight tests for source-only backup/restore, invalid backup handling, partial library recovery and immutable deletion. Production static-preview checks cover welcome entry, keyboard route creation, custom stockout simulation, refresh, Excel/CSV import, invalid JSON, backup restore, confirmed deletion, metadata and responsive layouts. Storage corruption is exercised through the pure recovery tests; no existing user browser storage was altered to inject corruption.

The 2026-09-13 npm audit reports 11 advisories: 8 high, 2 moderate, 1 low. Affected packages are `@cloudflare/vite-plugin`, `esbuild`, `image-size`, `miniflare`, `react-server-dom-webpack`, `sharp`, `undici`, `vinext`, `vite`, `wrangler`, and `ws`. These existing framework/build/server dependencies were not broadly upgraded or removed. The deployed artifact is static browser output, but this is not a claim that every advisory is irrelevant: review and update affected dependencies in a separate regression-tested maintenance pass before making security assurances. Do not expose development or prerender servers publicly. The existing component/scaffold dependency set is retained to avoid breaking build tooling or component imports.

No formal accessibility certification, bespoke social preview image, cloud saving, or new simulation algorithms were added. Open Graph and Twitter summary metadata use text; favicon and same-origin templates are included in the static output.
