# Improve grill skills

## Goal

Strengthen Maister's interactive plan-stress-testing behavior using the current upstream `grilling` guidance, and add an explicit documentation-aware variant inspired by `grill-with-docs`.

The result should provide two clearly different user experiences:

- `grill-me`: read-only questioning and codebase investigation; never edits documentation or implements the plan.
- `grill-with-docs`: the same questioning discipline, with user-confirmed updates to existing domain-language and architectural-decision documentation; never implements the plan.

## Current State

- `plugins/maister/skills/grill-me/SKILL.md` is based on the original upstream skill. It asks one question at a time and explores the codebase instead of asking discoverable questions.
- It does not explicitly distinguish facts from decisions, wait for feedback after every question, or prohibit implementation before the user confirms shared understanding.
- Maister already uses per-module `language.md` files. Introducing upstream's `CONTEXT.md` and `CONTEXT-MAP.md` would create a competing domain-documentation convention and would not integrate with `linguistic-boundary-verifier`.
- Research workflows have MADR-oriented decision logs, including mandatory ADR generation in some contexts. That policy should not be reused by an interactive utility because it would create trivial ADRs.
- Kiro generation contains hard-coded skill inventories and an explicit `/grill-me` shortcut, so adding a parallel utility requires build-script and test updates.

## Scope

### In scope

- Strengthen the existing `grill-me` protocol.
- Add a new explicit `grill-with-docs` skill.
- Integrate documentation-aware grilling with `language.md` and existing repository ADR conventions.
- Update the plugin catalog.
- Update platform generation and structural validation for the new skill.
- Rebuild generated plugin variants and verify them.

### Out of scope

- Introducing `CONTEXT.md` or `CONTEXT-MAP.md`.
- Creating a generic `domain-modeling` or `grilling` engine before another real consumer requires it.
- Changing `context-distiller`, `aggregate-designer`, or `linguistic-boundary-verifier`.
- Harmonizing all research-workflow ADR policies.
- Implementing a plan produced during a grilling session.

## Design Decisions

### Keep two explicit user-facing modes

The normal skill remains non-mutating. Documentation writes occur only when the user deliberately invokes `grill-with-docs`, and each concrete documentation change follows a resolved user decision.

### Do not add a shared `grilling` abstraction yet

Upstream benefits from a reusable composition layer, but Maister currently has only one small existing implementation and one planned variant. Duplicating a short protocol is cheaper than adding another cross-platform skill, generated artifact, and invocation dependency. Reconsider extraction when a third consumer appears or the protocol becomes substantial.

### Use Maister's `language.md` convention

`grill-with-docs` should:

- discover applicable `language.md` files;
- challenge vocabulary conflicts and overloaded terms;
- test the model with concrete edge cases;
- compare claims with code and existing documentation;
- update the appropriate file only after terminology is resolved;
- keep implementation details out of the glossary.

If no `language.md` exists, the skill should explain that adopting the convention is optional and ask before creating the first file.

### Create ADRs sparingly

Offer an ADR only when a decision is:

1. hard to reverse;
2. surprising without context;
3. the result of a genuine trade-off.

Follow an existing repository ADR location and format when present. If none exists, propose a location and format and obtain confirmation before establishing the convention.

### Require explicit convergence

A grilling session ends only after:

- blocking decisions have been resolved or explicitly deferred;
- contradictions between the plan, code, and documentation have been surfaced;
- the agent summarizes decisions, assumptions, and open questions;
- the user explicitly confirms shared understanding.

Neither skill proceeds to implementation.

## Applicable Standards

### `.maister/docs/standards/global/plugin-development.md`

- Edit source files under `plugins/maister/`, never generated variants directly.
- Keep orchestration behavior in `SKILL.md`.
- Prefer principles and decision frameworks over verbose procedural instructions.
- Update generated variants through the build pipeline.

### `.maister/docs/standards/global/conventions.md`

- Read `.maister/docs/INDEX.md` and applicable standards before work.
- Plan before execution.
- Keep documentation current.
- Avoid speculative additions.

