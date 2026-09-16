# Feature Workflow

Use this workflow for a requested product or engineering change.

1. Read `.ai/PROJECT.md` for product boundaries and principles.
2. Read `.ai/ARCHITECTURE.md` only when the change crosses domains or requires routing/data-flow/persistence context.
3. Read only the `.ai/domains/*.md` files relevant to the requested change.
4. Inspect only the Key Files and focused tests named by those domain documents. Confirm the context against code where the feature touches a contract.
5. Record `git status --short` before editing. Preserve user changes, unrelated files, and the untracked nested `TwinChain/` repository.
6. Implement the smallest coherent change that satisfies the request. Reuse shared models and pipelines. Do not refactor adjacent systems unless the requested behavior cannot be implemented safely without it.
7. Keep business logic outside React rendering. Keep derived simulation/display state out of persisted source data. Centralize new deterministic assumptions with the domain model that owns them.
8. Add or update targeted tests for meaningful behavior and invariants. Avoid brittle tests of copy, implementation shape, or reversible styling.
9. During iteration, run the directly relevant test file first. Run the full suite when requested or when the change crosses shared network, persistence, import, simulation, inventory, or mitigation layers.
10. Run TypeScript and the production build when source/configuration changes warrant them or the request requires them. Run `git diff --check` before completion.
11. Perform no more than the explicitly requested browser checks. Target only the changed workflow and material regression risks.
12. Update the relevant `.ai/` context file only when the completed change materially alters architecture, ownership, data flow, invariants, tests, or common change areas.

Do not rediscover the whole repository unless these documents are demonstrably stale. Do not reread files already understood in the active task. Avoid generated output, dependencies, broad audits, unrelated cleanup, speculative future infrastructure, and release-scope expansion.

Prefer a simple implementation the user can explain over a sophisticated hidden model. Preserve backward compatibility for stored/imported networks where practical. If an existing architecture is intentionally specialized (for example, predefined Demo mitigation), generalize only when the requested feature benefits and regression risk is controlled.

Report the behavior delivered, important assumptions, tests/checks run, and any concrete limitations. Stop when the requested feature and proportionate validation are complete.
