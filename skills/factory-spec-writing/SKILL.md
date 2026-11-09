---
name: factory-spec-writing
description: Write a technical specification for a demand from its intake — requirements table, chosen design with trade-offs, modules/files touched, data-model touchpoints, interfaces/contracts, task breakdown and risks. Use in the Spec Generator phase (10-SPEC.md).
---

# Spec writing

Turn `00-INTAKE.md` into a build-ready `10-SPEC.md`. A good spec lets the builder work without
guessing and gives reviewers something concrete to check against.

## Procedure

1. Read `00-INTAKE.md` and every source it references. Resolve open questions or carry them as
   explicit assumptions — do not leave silent gaps.
2. Write a **requirements table**: each row an atomic, testable requirement traced to its source,
   with a priority (P0/P1/P2). The acceptance phase will derive criteria from these rows, so keep
   them crisp.
3. Describe the **chosen design** and *why*. Name at least one real alternative and the trade-off you
   made against it (simplicity, reversibility, performance, consistency). Decisions without a
   rationale are not decisions.
4. List **modules/files touched**, **data-model touchpoints** (schemas, migrations, stored shapes),
   and **interfaces/contracts** (APIs, message shapes, signatures, events).
5. Add **non-functional notes** only where they apply (security, performance, accessibility, i18n).
6. Produce a **task breakdown** the builder can execute step by step, and a **risks** list.

## Quality bar

- Every requirement is testable and traced to a source.
- The design section answers "why this and not that".
- No scope beyond the intake. Push extras to "out of scope" / a follow-up demand.
- Interfaces are concrete enough to implement against (names, shapes, error cases).

When done: `node .specs/_factory/scripts/factory.mjs set <id> spec done`.
