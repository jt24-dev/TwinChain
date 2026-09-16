# TwinChain Project Context

## Product

TwinChain is a client-side supply-chain resilience simulator. Users can open the built-in Demo Network, create a Custom Network visually, or import a network from Excel, paired CSV files, or a TwinChain JSON backup. A network contains geographically located facilities and directed transportation routes, with optional operational fields such as inventory, demand, capacity, transit time, cost, frequency, reliability, and criticality.

In Simulate mode, a user shuts down a facility for a fixed duration. TwinChain traverses directed routes downstream, marks the shutdown source and exposed facilities, estimates deterministic delay, classifies route and facility states, projects inventory depletion and stockouts where data permits, and recalculates service level, lead time, logistics cost, and facilities at risk. Missing inventory or demand produces a clearly labeled topology estimate rather than invented stockout data.

The Demo Network has a predefined Shanghai Port Closure and Demo-specific response assumptions. Custom and imported networks use the generalized shutdown engine. Their current mitigation choices are Do Nothing, Reroute through an eligible existing inbound connection, and Expedite / Air Freight for one exposed downstream facility. Mitigation always compares against the original disruption result.

## Current Product State

The product includes:

- A Home, Pricing, About/Methodology, and workspace shell with shared navigation.
- Distinct Try Demo, Open App, Build, and Import flows.
- A visual Custom Network builder for facilities, coordinates, directed routes, transportation modes, and optional operational data.
- Client-side `.xlsx`, paired CSV, and JSON backup import/restore, with preview and validation before atomic creation.
- JSON export, local browser persistence, saved-network continuation, and recovery of valid records from partially damaged storage.
- A geographic world map with Natural Earth context, accurate latitude/longitude projection, route curves, dateline handling, pan, intentional wheel zoom, touch/keyboard controls, and network fitting.
- Deterministic downstream disruption propagation, inventory depletion, projected stockouts, KPI impact, Demo mitigation, and targeted Custom Network mitigation.
- Pure-function tests covering the model, imports, persistence, map geometry, simulation, inventory, mitigation, and product entry state. The current suite is approximately 148 tests.

## Technical Philosophy

Keep the architecture small, explainable, and client-side first. There is no application backend, database, authentication, cloud account, payment system, or server-side simulation. Do not add infrastructure merely because a feature could use it eventually.

Simulation must remain deterministic: the same network, shutdown, duration, and mitigation choice produce the same result. Reuse the shared `SupplyNetwork`, simulation, inventory, and rendering layers. Imported networks become ordinary Custom Networks; they must not acquire a separate renderer or simulator. Saved/imported network compatibility matters, especially because users may have local data created by earlier versions.

Structural network data and derived simulation state are different concerns. Persist facilities, routes, optional operational fields, names, and active network selection. Do not persist camera position, UI selection, disruption results, risk, stockout projections, KPI results, or mitigation overlays as source data.

Prefer transparent assumptions and centralized coefficients to hidden scoring, random values, or UI-level business logic. Demo-specific behavior may remain isolated when generalizing it would create regression risk.

## Development Priorities

Simulation correctness and source-data immutability come first. Visual polish and stable simulator layout matter because the map is the main product surface. Preserve keyboard, touch, laptop, and tablet usability when changing interactions.

Changes should be incremental and narrowly scoped. Read the relevant domain file under `.ai/domains/`, then inspect only its listed source and tests. Avoid broad refactors, duplicate pipelines, and unrelated cleanup. Run focused tests first; broaden validation only when the change crosses shared data/simulation layers or the request requires it.

Token and session efficiency are explicit project priorities. Trust these context files until code evidence shows they are stale. Update the relevant context document when a completed architectural change makes it materially inaccurate.
