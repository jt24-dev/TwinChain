# Product UI

## Responsibility

Provide the public Home/Pricing/About shell, explicit product entry flows, workspace selection, and the stable simulator composition around shared map, KPI, controls, and result areas. This domain coordinates state and presentation; simulation/import/model calculations stay in their own modules.

## Key Files

- `app/page.tsx` and `components/simulator/dashboard.tsx` — main entry and product/simulator orchestration.
- `lib/product-entry.ts` — canonical Home, workspace, Demo, selected-network, and Pricing links/query parsing.
- `components/simulator/product-navigation.tsx` — shared header/footer navigation.
- `components/simulator/product-home.tsx` and `product-preview.tsx` — homepage content and real Demo-derived preview.
- `components/simulator/workspace-home.tsx` — saved networks plus Create/Import/Demo entry.
- `app/pricing/page.tsx` and `components/simulator/pricing-page.tsx` — dedicated Pricing route/content.
- `components/simulator/product-info.tsx` — About/Methodology dialog and privacy/local-data explanation.
- `components/simulator/kpi-cards.tsx`, `network-map.tsx`, `scenario-controls.tsx`, `custom-shutdown-controls.tsx`, and result/mitigation components — simulator layout regions.
- `app/globals.css` — shared responsive shell, map/KPI dimensions, and stable result-area styling.

## Data Flow

`app/page.tsx` renders `Dashboard`. `resolveProductEntry` maps missing/unknown query state to Home. `/` always opens Home. `/?view=app` opens the workspace chooser; `/?view=demo` selects Demo and Simulate mode; `/?view=network` opens the currently selected network. `Dashboard.navigate` updates browser history, and a `popstate` listener restores entry state.

Try Demo explicitly selects the built-in Demo Network. Open App opens the general workspace where saved networks can be continued and new/import flows started. Selecting or creating a network opens its shared simulator; imported networks enter Build mode. Pricing is a dedicated static route. About and Methodology use the same dialog from the homepage, simulator, and Pricing page.

Within the simulator, `Dashboard` derives one current result and renders KPI cards above a two-column workspace: map plus context on the left, Build or Simulate controls on the right. The stable `simulation-results` section follows the workspace and contains mitigation comparison/inventory results. This placement prevents result expansion from moving/resizing the map. KPI value and footer regions reserve stable space.

## Important Invariants

- `/` opens Home for new and returning sessions.
- Try Demo and Open App are intentionally different: direct guided Demo vs general workspace/network selection.
- Saved network selection persists independently of product entry state.
- Home, Pricing, About/Methodology, and workspace access remain available consistently across Home, simulator, Build, import, and Pricing states.
- Product/How It Works anchors return to Home before targeting sections when invoked elsewhere.
- Import is a modal flow and invalid/cancelled imports leave the active network unchanged.
- The map is the simulator’s visual anchor. Running/resetting a disruption or switching mitigation must not shift KPI cards or resize/reposition the map.
- Result panels should expand below the workspace and clear gracefully on reset.
- Camera and selection should remain intact across simulation state changes unless an explicit workflow changes networks/modes.
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
- Home/workspace/Pricing copy/layout: respective components and scoped CSS.
- Simulator composition/stability: `dashboard.tsx`, KPI/result components, and responsive CSS; avoid touching formulas.
- About/Methodology/privacy copy: `product-info.tsx` and shared footer usage.

## Usually Unrelated

Avoid graph traversal, inventory formulas, mitigation constants, import parsing, persistence allowlists, map projection, and Natural Earth data for product-shell work. Do not use generated output or the nested `TwinChain/` repository as source.
