# Product UI

## Responsibility

Provide the public Home/Product/How It Works/Pricing/About shell, explicit product entry flows, workspace selection, and the stable simulator composition around shared map, KPI, controls, and result areas. This domain coordinates state and presentation; simulation/import/model calculations stay in their own modules.

## Key Files

- `app/page.tsx` and `components/simulator/dashboard.tsx` — main entry and product/simulator orchestration.
- `lib/product-entry.ts` — canonical Home, Product, How It Works, workspace, Demo, selected-network, and Pricing links/query parsing.
- `components/simulator/product-navigation.tsx` — shared header/footer navigation.
- `components/simulator/product-home.tsx` and `product-preview.tsx` — homepage content and real Demo-derived preview.
- `app/product/page.tsx`, `app/how-it-works/page.tsx`, `product-page.tsx`, and `how-it-works-page.tsx` — dedicated product and workflow marketing pages.
- `components/simulator/workspace-home.tsx` — saved networks plus Create/Import/Demo entry.
- `app/pricing/page.tsx` and `components/simulator/pricing-page.tsx` — dedicated Pricing route/content.
- `components/simulator/product-info.tsx` — About/Methodology dialog and privacy/local-data explanation.
- `components/simulator/kpi-cards.tsx`, `network-map.tsx`, `scenario-controls.tsx`, `custom-shutdown-controls.tsx`, and result/mitigation components — simulator layout regions.
- `components/simulator/scenario-history.tsx`, `lib/scenarios.ts`, and `lib/use-scenarios.ts` — compact local scenario save/history UI, persistence, validation, and deterministic reopen orchestration.
- `lib/scenario-comparison.ts` — session-only selection limits, network compatibility, baseline/reference choice, stockout labels, and per-metric standings for saved scenarios.
- `app/globals.css` — shared responsive shell, map/KPI dimensions, and stable result-area styling.

## Data Flow

`app/page.tsx` renders `Dashboard`. `resolveProductEntry` maps missing/unknown query state to Home. `/` always opens Home. `/?view=app` opens the workspace chooser; `/?view=demo` selects Demo and Simulate mode; `/?view=network` opens the currently selected network. `Dashboard.navigate` updates browser history, and a `popstate` listener restores entry state.

Try Demo explicitly selects the built-in Demo Network. Open App opens the general workspace where saved networks can be continued and new/import flows started. Selecting or creating a network opens its shared simulator; imported networks enter Build mode. Product, How It Works, and Pricing are dedicated static routes. About and Methodology use the same dialog throughout the public shell and simulator.

Within the simulator, `Dashboard` derives one current result and renders KPI cards above a two-column workspace: map plus context on the left, Build or Simulate controls on the right. The stable `simulation-results` section follows the workspace and contains mitigation comparison/inventory results. This placement prevents result expansion from moving/resizing the map. KPI value and footer regions reserve stable space.

Scenario History also renders in the stable results area. It stores network references plus reproducible disruption/mitigation inputs in a separate local record. Reopen validates the source-network fingerprint and recomputes the result; missing or changed networks remain visible as metadata and fail with a clear message.

Scenario comparison remains inside the same stable results area. Users select two to four saved records; the comparison requires the same network ID and fingerprint, identifies Do Nothing as baseline when present, and otherwise states that the first selection is the reference. Selection is temporary UI state and compared records remain unchanged.

## Important Invariants

v0.19 Custom Simulate controls select a disruption type and show only its facility/route, duration, and optional remaining-capacity inputs. The Demo keeps its Shanghai shutdown control. Saved-scenario history/comparison displays disruption type; map and inventory inspectors explain fractional loss or delay without changing the workspace layout.

- `/` opens Home for new and returning sessions.
- Try Demo and Open App are intentionally different: direct guided Demo vs general workspace/network selection.
- Saved network selection persists independently of product entry state.
- Home, Product, How It Works, Pricing, About/Methodology, and workspace access remain available consistently across the public shell and simulator states.
- Product and How It Works navigation always uses their dedicated routes; the similarly named homepage sections are teasers.
- Import is a modal flow and invalid/cancelled imports leave the active network unchanged.
- The map is the simulator’s visual anchor. Running/resetting a disruption or switching mitigation must not shift KPI cards or resize/reposition the map.
- Result panels should expand below the workspace and clear gracefully on reset.
- Camera and selection should remain intact across simulation state changes unless an explicit workflow changes networks/modes.
- Saving or deleting a scenario must not mutate its source network. Reopen must recompute from validated inputs rather than trust saved KPI snapshots.
- Scenario comparison must not persist selection, compare incompatible network structures, imply one overall winner, or mutate saved records.
- Preserve keyboard focus, readable contrast, semantic controls/tables, and layouts at laptop/tablet/phone widths.
- Pricing must distinguish current Free features from planned Pro features; no account/payment/cloud behavior exists.

## Relevant Tests

- `tests/product-entry.test.mjs` — canonical URLs and default/direct entry semantics.
- `tests/product.test.mjs` — backup, storage recovery, and deletion behavior exposed through product UI.
- `tests/networks.test.mjs` — saved active-network behavior and Demo protection.
- Domain pure-function tests validate the results shown in KPI/map/result components.

There is no broad component test suite; browser checks should be tightly targeted to changed navigation/layout behavior and only when requested.

## Common Change Areas

- Entry/navigation: `product-entry.ts`, `dashboard.tsx`, shared navigation, and product-entry tests.
- Home/Product/How It Works/workspace/Pricing copy and layout: respective components and scoped CSS.
- Simulator composition/stability: `dashboard.tsx`, KPI/result components, and responsive CSS; avoid touching formulas.
- About/Methodology/privacy copy: `product-info.tsx` and shared footer usage.

## Usually Unrelated

Avoid graph traversal, inventory formulas, mitigation constants, import parsing, persistence allowlists, map projection, and Natural Earth data for product-shell work. Do not use generated output or the nested `TwinChain/` repository as source.
