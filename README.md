# Agentic Software Factory

A portable, white-label **agentic software factory**: a fixed pipeline of specialized AI agents that
take any unit of work (a *demand*) from intake to approval, leaving a complete paper trail. It runs
with **Claude Code** and **Kiro CLI** from one shared source, and lets you point each phase at the
skill you prefer.

```
intake → spec → acceptance → build → code-review → ui-review → ux-review → acceptance-review → approval
                               ▲                                                     │
                               └───────────────── any reviewer FAIL ─────────────────┘
```

A reviewer that returns **FAIL** loops the demand back to the **builder**, bumps the iteration, and
re-runs the reviewers. A **product owner** agent records every transition for traceability.

## Install

Pick the agent format for your tool. The installer copies the engine into your project and renders
the agents into the chosen format.

```bash
# run straight from the repo with npx (no clone needed)
npx github:<you>/agentic-software-factory --agent kiro   --target /path/to/your-project
npx github:<you>/agentic-software-factory --agent claude --target /path/to/your-project
npx github:<you>/agentic-software-factory --agent both   --target /path/to/your-project
```

Or clone and run the installer directly:

```bash
git clone https://github.com/<you>/agentic-software-factory.git
cd agentic-software-factory

# install into your project (choose one)
node install.mjs --agent kiro   --target /path/to/your-project
node install.mjs --agent claude --target /path/to/your-project
node install.mjs --agent both   --target /path/to/your-project

# or run with no flags for an interactive prompt
node install.mjs --target /path/to/your-project
```

| You chose | Agents go to | Skills go to | Root doc written |
| --- | --- | --- | --- |
| `kiro` | `.kiro/agents/factory-*.md` | `.kiro/skills/factory-*/` | **`AGENTS.md`** |
| `claude` | `.claude/agents/factory-*.md` | `.claude/skills/factory-*/` | **`CLAUDE.md`** (+ `/factory` command) |

Both profiles also install the engine to `<target>/.specs/_factory/` and the store readme to
`<target>/.specs/README.md`. Requirements: **Node ≥ 18**. The engine has zero dependencies.

## Use

### Run a demand end to end

- **Claude Code:** `/factory Add CSV export to the reports page` — or ask Claude to "use the
  factory-orchestrator subagent" for the demand.
- **Kiro CLI:** invoke the `factory-orchestrator` agent and give it the demand.

The orchestrator creates the demand folder, dispatches each phase to its agent, handles loopbacks,
and renders the board after every step.

### Drive it by hand (what the agents do under the hood)

```bash
F=".specs/_factory/scripts/factory.mjs"
node $F new "Add CSV export to the reports page" --ref JIRA-123   # create a demand
node $F board                                                     # overview of all demands
node $F board DMD-0001                                            # one demand's board
node $F set DMD-0001 spec done                                    # mark a phase passed
node $F loopback DMD-0001 code-review --note "missing error path" # send back to the builder
```

### The board

```
node .specs/_factory/scripts/factory.mjs board DMD-0001
```

renders the vertical pipeline with per-phase status, the loopback arrow when a review failed, a
progress bar, and the iteration count. `board` with no id shows every demand.

## Choose the skill each phase uses

This is the one knob you touch. Every phase has a **default skill** (declared in
`factory.config.json`), and you override any phase in **`factory.skills.json`** — a non-empty value
wins over the default.

`.specs/_factory/factory.skills.json`:

```json
{
  "spec": "my-team-spec-style",
  "code-review": "strict-security-review"
}
```

Leave a phase empty (or absent) to keep its default. Inspect what resolves with:

```bash
node .specs/_factory/scripts/factory.mjs skills      # table: phase → skill (default/override)
node .specs/_factory/scripts/factory.mjs skill spec  # prints just the resolved skill name
```

Each phase agent resolves its own skill at runtime via `factory.mjs skill <phase>` and loads it, so
swapping a skill needs **no change to the agents** — just drop your skill folder under
`.kiro/skills/<name>/` (or `.claude/skills/<name>/`) and name it in `factory.skills.json`.

The factory ships six generic skills you can keep, replace, or extend: `factory-conventions`,
`factory-spec-writing`, `factory-acceptance-criteria`, `factory-code-review`, `factory-ui-review`,
`factory-ux-review`. They follow the open **Agent Skills** `SKILL.md` standard, so the same folder
works in both Kiro and Claude.

## How it is laid out

```
agentic-software-factory/
├── install.mjs                 the installer (renders agents per profile)
├── factory/                    the portable engine → installs to <target>/.specs/_factory/
│   ├── factory.config.json         pipeline as data + default skill per phase
│   ├── factory.skills.json         per-phase skill OVERRIDES (the knob you touch)
│   ├── factory.schema.json
│   ├── scripts/factory.mjs         CLI + board renderer (zero-dep)
│   ├── templates/*.md              phase document templates
│   └── specs-README.md             becomes <target>/.specs/README.md
├── agents/                     single source of truth for the role agents
│   ├── agents.json                 manifest (name, tools, perms, skill stage)
│   └── bodies/*.md                 profile-agnostic system prompts
├── skills/                     generic Agent-Skills (SKILL.md) for each phase
│   └── factory-*/SKILL.md
└── profiles/                   per-tool root docs + extras
    ├── kiro/AGENTS.md
    └── claude/CLAUDE.md + commands/factory.md
```

The **agents are authored once** in `agents/` and rendered to each tool's format at install time:
Kiro gets frontmatter with `tools`, `resources` (`file://` + `skill://`) and a `permissions` block;
Claude gets frontmatter with a comma-separated `tools` allowlist. The bodies are identical — only the
wrapper differs. This is how one definition serves both CLIs.

## Customize the pipeline

Everything is data in `factory/factory.config.json`:

- **Add / reorder / remove a stage** — edit the `stages` array (each needs `id, order, label, icon,
  kind, agent, artifact`; reviewers add `loopbackTo`; any stage may set a default `skill`). Add a
  matching `templates/<order>-<NAME>.md` and an entry in `agents/agents.json`.
- **Swap an agent** — point a stage's `agent` at a different name.
- **Re-point loopbacks** — change `loopbackTarget` (global) or a stage's `loopbackTo`.
- **Rebrand** — change `name`, `idPrefix`, and the `theme` colors.

## License

MIT — see [LICENSE](./LICENSE).

## Credits

Pattern lineage follows widely used agentic "software factory" write-ups. Skills use the open Agent
Skills `SKILL.md` format; agents follow the Kiro agent and Claude Code subagent conventions.
