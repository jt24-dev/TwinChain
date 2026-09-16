# Builder

## Responsibility

Create and edit the structural source data of a Custom Network: name, facilities, geographic placement, directed routes, transportation modes, and optional operational fields. Build mode sends validated immutable edits into the shared network library and persistence layer. The Demo Network remains read-only.

## Key Files

- `lib/networks.ts` — `SupplyNetwork`, allowed facility types/modes, `NetworkEdit`, structural validation, immutable `editNetwork`, and Demo protection.
- `lib/data/network.ts` — `Facility`/`Route` types and source coordinate/mode fields.
- `lib/operations.ts` — optional facility/route operational field definitions, parsing, validation, and derived coverage display.
- `lib/use-network-builder.ts` — builder operation/selection state, add/move/route workflows, generated IDs, errors, and deletion confirmation state.
- `components/simulator/network-builder.tsx` — Build side panel, facility/route forms, network naming, operational fields, and delete controls.
- `components/simulator/operational-data.tsx` — shared operational field editing/display UI.
- `components/simulator/network-map.tsx` — map placement preview, facility/route selection, and pointer-to-coordinate handoff.
- `lib/map-projection.ts` — exact inverse projection used by placement and movement.
- `lib/use-networks.ts` — applies edits to the active Custom Network and persists them.

## Data Flow

Build mode is enabled only for `network.kind === "custom"`. `useNetworkBuilder` keeps transient UI state (`idle`, `add`, `move`, or `route`) and selected facility/route IDs. Map clicks are converted to geographic coordinates, then the hook constructs a `NetworkEdit`. Form changes also become `NetworkEdit` objects.

`useNetworks.edit` calls `editNetwork` before scheduling state. `editNetwork` returns a new network, validates the complete result, and never mutates the input. Valid state is written to the saved library; the localStorage effect persists it. Deleting a facility also removes its inbound and outbound routes. Deleting/editing a route preserves facilities.

Route direction is structural (`from → to`). Supported modes are Ocean, Truck, Rail, Air, Road, and Feeder. Facilities support Supplier, Factory, Port, Distribution center, and Customer market. Optional operational fields come from `operations.ts`; blanks remain absent rather than becoming zero.

## Important Invariants

- Build Mode changes source network structure. Derived simulation fields (`impact`, route `status`, inventory projections, KPI values, mitigation metadata, `alternate`) must never become persistent source fields.
- All edits are immutable and validated before the saved state changes.
- Demo ID/data is protected from builder mutation, deletion, or import replacement.
- Facility IDs and route IDs are unique; endpoints must exist; source and destination differ; duplicate directional route+mode combinations are rejected.
- Coordinates must be finite decimal latitude/longitude in valid ranges. Moving a facility changes actual source coordinates, not a visual offset.
- Deleting a facility cleans up connected routes atomically.
- Optional operational fields stay optional, nonnegative, and within percentage bounds where defined.
- Switching networks or leaving active Build mode cancels transient operations and stale selections.
- Imported networks are `kind: "custom"` and must use this same editing path.

## Relevant Tests

- `tests/networks.test.mjs` — creation, edits/moves, deletion cleanup, route direction/modes, validation, persistence, Demo protection, projection placement, and derived-field stripping.
- `tests/operations.test.mjs` — optional values, validation, persistence, old schema compatibility, and completeness.
- `tests/network-import.test.mjs` — imported networks remain editable and persist through the same model.
- `tests/product.test.mjs` — backup allowlist, restore safety, recovery, and deletion.
- `tests/geospatial.test.mjs` — source coordinate fidelity.

## Common Change Areas

- New structural/operational field: update types, validation/allowlist, builder form, import contract/templates if applicable, and persistence compatibility tests.
- Placement/movement: map pointer handling and projection inverse, then network/geospatial tests.
- Route workflow/modes: builder hook, builder panel, shared validation, renderer/legend if visual semantics change.
- Create/delete/rename behavior: `networks.ts`, `use-networks.ts`, and builder/product tests.

## Usually Unrelated

Avoid disruption coefficients, inventory/KPI calculations, mitigation rules, homepage/Pricing content, Natural Earth data, and generated output. Builder changes generally should not require separate imported-network logic.
