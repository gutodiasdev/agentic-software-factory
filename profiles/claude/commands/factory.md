---
description: Run a demand end to end through the agentic software factory
argument-hint: <demand description or DMD-id>
---

Use the `factory-orchestrator` subagent to run the following demand through the software factory
pipeline (intake → spec → acceptance → build → code-review → ui-review → ux-review →
acceptance-review → approval), handling reviewer loopbacks back to the builder and rendering the
board after every transition:

$ARGUMENTS

If the argument is an existing `DMD-####` id, resume it from its current stage (read
`.specs/<id>/pipeline.json`). Otherwise treat it as a new demand and start at intake.
