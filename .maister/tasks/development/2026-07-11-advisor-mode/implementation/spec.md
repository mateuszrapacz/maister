# Specification: Advisor and Arbiter Gate Resolution

## TL;DR
Maister gains a shared, opt-in gate resolver contract that can consult a read-only advisor and arbitrate disagreements.
Policies are configured per gate type; safety-critical gates and implementation approval remain user-controlled.
The complete decision trail is persisted after every decision and rendered as final Markdown and HTML reports.

## Key Decisions
- Centralize policy in `orchestrator-patterns.md` and apply it from all five orchestrators — one lifecycle contract across platform transforms.
- Store `gate_history` and `implementation_approval` in state — supports interruption, resume, and accountability.
- Use a separate configurable arbiter model with a same-advisor fallback — preserves independence while keeping setup minimal.

## Open Questions / Risks
- `fully_automatic` synthetic answer injection remains host-dependent; unsupported hosts must use a documented headless fallback or stop.
- Cursor and Copilot model pinning require runtime verification beyond structural build checks.

## Behavior

### Configuration

```yaml
advisor:
  enabled: false
  gate_policies: {}
  advisor_agent: advisor
  advisor_model: null
  arbiter_agent: advisor
  arbiter_model: null
  arbiter_enabled_on_disagreement: true
  retry:
    advisor_attempts: 3
    arbiter_attempts: 3
    backoff: exponential
```

Absent configuration means manual gates. The denylist is always applied first.

### Decision flow

1. Classify the gate and load policy from state.
2. For manual or denylisted gates, use the existing platform user gate.
3. For advisor policies, invoke `advisor` with question, options, original recommendation, artifacts, dashboard, phase summaries, and history.
4. If the result matches the original recommendation, continue for a safe configured gate.
5. If it differs, invoke one arbiter with both recommendations and the same read-only context.
6. In interactive advisor mode, present both recommendations and arbiter output to the user. In fully automatic mode, accept only the arbiter's valid, sufficiently confident choice for safe gates.
7. Retry failures with configured backoff; after exhaustion use manual fallback or stop, depending on mode.
8. Persist the complete record before continuing.

### Safety and mutation boundary

The non-overridable denylist includes rollback, data-integrity halt, scope expansion, unresolved critical verification, failure-recovery skip, final handoff approval, production GO/NO-GO, and implementation approval. Advisors and arbiters may not edit source, configuration, implementation artifacts, or user docs. The implementation executor must verify explicit approval in state before dispatching implementers.

### Reports

Every workflow writes `outputs/decision-summary.md`; `outputs/decision-summary.html` is written when `html_output` is true. Both include every decision, alternatives, actor, models, rationale, confidence, retries, arbitration, user overrides, context links, and terminal status. Reports are generated on success, blocked, and failed termination.

## Acceptance Criteria

- Existing projects with no advisor config behave exactly as manual workflows.
- All five orchestrators reference the shared resolver contract and persist decisions.
- Cursor, Kiro, and Kilo mark advisor as read-only; Codex has a project-level read-only TOML bootstrap.
- Implementation cannot start without `implementation_approval.status: approved`.
- `make build` and `make validate` pass after source changes.
