# Codebase Analysis: Advisor and Arbiter Mode

## TL;DR
Maister has no executable gate interceptor; gate behavior is Markdown-as-code in five orchestrators and transformed per platform.
The safest seam is a shared gate resolver contract plus explicit call-site instructions, durable state, and a protected implementation boundary.
The source plugin can provide a read-only advisor agent, while platform builds enforce read-only behavior differently.
The largest unresolved runtime risk is synthetic answer injection for `fully_automatic`; the contract must fail closed when the host cannot inject a gate answer.

## Key Decisions
- Centralize advisor/arbiter policy in `orchestrator-patterns.md` and require every orchestrator to apply it — prevents five divergent implementations.
- Keep `orchestrator-state.yml` as the resume source of truth and append `gate_history` after each decision — dashboard data is only a projection.
- Add a hard implementation-approval gate and executor guard — advisor output must never authorize source changes.
- Add a read-only `advisor` agent and platform-specific permission handling — advisor and arbiter can analyze but not edit.

## Open Questions / Risks
- `fully_automatic` depends on host-specific headless or synthetic-answer support; Markdown alone cannot guarantee injection into every platform gate.
- Generated variants and platform smoke tests must be rebuilt after source changes.
- The final decision summary must be generated even for blocked or failed workflows so retry and escalation history is preserved.

## Current Architecture

Maister is a Markdown-as-code plugin. The source of truth is `plugins/maister/`; `platforms/*/build.sh` creates Copilot, Cursor, Kiro, Kilo, and Codex variants. Orchestrator skills contain the phase gates directly. `orchestrator-patterns.md` defines shared semantics, state schema, dashboard projection, and phase-gate rules, but it is not a runtime interceptor.

## Primary Files

| Area | Files | Required change |
|---|---|---|
| Gate contract | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` | Define gate classification, policy precedence, advisor/arbiter flow, retries, denylist, persistence, and final reports. |
| Orchestrators | `plugins/maister/skills/{development,research,product-design,performance,migration}/SKILL.md` | Seed advisor state, apply the shared resolver at call-sites, preserve user-only safety gates, and generate decision summaries. |
| Advisor agent | `plugins/maister/agents/advisor.md` | Read-only structured recommendation/arbitration contract. |
| Initialization | `plugins/maister/skills/init/SKILL.md` | Scaffold nested config and Codex project agent template. |
| Implementation guard | `plugins/maister/skills/implementation-plan-executor/SKILL.md` | Refuse to dispatch implementers until explicit approval exists in state. |
| State/dashboard | `orchestrator-state.yml`, `dashboard-data.js`, framework dashboard asset | Persist and surface gate history and approval state. |
| Platform permissions | `platforms/cursor/build.sh`, `platforms/kilo-cli/build.sh`, `platforms/kiro-cli/agent-tools.json`, Codex template | Keep advisor read-only and preserve platform transforms. |

## Current Gaps

- No advisor or arbiter agent exists.
- Configuration seeds only `html_output`.
- Gate audit is currently phase-local and dashboard-oriented; it is not an append-only durable history.
- No retry/backoff contract exists for advisor calls.
- Implementation approval is described as a normal phase gate, not a protected state precondition.
- No final report aggregates every decision, rationale, model, retry, arbitration, override, and context link.

## Verification Boundaries

Run `make build` after source changes, then `make validate`. Cursor must verify `advisor` is readonly; Kiro must emit an advisor JSON agent with only read/grep/glob tools; Kilo must deny edit/bash; Codex must retain the project-level TOML bootstrap because the Codex plugin MVP cannot bundle a root `agents/` directory.