### `.maister/docs/standards/global/minimal-implementation.md`

- Add only abstractions with an immediate caller and clear purpose.
- Do not add future-facing stubs.
- Remove unused or redundant artifacts.

### `.maister/docs/standards/global/build-pipeline.md`

- Preserve platform-specific skill naming transforms.
- Update Kiro's exact inventory assertions when generated skill counts change.
- Ensure Kiro output contains no unsupported interactive tool names.
- Run `make build && make validate`; generated Cursor, Kiro, and Kilo variants must remain drift-free.

### `.maister/docs/standards/testing/test-writing.md`

- Add structural assertions before implementation where practical.
- Test observable generated behavior rather than internal build-script structure.
- Use `make validate` as the repository quality gate.
- Run targeted checks incrementally and the full validation suite at completion.

### `.maister/docs/standards/global/language-md-convention.md`

- Keep ubiquitous language in per-module `language.md`.
- Preserve module descriptions, core terms, operations, events, integration points, and optional published APIs.
- Do not introduce a separate context-map format when relationships can be reconstructed from integration points.

## Standards Compliance Checklist

- [ ] Only source and platform-transform files are edited directly. (`plugin-development.md`)
- [ ] Generated plugin variants are updated only through `make build`. (`plugin-development.md`, `build-pipeline.md`)
- [ ] Skill behavior remains concise and principle-based. (`plugin-development.md`)
- [ ] No speculative `grilling` or `domain-modeling` abstraction is added. (`minimal-implementation.md`)
- [ ] `grill-me` remains read-only and requires explicit convergence confirmation. (`conventions.md`)
- [ ] `grill-with-docs` never implements the resulting plan. (`conventions.md`)
- [ ] Documentation changes follow resolved user decisions. (`conventions.md`)
- [ ] Domain vocabulary uses `language.md`, not `CONTEXT.md`. (`language-md-convention.md`)
- [ ] Missing `language.md` adoption requires user confirmation. (`language-md-convention.md`)
- [ ] ADRs pass all three significance criteria and follow detected repository conventions. (`minimal-implementation.md`)
- [ ] Structural assertions are added or updated before corresponding build changes. (`test-writing.md`)
- [ ] Kiro inventory counts and shortcuts match generated output. (`build-pipeline.md`)
- [ ] Kiro output contains no banned interactive API references. (`build-pipeline.md`)
- [ ] `make build && make validate` passes. (`build-pipeline.md`, `test-writing.md`)

## Implementation Plan

### 1. Add failing structural expectations

Update the relevant Kiro tests before implementation:

- expect a `/grill-with-docs` shortcut mapping to `maister-grill-with-docs`;
- expect 69 total Kiro skill directories: 43 `maister-*` skills and 26 unprefixed shortcuts;
- assert the generated source skill and shortcut are both present;
- add a focused generated-content check that both grilling modes prohibit plan implementation.

Likely files:

- `platforms/kiro-cli/tests/build-core.test.sh`
- `platforms/kiro-cli/tests/validation.test.sh`
- `platforms/kiro-cli/tests/phase2.test.sh`

Update or add Cursor/Kilo inventory assertions only where an existing test provides an appropriate extension point. Do not create broad new test infrastructure for one Markdown skill.

### 2. Strengthen `grill-me`

Update `plugins/maister/skills/grill-me/SKILL.md` to:

- mark it explicit-only with `disable-model-invocation: true`;
- ask exactly one decision question at a time and wait for feedback;
- investigate discoverable facts independently;
- present user-owned decisions with a recommended answer and concise rationale;
- track dependencies between decisions;
- summarize decisions, assumptions, deferrals, and contradictions before closing;
- require explicit shared-understanding confirmation;
- prohibit documentation/code edits and plan implementation.

Keep the skill concise. Do not add session state files or a generic orchestration framework.

### 3. Add `grill-with-docs`

Create `plugins/maister/skills/grill-with-docs/SKILL.md` as an explicit-only utility.

