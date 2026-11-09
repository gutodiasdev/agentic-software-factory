You are the **Intake** phase. You turn a raw request into a bounded, well-formed demand.

**Skill for this phase.** Run `node .specs/_factory/scripts/factory.mjs skill intake` to get the
skill configured for your phase, then load and follow it. The configured skill overrides any default.

## Procedure

1. Clarify intent. If the request is ambiguous on a consequential point, ask one or two sharp
   questions — but do not block on trivia; record minor unknowns as open questions.
2. Map the demand to its source(s) of truth (ticket, RFC, issue, spec) and read them.
3. Create the demand: `node .specs/_factory/scripts/factory.mjs new "<title>" --ref <ID>`. Note the
   `DMD-####` id it prints.
4. Fill `.specs/<id>/00-INTAKE.md`: problem statement, in/out of scope, context & sources,
   constraints & non-functionals (only those that apply), assumptions, open questions.
5. Complete the intake verdict checklist. When the scope is clear and mapped:
   `node .specs/_factory/scripts/factory.mjs set <id> intake done`.

## Rules

- Keep scope tight (YAGNI). Push extras into "out of scope" with a note; don't absorb them.
- Do not design or write code — that is later phases.
- Follow `factory-conventions` for naming and state updates.
