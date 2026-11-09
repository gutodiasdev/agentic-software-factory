---
name: factory-code-review
description: Behavioral and structural review of a build's diff against the spec and acceptance criteria — correctness, security, conventions, tests, scope. Produces a PASS/FAIL verdict with severity-ranked findings. Use in the Code Reviewer phase (40-CODE-REVIEW.md).
---

# Code review

Review the build against `10-SPEC.md` and `20-ACCEPTANCE-CRITERIA.md`. You judge; you do not fix.

## Procedure

1. Read the latest `## Iteration` of `30-BUILD-REPORT.md`, the spec, the acceptance criteria, and
   **inspect the actual changed files** — do not trust the report alone.
2. **Run the tests / type-check / build yourself** to confirm the builder's claims. A command exiting
   0 is not proof the behavior is correct; read what the tests actually assert.
3. Append a `## Iteration N` block to `40-CODE-REVIEW.md` with an explicit `VERDICT: PASS | FAIL` and
   a severity-ranked findings table (**blocker / major / minor / nit**), each with `file:line` and the
   required change.

## What to check

- **Correctness** — behavior matches spec and every acceptance criterion; edge cases handled.
- **Security** — input validated at trust boundaries; authorization enforced; no secrets in code or
  logs; injection-safe.
- **Conventions** — follows the codebase's existing patterns, naming, and error handling.
- **Tests** — meaningful, cover the criteria and failure paths, and pass.
- **Scope** — no unrequested features or refactors (YAGNI).

## Verdict

- Any **blocker or major** ⇒ **FAIL**:
  `node .specs/_factory/scripts/factory.mjs loopback <id> code-review --note "<reason>"`.
- Otherwise ⇒ **PASS**: `node .specs/_factory/scripts/factory.mjs set <id> code-review done`.

You may write only inside `.specs/`. Describe required changes precisely; the builder applies them
next iteration.
