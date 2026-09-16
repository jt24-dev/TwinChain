# Simulation

## Responsibility

Turn a directed `SupplyNetwork` and facility-shutdown input into immutable, deterministic impact state: disrupted/at-risk facilities, blocked/affected routes, downstream hop distance, delay, inventory outcomes, and business KPIs. This domain supplies results to the UI but does not own map drawing or network editing.

## Key Files

- `lib/simulation/model.ts` — shared KPI, severity, impact, inventory, route, mitigation, and result types; centralized base impact constants.
- `lib/simulation/propagate-disruption.ts` — directed graph traversal, severity/delay propagation, route states, and topology KPI calculation.
- `lib/simulation/facility-shutdown.ts` — shutdown validation, Custom baseline, Custom KPI normalization, and shared inventory pass.
- `lib/simulation/inventory.ts` — supply availability, depletion, stockout/protection/no-data outcomes, summary, and service adjustment.
- `lib/data/scenario.ts` — Demo Shanghai scenario orchestration and Demo baseline/results.
- `lib/data/network.ts` — source Demo topology and `Facility`/`Route` interfaces.
- `components/simulator/custom-shutdown-controls.tsx` and `scenario-controls.tsx` — user inputs only; business calculations remain outside React.
- `components/simulator/kpi-cards.tsx`, `inventory-impact.tsx`, and `facility-details.tsx` — result presentation.

## Data Flow

`runFacilityShutdown(nodes, routes, input)` validates a `facility-shutdown` with a whole-number duration from 1–90 days. `simulateDisruption` performs breadth-first traversal over outbound routes. The shutdown source is hop 0/disrupted; downstream facilities record their shortest hop distance, source metadata, severity, and deterministic additional delay. Incident routes at the disrupted source are blocked; downstream routes may be affected rather than physically blocked.

For Custom Networks, `calculateCustomImpact` scales service penalties by exposed severity and network size, calculates mean delay and logistics penalties, and passes the result to `applyInventoryImpact`. Demo orchestration uses the same generic shutdown engine with Demo profile behavior.

Inventory groups inbound impacted routes by destination. When every inbound route has positive comparable capacity, availability is capacity-weighted; otherwise every inbound route receives an equal share. Blocked/affected inbound routes contribute no available share. Current inventory divided by positive daily demand gives coverage. Depletion equals demand times missing supply. A stockout is projected when coverage under that depletion reaches the disruption horizon. Usable data yields `stockout` or `protected`; missing inventory/demand yields `no-data` and keeps topology-based risk.

Inventory adjusts risk count and service impact, while topology-derived lead time and logistics cost remain intact. Source values are copied into result objects; the stored network is never changed.

## Important Invariants

- Results are deterministic; no random values or time-dependent behavior.
- Traverse downstream only through explicit `from → to` direction.
- Cycles, self-loops in malformed direct function inputs, converging paths, disconnected components, terminal nodes, and isolated facilities must terminate safely without duplicate impacts.
- Record shortest hop distance and do not rediscover the shutdown source.
- The original `Facility[]` and `Route[]` must never be mutated.
- Risk, route status, inventory projection, and KPIs are derived state and must not enter persistence/import schemas.
- Missing operational data uses the established `no-data`/topology behavior. Never fabricate stockout timing or inventory protection.
- Capacity weighting is used only when all inbound capacities are positive and finite; mixed/missing capacity falls back for the whole inbound set.
- Values remain bounded: supply 0–1, inventory nonnegative, and service within its configured floor/100%.
- Reset returns the baseline and clears all derived metadata without changing source data.

## Relevant Tests

- `tests/propagation.test.mjs` — BFS, hops, cycles, route states, delays, and KPI formulas.
- `tests/facility-shutdown.test.mjs` — generalized shutdowns, baselines, duration, safety, and reset.
- `tests/inventory.test.mjs` — supply shares, depletion, stockouts, no-data, service adjustment, immutability, imports, and mitigation recalculation.
- `tests/scenario.test.mjs` — Demo topology and Shanghai compatibility.
- `tests/operations.test.mjs` — operational fields and unchanged baseline behavior.

## Common Change Areas

- Propagation/severity/delay: `propagate-disruption.ts` plus propagation/facility-shutdown tests.
- Inventory/stockout assumptions: `inventory.ts` plus inventory tests.
- Portfolio KPI behavior: `model.ts`, `facility-shutdown.ts`, and focused KPI tests.
- New result presentation only: consume existing result types in UI; do not move formulas into components.

## Usually Unrelated

Avoid map projection, basemap assets, product navigation, Pricing copy, import UI, builder forms, and CSS unless the request explicitly changes how simulation results are presented. Mitigation-specific rules belong in the mitigation domain.
