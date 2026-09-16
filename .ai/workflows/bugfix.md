# Bug-Fix Workflow

Use this workflow for a reported defect or regression.

1. Read `.ai/PROJECT.md` for product boundaries.
2. Read the single most relevant `.ai/domains/*.md` file. Read `ARCHITECTURE.md` only if the defect crosses a documented boundary.
3. Record `git status --short` and preserve existing unrelated work, especially the nested `TwinChain/` repository.
4. Reproduce the issue or identify it from a narrow failing test, visible state, or direct code path. Establish expected vs actual behavior before editing.
5. Inspect only the directly related implementation and its callers. Follow the domain’s Data Flow and Important Invariants rather than searching every file.
6. Fix the root cause in the owning layer. Examples: correct source coordinates instead of offsetting a marker; correct shared validation instead of patching import UI; correct simulation logic instead of overriding displayed KPIs.
7. Add or update one focused regression test when the behavior is testable as a stable pure contract. Do not add snapshot/copy tests merely to increase coverage.
8. Run the focused test first. Run broader tests, TypeScript, or build only when requested or justified by shared-layer impact.
9. If browser validation is needed, check only the failing workflow and one material regression path, within any limit in the request.
10. Run `git diff --check`, confirm the diff contains only intended changes, report the result, and stop.

Do not perform a broad audit, speculative refactor, dependency update, unrelated style cleanup, exhaustive browser walkthrough, or opportunistic feature work. Do not change a data contract, persistence format, or simulation assumption unless the defect is in that contract and the evidence supports the change.

If the defect cannot be reproduced, report the exact evidence checked and the narrow uncertainty. Do not invent a fix. If context documentation is stale in a way that caused the investigation to point to the wrong owner, correct the relevant `.ai/` file after the bug is resolved.