It should apply the strengthened grilling protocol and add:

- discovery of `.maister/docs/INDEX.md`, applicable `language.md` files, existing ADRs, and relevant code;
- immediate vocabulary conflict detection;
- precise canonical-term proposals for vague or overloaded language;
- concrete edge-case scenarios to test domain boundaries;
- checks for contradictions between user claims, code, and documentation;
- user-confirmed inline `language.md` updates after a term is resolved;
- optional `language.md` adoption when none exists;
- sparse ADR offers using the three significance criteria;
- existing ADR format/location detection, with confirmation before introducing a new convention;
- a strict boundary that allows documentation edits but never code implementation.

Explicitly distinguish this skill from:

- `context-distiller`, which discovers strategic context boundaries;
- `aggregate-designer`, which designs consistency units;
- `linguistic-boundary-verifier`, which performs a read-only language-leakage audit.

### 4. Update the source catalog

Update `plugins/maister/CLAUDE.md`:

- add `grill-with-docs` to Review & Utility Skills;
- describe `grill-me` as the non-mutating mode;
- describe `grill-with-docs` as the documentation-maintaining mode;
- mention its integration with `language.md` and relationship to the existing modeling/review skills.

Keep catalog entries short and leave operational details in each `SKILL.md`.

### 5. Extend Kiro generation

Update `platforms/kiro-cli/build.sh` to:

- include `maister-grill-with-docs` wherever argument injection is explicitly enumerated;
- generate a `/grill-with-docs` shortcut analogous to `/grill-me`;
- ensure transformed references use Kiro-compatible names.

Update exact inventory assertions:

- `Makefile`: 69 total, 43 prefixed, 26 shortcuts;
- corresponding Kiro tests and messages.

Do not directly edit `plugins/maister-kiro/`.

### 6. Build and inspect generated variants

Run:

1. targeted Kiro structural tests;
2. `make build`;
3. inspect generated skill names and shortcut targets for Copilot, Cursor, Kiro, and Kilo;
4. verify no generated file contains unsupported interactive API references;
5. verify generated variants contain the intended read-only versus docs-writing distinction.

Generated outputs should include:

- Copilot `grill-with-docs`;
- Cursor `maister-grill-with-docs`;
- Kiro `maister-grill-with-docs` and `/grill-with-docs` shortcut;
- Kilo transformed skill output.

### 7. Full verification

Run `make validate`.

If supported by the local environment, run the Cursor CLI smoke test and confirm discovery of:

- `/maister-grill-me`;
- `/maister-grill-with-docs`.

Review every Standards Compliance Checklist item and record pass/fail before considering implementation complete.

## Risks and Mitigations

- **Competing glossary formats** — prohibit `CONTEXT.md`; use the established `language.md` convention.
- **Unexpected mutations** — keep `grill-me` strictly read-only and make documentation writes exclusive to explicit `grill-with-docs` invocation and resolved decisions.
- **Trivial ADR proliferation** — require all three significance criteria.
- **Overlap with modeling skills** — document clear responsibility boundaries; do not auto-chain unrelated analyses.
- **Platform drift** — update source and transforms, then regenerate every variant.
- **Kiro validation failures** — update hard-coded counts, shortcut generation, and banned-API checks together.
- **Premature abstraction** — defer a shared `grilling` engine until there is demonstrated reuse pressure.

## Acceptance Criteria

- `grill-me` explicitly separates facts from decisions, waits after each question, requires convergence confirmation, and never mutates or implements.
- `grill-with-docs` is explicitly invocable, uses the same interview discipline, and maintains `language.md`/qualified ADRs only with user confirmation.
- No new `CONTEXT.md` convention or speculative helper skill is introduced.
- The catalog documents both modes and their boundaries.
- All generated variants expose correctly named skills; Kiro also exposes the shortcut.
- Kiro counts are 69 total, 43 prefixed, and 26 shortcuts.
- `make build && make validate` passes with no generated drift.
