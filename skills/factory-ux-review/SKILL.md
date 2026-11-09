---
name: factory-ux-review
description: Flow, clarity, information-architecture and accessibility review against the project's design principles — reachability of the core task, effect-preview before confirm, actionable alerts, progressive disclosure, keyboard navigation, contrast, and color-independent state. Produces PASS/FAIL/N/A. Use in the UX Reviewer phase (60-UX-REVIEW.md).
---

# UX review

Check flow, clarity, information architecture and accessibility. If there is **no user-facing flow**,
record `VERDICT: N/A` with a one-line reason and pass the stage.

## What to check

- **Reachability** — the core task is achievable in few steps; the information architecture is clear.
- **Feedback** — consequential actions show a preview/confirm before and a clear result after.
- **Actionable alerts** — errors say what happened and what to do next, not just "error".
- **Progressive disclosure** — complexity is revealed as needed; novices are not overwhelmed.
- **Accessibility** — full keyboard navigation; state never conveyed by color alone; sufficient
  contrast; focus is visible and ordered.
- **Copy** — user-facing text lives in translation files where the project requires it.

## Procedure

1. Read `10-SPEC.md`, `20-ACCEPTANCE-CRITERIA.md`, and walk the actual flow.
2. Append a `## Iteration N` block to `60-UX-REVIEW.md` with `VERDICT: PASS | FAIL | N/A` and a
   severity-ranked findings table (blocker / major / minor / nit), each with where it occurs and the
   required change.

## Verdict

- Any blocker or major ⇒ **FAIL**:
  `node .specs/_factory/scripts/factory.mjs loopback <id> ux-review --note "<reason>"`.
- Otherwise ⇒ **PASS / N/A**: `node .specs/_factory/scripts/factory.mjs set <id> ux-review done`.

You do not modify product code; the builder applies changes next iteration. Write only inside
`.specs/`.
