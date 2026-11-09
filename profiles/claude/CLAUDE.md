# CLAUDE.md — Agentic Software Factory (Claude profile)

Entry point for Claude Code working in this repo. This project uses an **agentic software factory**:
a fixed pipeline of specialized subagents that take each unit of work (a "demand") from intake to
approval, with a full paper trail under `.specs/`.

## How work gets done — the pipeline

```
intake → spec → acceptance → build → code-review → ui-review → ux-review → acceptance-review → approval
                               ▲                                                     │
                               └───────────────── any reviewer FAIL ─────────────────┘
```

Any reviewer that returns **FAIL** loops the demand back to the **builder**, bumps the iteration, and
re-runs the reviewers. The **product owner** records every transition.

## Where things live (Claude Code)

- Subagents: `.claude/agents/factory-*.md` (invoked via the Task tool, by name)
- Skills: `.claude/skills/factory-*/SKILL.md` (auto-activate by description)
- Slash command: `.claude/commands/factory.md` → run `/factory <demand description>`
- Engine + config + templates: `.specs/_factory/`
- One folder per demand: `.specs/DMD-####/`

## Running it

- **Run a demand end to end:** `/factory <demand description>` (invokes the `factory-orchestrator`
  subagent), or ask Claude to "use the factory-orchestrator subagent" for a demand.
- **See the board:** `node .specs/_factory/scripts/factory.mjs board`
- **State changes only via the CLI** (`new`, `set`, `loopback`, `log`) — never hand-edit
  `pipeline.json`.

## Choosing the skill each phase uses

Each phase has a default skill in `.specs/_factory/factory.config.json`. To use a different skill for
a phase, set it in `.specs/_factory/factory.skills.json` (phase id → skill folder name). A non-empty
override wins over the default; subagents resolve their skill at runtime with
`factory.mjs skill <stageId>` and load it. Inspect the mapping with
`node .specs/_factory/scripts/factory.mjs skills`.

## Boundary

Subagents write only their phase's artifact (and the builder, the product code). Read the
earlier-phase documents in the demand folder before acting. Conventions: the `factory-conventions`
skill.
