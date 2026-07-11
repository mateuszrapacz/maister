# Implementation Plan: Advisor and Arbiter Mode

## TL;DR
Implementation is split into four groups: shared contract/state, workflow call-sites and approval guard, agent/platform permissions, and validation/reporting.
Groups are ordered to keep the source-of-truth contract ahead of platform transforms and verification.
The implementation is documentation-first because Maister executes Markdown instructions through host runtimes.

## Key Decisions
- Keep changes in source plugin and platform build scripts; rebuild generated variants — follows project standards.
- Treat `make build` plus `make validate` as the integration test — this repo uses structural validation rather than a unit-test framework.

## Open Questions / Risks
- Live synthetic-answer behavior cannot be proven by static validation and remains a platform smoke-test item.

## Task Group 1 — Shared Contract and State

**Dependencies:** None

**Files to Modify:**
- `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`
- `plugins/maister/skills/orchestrator-framework/assets/dashboard.html`
- `plugins/maister/skills/init/SKILL.md`
- `plugins/maister/CLAUDE.md`

### Steps

- [x] 1.1 Define advisor/arbiter gate policy, safety denylist, retry/backoff, durable `gate_history`, implementation approval, and final report contract.
- [x] 1.2 Extend dashboard projection guidance and viewer rendering for gate history.
- [x] 1.3 Extend init/config documentation with advisor defaults and Codex bootstrap rules.

## Task Group 2 — Workflow Integration and Mutation Guard

**Dependencies:** Group 1

**Files to Modify:**
- `plugins/maister/skills/development/SKILL.md`
- `plugins/maister/skills/research/SKILL.md`
- `plugins/maister/skills/product-design/SKILL.md`
- `plugins/maister/skills/performance/SKILL.md`
- `plugins/maister/skills/migration/SKILL.md`
- `plugins/maister/skills/implementation-plan-executor/SKILL.md`

### Steps

- [x] 2.1 Add advisor audit upkeep and call-site policy requirements to each orchestrator.
- [x] 2.2 Add the explicit implementation-approval gate and executor precondition.
- [x] 2.3 Add terminal decision-summary generation and advisor state extensions.

## Task Group 3 — Advisor Agent and Platform Permissions

**Dependencies:** Group 1

**Files to Modify:**
- `plugins/maister/agents/advisor.md`
- `platforms/codex-cli/templates/advisor.toml`
- `platforms/cursor/build.sh`
- `platforms/cursor/smoke-cli.sh`
- `platforms/kilo-cli/build.sh`
- `platforms/kiro-cli/agent-tools.json`
- `plugins/maister/hooks/post-compact-reminder.sh`
- `platforms/cursor/hooks/post-compact-reminder.sh`
- `platforms/kiro-cli/hooks/stop-state-reminder-kiro.sh`

### Steps

- [x] 3.1 Add the structured, read-only advisor agent contract.
- [x] 3.2 Enforce read-only permissions in Cursor, Kilo, Kiro, and Codex bootstrap paths.
- [x] 3.3 Preserve pending advisor and implementation approval state after compaction/stop reminders.

## Task Group 4 — Build and Structural Verification

**Dependencies:** Groups 1, 2, 3

**Files to Modify:**
- `Makefile`

### Steps

- [x] 4.1 Add structural checks for advisor presence and read-only platform output.
- [ ] 4.2 Run `make build` and `make validate`; resolve generated-variant regressions.
- [ ] 4.3 Inspect the final diff and record known platform runtime limitations.

## Standards Compliance

- `.maister/docs/standards/global/plugin-development.md` — source-only edits and build-generated variants.
- `.maister/docs/standards/global/build-pipeline.md` — platform transforms and smoke validation.
- `.maister/docs/standards/global/minimal-implementation.md` — no custom runtime proxy or speculative API.
- `.maister/docs/standards/testing/test-writing.md` — structural validation and risk-based coverage.
