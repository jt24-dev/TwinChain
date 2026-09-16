# Mitigation

## Responsibility

Apply a deterministic response to an already calculated disruption, recalculate affected inventory/KPIs, and compare the response with the same Do Nothing baseline. Demo and Custom Networks share result metadata and rendering, while retaining separate rule modules because the Demo responses are predefined for Shanghai.

## Key Files

- `lib/simulation/custom-mitigation.ts` — v0.13A Custom Do Nothing, Reroute, Expedite eligibility/effects, constants, validation, and summary copy.
- `components/simulator/custom-mitigation-controls.tsx` — Custom target selection, feedback, assumptions, and compact baseline comparison.
- `lib/simulation/mitigation.ts` — predefined Demo strategy rules and alternate Demo routes.
- `components/simulator/mitigation-controls.tsx` and `strategy-comparison.tsx` — Demo response UI/comparison.
- `lib/simulation/inventory.ts` — recalculates inventory from mitigation-provided supply availability.
- `lib/simulation/facility-shutdown.ts` — shared Custom KPI/inventory recalculation.
- `lib/simulation/model.ts` — mitigation metadata and alternate-route flag.
- `components/simulator/network-routes.tsx`, `map-legend.tsx`, `route-details.tsx`, and `facility-details.tsx` — mitigation visualization/explanation.
- `components/simulator/dashboard.tsx` — holds original disruption separately from selected strategy/result and clears mitigation on reset/network changes.

## Data Flow

Custom flow:

```text
original Custom disruption
→ mitigation choice and eligible target
→ immutable facility/route adjustments
→ calculateCustomImpact
→ applyInventoryImpact
→ selected result + Do Nothing comparison
```

Do Nothing returns the original result unchanged.

Reroute begins with a blocked/affected inbound flow whose destination is exposed. `rerouteOptions` finds an existing operational route to that same destination from an unexposed source and rejects self-routing/cycles. It does not search for a new path. With comparable capacity, recovery uses spare alternate capacity after its current share, capped by the selected lost share. Missing capacity restores half the lost share. It blends original delay with route transit time, adds a deterministic cost premium, and marks the selected existing route `alternate` for map styling. The physically blocked route remains blocked.

Expedite applies to one downstream facility with disrupted supply. It restores 80% of missing supply, retains 20% of delay, and adds an emergency cost based on demand, recovered volume, and disruption duration. Missing demand uses the centralized fallback. This is a supply adjustment, not a generated aviation network.

Demo `applyMitigation` keeps the predefined Shanghai/Singapore behavior. It uses the same `StrategyId`, result metadata, KPI/inventory layers, and map styling, but should not be assumed generic.

## Important Invariants

- Always apply a strategy to the original disruption result. Never apply a mitigation to an already mitigated result.
- Switching Do Nothing/Reroute/Expedite must not compound benefits or costs.
- Do Nothing preserves facilities, routes, inventory, stockouts, and KPIs exactly.
- Stored source network inventory, routes, operations, and structure remain unchanged.
- Reject invalid targets, unavailable/exhausted alternates, unrelated facilities, and cyclic/self-routing choices with clear feedback.
- Reroute requires actual existing topology; do not claim optimization or invent an alternate connection.
- Missing inventory remains `no-data`; mitigation must not invent protection.
- All fallback coefficients live in `CUSTOM_MITIGATION_MODEL`, not React components.
- Reset/network/mode changes clear selected targets, alternate styling, mitigation projections, and comparison state.
- Preserve Demo outputs and existing Demo tests unless a request explicitly changes them.

Current deferrals: automatic routing/optimization, downstream reallocation, Alternate Source, Inventory Transfer, multiple simultaneous interventions, mitigation history, and a full all-strategy comparison dashboard.

## Relevant Tests

- `tests/custom-mitigation.test.mjs` — eligibility, capacity, cycles, fallbacks, stockout/KPI effects, non-compounding, immutability, and reset.
- `tests/mitigation.test.mjs` — Demo behavior, alternate legs, comparison, repeat switching, duration, and compatibility.
- `tests/inventory.test.mjs` — mitigation inventory recalculation and source immutability.
- `tests/facility-shutdown.test.mjs` and `scenario.test.mjs` — disruption baseline compatibility.

## Common Change Areas

- Custom coefficients/eligibility: `custom-mitigation.ts` and its focused tests.
- Demo assumptions: `mitigation.ts`, `data/scenario.ts`, and Demo tests.
- Selection/comparison UX: corresponding controls; keep calculations in the simulation layer.
- Styling: route/facility components, legend, details, and scoped CSS.

## Usually Unrelated

Avoid import parsing, builder editing, persistence schema, product pages, map projection/camera math, and basemap data. A mitigation UI request usually does not require changing BFS propagation unless the disruption contract itself changes.
