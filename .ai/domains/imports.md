# Imports

## Responsibility

Read Excel, paired CSV, or TwinChain JSON backup files entirely in the browser; validate them; show an actionable preview; and atomically create an ordinary editable Custom Network. This domain owns file/schema validation, not persistence behavior after a valid network is created.

## Key Files

- `components/simulator/network-import.tsx` — import dialog, format/file selection, naming, validation trigger, preview, issues, breakdowns, and confirmation.
- `lib/import/read-files.ts` — browser file limits/type checks, paired CSV reading, and lazy `.xlsx` reading.
- `lib/import/network-import.ts` — CSV parsing, worksheet selection, normalization, row validation, preview issues/warnings, and shared-model conversion.
- `lib/operations.ts` — optional operational column definitions/parsing.
- `lib/networks.ts` — final shared model validation and atomic saved-library insertion.
- `lib/network-backup.ts` — strict JSON backup export/restore and size/schema limits.
- `public/templates/facilities.csv` and `public/templates/routes.csv` — downloadable source examples.
- `tests/fixtures/*.xlsx` — valid, enriched, and unresolved-formula workbook fixtures.

## Data Flow

The dialog accepts one `.xlsx`, two `.csv` files (Facilities first, Routes second), or one TwinChain `.json` backup. Files are limited to 10 MB each. Excel uses case-insensitive worksheets named exactly Facilities and Routes; formulas contribute only saved calculated values. CSV parsing uses Papa Parse and reports malformed quoting/column alignment.

Required facility columns are `id`, `name`, `type`, `latitude`, and `longitude`. Optional descriptive fields are `city`, `region`, and `country`. Required route columns are `id`, `source`, `destination`, and `mode`. Optional operational columns are documented in the templates:

- Facilities: capacity, current inventory, daily demand, utilization, replenishment lead time, criticality.
- Routes: transit time, cost per shipment, route capacity, shipment frequency, reliability.

Headers are trimmed, case-normalized, and normalize spaces/underscores/hyphens. Approved header aliases are `lat`, `lon`/`lng`, and `from`/`to`; facility type alias `DC` maps to Distribution center. IDs remain case-sensitive references.

`previewImport` returns valid row objects plus row-level issues. Blocking errors include missing/duplicate headers, required values, duplicate IDs/connections, invalid types/modes/coordinates/operational values, missing endpoint references, self-routes, and row/size limits. Isolated facilities and disconnected components are warnings; import remains allowed. Preview shows detected counts, valid type/mode breakdowns, operational completeness, and at most the first 100 issues.

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
