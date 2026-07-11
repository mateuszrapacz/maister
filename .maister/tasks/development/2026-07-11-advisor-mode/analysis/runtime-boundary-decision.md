# Runtime Boundary Decision: Advisor and Arbiter Mode

## TL;DR

The capability audit now supports a Markdown-first contract plus a bundled, host-neutral `phase-continue.rb` adapter. The helper owns exact option validation, denylist checks, atomic state persistence, report generation, idempotency reuse, and phase transition; host runtimes only invoke it and continue from its normalized result.

## Key Decisions

- Implement one normative gate-decision algorithm in the orchestrator framework and require every orchestrator call site to provide the same normalized context and result contract.
- Keep host-specific operations behind explicit mappings for advisor invocation, arbiter invocation, user gates, state writes, resume reads, and automatic answer injection.
- Do not add an external service or speculative runtime proxy; the bundled helper is local, deterministic, and invoked explicitly by the host adapter.
- Keep implementation approval and the safety denylist outside advisor/arbiter authority.

## Open Questions & Risks

- The specification must define how each host reports unsupported automatic injection and how headless hosts persist `blocked` without treating it as approval.
- A later executable helper may be warranted only after a host proves a stable callable protocol and deterministic test seam.

## Boundary

The shared framework owns:

1. Gate classification and denylist precedence.
2. Idempotency key computation and terminal-record reuse.
3. Strict advisor/arbiter response validation.
4. Retry, backoff, escalation, and disagreement rules.
5. Normalized decision records and persistence ordering.
6. Report generation from `orchestrator-state.yml`.

Each host adapter owns:

1. Invoking the configured read-only advisor and arbiter.
2. Presenting the final user gate.
3. Writing and reading the state through the host's supported workflow mechanism.
4. Injecting an automatic answer only when the host can prove that behavior.

For the follow-up, the source mappings are explicit and use the bundled
continuation helper:

| Host | Advisor/arbiter | User gate | Resume | Automatic injection |
|---|---|---|---|---|
| Cursor | `maister-advisor` Cursor subagent/Task | `AskQuestion` | `/maister-resume` | `phase-continue.rb` → `phase_continue(selected_option)` |
| Kiro | `maister-advisor` JSON agent with read/grep/glob only | **CHAT GATE** | `@resume`/state read | `phase-continue.rb` → `phase_continue(selected_option)` |
| Kilo | `@maister-advisor` with edit/bash denied | Chat gate | `.maister` state read | `phase-continue.rb` → `phase_continue(selected_option)` |
| Copilot | Generated `advisor` agent | `ask_user` | State read by resume workflow | `phase-continue.rb` → `phase_continue(selected_option)` |
| Codex | Native `advisor` role from `advisor.toml` | Plain-text user question | `$maister:resume` | `phase-continue.rb` → `phase_continue(selected_option)` |

In every row, the orchestrator—not the advisor or arbiter—writes
`orchestrator-state.yml`, records pending/terminal gate history, and enforces
the separate implementation-approval gate.
