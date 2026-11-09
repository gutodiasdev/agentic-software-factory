# `.specs` — Software Factory traceability store

This directory is the memory of the agentic software factory. Every **demand** (a unit of work)
gets its own folder with a fixed set of phase-prefixed documents, so any agent — or human — knows
exactly where to look and what to write at each phase.

## Layout

```
.specs/
├── README.md              ← you are here
├── _registry.md           ← auto-generated index of every demand
├── _factory/              ← the portable engine (config, CLI, templates, skill map)
│   ├── factory.config.json    ← the pipeline, as data (single source of truth)
│   ├── factory.skills.json    ← per-phase skill overrides (the one knob you touch)
│   ├── factory.schema.json
│   ├── scripts/factory.mjs    ← CLI + board renderer
│   └── templates/             ← phase-prefixed document templates
└── DMD-0001/              ← one folder per demand
    ├── pipeline.json          ← machine-readable state (drives the board)
    ├── 00-INTAKE.md … 80-APPROVAL.md
    ├── PO-LOG.md              ← Product Owner audit trail (append-only)
    └── TRACEABILITY.md        ← requirement → criterion → evidence matrix
```

## Naming convention (the contract every agent relies on)

- **Demand folder:** `DMD-####` (zero-padded, sequential). The slug lives inside `pipeline.json`.
- **Phase documents:** `<order>-<PHASE>.md` — the two-digit prefix both sorts the folder in pipeline
  order and tells an agent which phase a file belongs to.

  | Prefix | Phase | Author agent |
  | --- | --- | --- |
  | `00` | Intake | `factory-intake` |
  | `10` | Spec | `factory-spec-generator` |
  | `20` | Acceptance Criteria | `factory-acceptance-criteria-generator` |
  | `30` | Build Report | `factory-builder-engineer` |
  | `40` | Code Review | `factory-code-reviewer` |
  | `50` | UI Review | `factory-ui-reviewer` |
  | `60` | UX Review | `factory-ux-reviewer` |
  | `70` | Acceptance Review | `factory-acceptance-criteria-reviewer` |
  | `80` | Approval | `factory-approver` |

- **Cross-cutting docs** (no numeric prefix, maintained by `factory-product-owner`):
  `PO-LOG.md` and `TRACEABILITY.md`.
- **Iterations** live *inside* their phase document as `## Iteration N` sections — never new files.

## The flow

```
intake → spec → acceptance → build → code-review → ui-review → ux-review → acceptance-review → approval
                               ▲                                                    │
                               └──────────────── any reviewer FAIL ─────────────────┘
```

Any reviewer that returns **FAIL** loops the demand back to **Builder Engineer**, bumps the
iteration, and resets the downstream reviewers. The **Product Owner** records every transition.

## Driving the factory by hand (the agents do this for you)

```bash
F=".specs/_factory/scripts/factory.mjs"
node $F new "Add CSV export to the reports page" --ref JIRA-123   # create a demand
node $F board DMD-0001                                            # render its board
node $F set DMD-0001 spec done                                    # mark a phase passed
node $F loopback DMD-0001 code-review --note "missing error path" # send back to builder
node $F skills                                                    # which skill each phase uses
node $F board                                                     # overview of all demands
```
