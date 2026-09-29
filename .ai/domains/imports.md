# Imports

## Responsibility

Read Excel, paired CSV, or TwinChain JSON backup files entirely in the browser; validate them; show an actionable preview; and atomically create an ordinary editable Custom Network. This domain owns file/schema validation, not persistence behavior after a valid network is created.

## Key Files

- `components/simulator/network-import.tsx` — guided upload, sheet selection, column mapping, naming, preview, issues, breakdowns, back navigation, and confirmation.
- `lib/import/read-files.ts` — browser file limits/type checks, paired CSV reading, lazy `.xlsx` reading, and mapped-preview orchestration.
- `lib/import/import-mapping.ts` — canonical import fields, centralized aliases, deterministic suggestions, source-column mapping, and mapping safety checks.
- `lib/import/network-import.ts` — CSV parsing, worksheet selection, normalization, row validation, preview issues/warnings, and shared-model conversion.
- `lib/operations.ts` — optional operational column definitions/parsing.
- `lib/networks.ts` — final shared model validation and atomic saved-library insertion.
- `lib/network-backup.ts` — strict JSON backup export/restore and size/schema limits.
- `public/templates/facilities.csv` and `public/templates/routes.csv` — downloadable source examples.
- `tests/fixtures/*.xlsx` — valid, enriched, and unresolved-formula workbook fixtures.

## Data Flow

The dialog accepts one `.xlsx`, two `.csv` files (Facilities first, Routes second), or one TwinChain `.json` backup. Files are limited to 10 MB each. Standard Excel worksheet names are preselected; nonstandard workbooks expose sheet selection. Standard headers proceed directly to preview, while other headers receive editable deterministic suggestions. Formulas contribute only saved calculated values. CSV parsing uses Papa Parse and reports malformed quoting/column alignment.

Required facility columns are `id`, `name`, `type`, `latitude`, and `longitude`. Optional descriptive fields are `city`, `region`, and `country`. Required route columns are `id`, `source`, `destination`, and `mode`. Optional operational columns are documented in the templates:

- Facilities: capacity, current inventory, daily demand, utilization, replenishment lead time, criticality.
- Routes: transit time, cost per shipment, route capacity, shipment frequency, reliability.

Header suggestions normalize case and remove whitespace, underscores, hyphens, and punctuation. Centralized conservative aliases cover common facility, coordinate, inventory/demand, endpoint, mode, and operational labels. Approved facility values include warehouse → Distribution center, plant → Factory, and vendor → Supplier. Approved transport values include sea/ocean freight/ship → Ocean, air freight/plane → Air, railroad/train → Rail, and trucking/lorry → Truck. Unknown values remain validation errors. IDs remain case-sensitive references.

Mapping creates canonical in-memory tables without changing uploaded data, then `previewImport` supplies the existing row validation. Blocking errors include missing/duplicate mappings or headers, required values, duplicate IDs/connections, invalid types/modes/coordinates/operational values, missing endpoint references, self-routes, and row/size limits. Isolated facilities and disconnected components are warnings; import remains allowed. Preview shows mapped/unmapped counts, detected counts, valid type/mode breakdowns, operational completeness, and at most the first 100 issues. Back navigation changes mappings without re-upload.

`createImportedNetwork` refuses previews with errors, creates `kind: "custom"`, and invokes `validateNetwork`. `addCustomNetwork` validates again before returning a new saved-library state. Until final confirmation succeeds, the current network is unchanged. JSON restore goes through the persistence allowlist and receives a new ID.

## Important Invariants

- Parsing is client-side; do not upload files or introduce backend dependence.
- Invalid imports must not replace, mutate, or delete the current network.
- Import confirmation is atomic: fully validate before inserting.
- Imported and manually built networks use the exact same `SupplyNetwork`, builder, persistence, map, shutdown, inventory, and mitigation paths.
- Optional operational fields remain optional. Blank cells stay absent; do not coerce them to zero.
- Preserve row/table/field context in user-facing errors.
- Keep approved normalization narrow; do not silently guess arbitrary schemas or facility IDs.
- Source/destination references are directional and case-sensitive.
- Formula cells with no cached value cannot satisfy required data.
- Respect limits: 2,000 facilities, 10,000 routes, 10 MB per file.

## Relevant Tests

- `tests/network-import.test.mjs` — required fields, normalization/aliases, validation, warnings, limits, atomicity, edit/persistence/simulation compatibility, templates, and real workbooks.
- `tests/operations.test.mjs` — optional operational CSV/Excel columns and error locations.
- `tests/product.test.mjs` — JSON backup/restore, invalid backup safety, recovery, and derived-field stripping.
- `tests/fixtures/` — workbook test inputs.

## Common Change Areas

- Column/schema change: templates, `operations.ts` or importer rules, preview UI, and focused tests together.
- Excel/CSV reading: `read-files.ts`; keep file parsing separate from row validation.
- Validation/normalization: `network-import.ts`; final shared validation remains in `networks.ts`.
- JSON format: `network-backup.ts` and persistence compatibility tests.

## Usually Unrelated

Avoid map geometry, visual builder interaction, simulation formulas, mitigation coefficients, product pages, and CSS unless the task changes preview presentation. Do not create a separate imported-network runtime path.

## v0.17 inventory input

Optional third CSV or selected Excel Inventory/SKUs worksheet uses the same column mapper. lib/import/sku-import.ts validates combined SKU identity + facility inventory rows, consistent names, references, nonnegative values and unique facility/SKU pairs. Blank inventory/demand remains absent and warns. Preview includes SKU/record/facility counts; creation stays atomic. Up to 20,000 inventory rows per import.

v0.18 accepts an optional SKU Sourcing sheet or fourth CSV after Inventory. `lib/import/sourcing-import.ts` validates SKU/facility/route IDs, directional routes, duplicates, and complete share groups; mapped aliases and manual overrides use the existing column mapper. Shares import as fractions or percentages and persist as 0–1. Preview includes relationship, sourced-SKU, and destination counts. Inventory remains optional for old imports but is needed to define SKU IDs for sourcing.
