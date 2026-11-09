# `_factory` — the portable factory engine

Everything here is project-agnostic. The engine is a single zero-dependency Node script driven by
JSON config. Once installed, this folder lives at `<your-project>/.specs/_factory/`.

## Files

| File | Role |
| --- | --- |
| `factory.config.json` | **Single source of truth** for the pipeline: stages, order, icons, agents, the **default skill per phase**, loopback targets, status glyphs and theme. The orchestrator and the board both read it. |
| `factory.skills.json` | **Per-phase skill overrides** — the one knob you touch to point each phase at the skill you prefer. A non-empty value wins over the `skill` default in `factory.config.json`. |
| `factory.schema.json` | JSON Schema for the config (editor validation). |
| `scripts/factory.mjs` | CLI: create demands, update state, loop back, log, render the board, and resolve skills. |
| `templates/*.md` | Phase-prefixed document templates copied into each demand folder, with `{{ID}}`/`{{TITLE}}`/`{{SLUG}}`/`{{DATE}}`/`{{REF}}` substitution. |

## CLI reference

```
node .specs/_factory/scripts/factory.mjs <command>

new "<title>" [--slug s] [--ref ID]      create a demand + scaffold all phase docs
set <id> <stage> <status> [--verdict pass|fail] [--note "..."]   update one stage
loopback <id> <fromStage> [--note "..."] send the demand back to the builder, bump iteration
log <id> <stage> "<message>" [--agent n] append a line to PO-LOG.md
board [id]                               render the board (one demand, or overview of all)
list                                     one-line status per demand
show <id>                                print pipeline.json
stages                                   print the pipeline + the resolved skill per phase
skills                                   print the resolved skill for every phase
skill <stageId>                          print ONLY the resolved skill name for one phase
```

Statuses: `pending · active · done · failed · skipped`. Set `NO_COLOR=1` to disable ANSI.

## Skill resolution (how a phase picks its skill)

```
factory.skills.json[stageId]  (if non-empty)   ← wins
        else
factory.config.json stage.skill  (the default)
```

Every phase agent resolves its own skill at runtime with `factory.mjs skill <stageId>`, then loads
and follows that skill — so editing `factory.skills.json` is all it takes to swap the skill a phase
uses, with no change to the agents.

## Extending the factory (modularity)

**Add / reorder / remove a stage** — edit the `stages` array in `factory.config.json`. Each stage
needs `id, order, label, icon, kind, agent, artifact` (reviewers add `loopbackTo`; every stage may
set a default `skill`). Add a matching `templates/<order>-<NAME>.md` and an agent descriptor in
`agents/agents.json`. The board and orchestrator pick it up with no code change.

**Swap an agent** — point a stage's `agent` field at a different agent name.

**Change a phase's skill** — set it in `factory.skills.json` (override) or change the stage's
`skill` default in `factory.config.json`.

**Re-point the loopback** — change `loopbackTarget` (global) or a stage's `loopbackTo`.

## Design notes

- Dependency-free (Node ≥ 18, ESM). It never touches the network.
- State is plain JSON in each demand folder; the board is a pure function of that JSON + the config.
- Iterations are `## Iteration N` sections inside each phase doc, so there is one canonical artifact
  per phase and the audit trail is never overwritten.
