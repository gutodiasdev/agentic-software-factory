---
name: factory-acceptance-criteria
description: Derive testable Given/When/Then acceptance criteria and cross-cutting checks from a spec. Each criterion maps to a requirement and names the evidence that will prove it. Use in the Acceptance Criteria Generator phase (20-ACCEPTANCE-CRITERIA.md) and as the contract reviewers verify against.
---

# Acceptance criteria

Produce the **contract** every reviewer checks against: `20-ACCEPTANCE-CRITERIA.md`.

## Procedure

1. Read `10-SPEC.md`. For every requirement, write one or more criteria.
2. Phrase each as **Given / When / Then** — concrete and observable, not a restatement of the
   requirement. Prefer values and states over adjectives.
3. For each criterion, name the **evidence** that will prove it: a test name, a command and its
   expected output, or a reproducible manual step. If you cannot name evidence, the criterion is not
   yet testable — rewrite it.
4. Give each a stable id (`AC-01`, `AC-02`, …) and map it to its requirement.
5. Add **cross-cutting checks** that apply: security/authorization, error & edge cases,
   accessibility (if UI), performance budget (if applicable), i18n/copy.

## Quality bar

- Every P0 requirement has at least one criterion.
- Each criterion is independently verifiable and has named evidence.
- Edge cases and failure paths are covered, not just the happy path.
- The acceptance reviewer (phase 70) will later tick each of these off with reproduced evidence, so
  write them to be ticked.

When done: `node .specs/_factory/scripts/factory.mjs set <id> acceptance done`.
