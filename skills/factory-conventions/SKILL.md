---
name: factory-conventions
description: Core conventions of the agentic software factory — demand folders under .specs, phase-prefixed document names, the pipeline.json state file, and the factory.mjs CLI for updating state and rendering the board. Use whenever working as any factory role agent (intake, spec, acceptance, builder, reviewers, approver, product owner) or when creating/advancing/inspecting a demand.
---

# Factory conventions

This skill is the shared contract for every role in the factory. Read it before acting in any phase.

## The pipeline

```
intake(00) → spec(10) → acceptance(20) → build(30) → code-review(40)
          → ui-review(50) → ux-review(60) → acceptance-review(70) → approval(80)
```

Any reviewer (40–70) returning **FAIL** loops back to **build(30)**, bumps the iteration, and resets
the downstream reviewers. The single source of truth for stages/order/agents is
`.specs/_factory/factory.config.json`.

## Where to look (always a `.specs/DMD-####/` folder)

- `pipeline.json` — machine-readable state. **Never edit by hand**; use the CLI.
- `00-INTAKE.md … 80-APPROVAL.md` — one canonical document per phase, named by its two-digit prefix.
- `PO-LOG.md` — Product Owner append-only audit trail.
- `TRACEABILITY.md` — requirement → criterion → evidence matrix.

Before writing your phase's document, **read every earlier-phase document in the same folder** plus
any referenced source material.

## Which skill your phase uses

Each phase has a default skill in `factory.config.json` and may be overridden in
`factory.skills.json`. To find the one configured for your phase, run:

```bash
node .specs/_factory/scripts/factory.mjs skill <stageId>
```

Load and follow that skill. The configured skill overrides any default your runtime auto-loaded.

## What to write

- Write only your phase's artifact (`<prefix>-*.md`) and, for the builder, the actual code.
- **Iterations are `## Iteration N` sections inside the same file** — never create new numbered files.
- Keep the numeric prefix; it is how other agents find your output.

## The CLI (how you update state and render the board)

```bash
F=".specs/_factory/scripts/factory.mjs"
node $F new "<title>" [--slug s] [--ref ID]       # intake: create a demand, scaffold docs
node $F set <id> <stage> active                   # when you start a phase
node $F set <id> <stage> done [--note "..."]      # when your phase passes (verdict defaults to pass)
node $F loopback <id> <fromStage> --note "reason" # a reviewer FAIL → back to builder
node $F log <id> <stage> "<message>" --agent <me> # product owner audit entry
node $F board <id>                                # render this demand's board
```

Stage ids: `intake, spec, acceptance, build, code-review, ui-review, ux-review,
acceptance-review, approval`. Statuses: `pending, active, done, failed, skipped`.

## Mandatory gates (do not skip)

1. Never mark a phase `done` without its artifact filled in.
2. A reviewer must emit an explicit `VERDICT: PASS | FAIL` (or `N/A`) in its document.
3. On FAIL, use `loopback` — do not silently fix things yourself; the builder owns code changes.
4. The approver runs only when code/ui/ux/acceptance reviews are all PASS (or N/A) in `pipeline.json`.

## Anti-examples (what NOT to do)

- ❌ Editing `pipeline.json` by hand instead of using the CLI.
- ❌ Creating `40-CODE-REVIEW-v2.md`; append `## Iteration 2` to the existing file instead.
- ❌ A reviewer patching code to make a test pass — that belongs to the builder in the next iteration.
- ❌ Advancing a stage while an earlier required stage is still pending.
