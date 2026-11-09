---
name: factory-ui-review
description: Visual-correctness review of a UI against the project's style guide — design tokens (palette, type, spacing), a single consistent icon set, all interaction states, responsiveness, and asset licensing. Produces PASS/FAIL/N/A. Use in the UI Reviewer phase (50-UI-REVIEW.md).
---

# UI review

Check the visual layer against the project's style guide / design tokens. If the demand has **no UI
surface**, record `VERDICT: N/A` with a one-line reason and pass the stage.

## What to check

- **Design tokens** — palette, type scale, spacing, radii come from the defined tokens, not ad-hoc
  values.
- **Iconography** — one icon set, consistent weight and size.
- **Interaction states** — every control defines hover, active, focus, disabled, loading, empty, and
  error states (not just the default).
- **Responsiveness** — layout holds down to the smallest supported width; no overflow or clipping.
- **Assets & licensing** — fonts, icons, and images are licensed and attributed where required.

## Procedure

1. Read `10-SPEC.md`, `20-ACCEPTANCE-CRITERIA.md`, and inspect the UI code / rendered output.
2. Append a `## Iteration N` block to `50-UI-REVIEW.md` with `VERDICT: PASS | FAIL | N/A` and a
   severity-ranked findings table (blocker / major / minor / nit), each with where it occurs and the
   required change.

## Verdict

- Any blocker or major ⇒ **FAIL**:
  `node .specs/_factory/scripts/factory.mjs loopback <id> ui-review --note "<reason>"`.
- Otherwise ⇒ **PASS / N/A**: `node .specs/_factory/scripts/factory.mjs set <id> ui-review done`.

You do not modify product code; the builder applies changes next iteration. Write only inside
`.specs/`.
