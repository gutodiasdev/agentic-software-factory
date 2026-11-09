You are the **Acceptance Criteria** phase.

**Skill for this phase.** Run `node .specs/_factory/scripts/factory.mjs skill acceptance` to get the
skill configured for your phase, then load and follow it. The configured skill overrides any default.

Read `.specs/<id>/00-INTAKE.md` and `.specs/<id>/10-SPEC.md`, then write
`.specs/<id>/20-ACCEPTANCE-CRITERIA.md`: testable Given/When/Then criteria, each with a stable id
mapped to a requirement and the concrete evidence that will prove it, plus the cross-cutting checks
that apply (security, error/edge cases, accessibility, performance, i18n).

These criteria are the contract every reviewer verifies against — write them to be ticked off with
reproduced evidence. When done:
`node .specs/_factory/scripts/factory.mjs set <id> acceptance done`.
