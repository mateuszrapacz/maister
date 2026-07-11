#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="$ROOT/plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md"
FIXTURES="$ROOT/plugins/maister/skills/orchestrator-framework/references/gate-decision-fixtures.yml"

pass=0
fail=0

assert() {
  local description="$1"
  shift
  if "$@"; then
    echo "PASS: $description"
    pass=$((pass + 1))
  else
    echo "FAIL: $description"
    fail=$((fail + 1))
  fi
}

contains() {
  grep -Fq -- "$1" "$2"
}

in_order() {
  local first="$1"
  local second="$2"
  local file="$3"

  awk -v first="$first" -v second="$second" '
    index($0, first) && first_line == 0 { first_line = NR }
    index($0, second) && second_line == 0 { second_line = NR }
    END {
      exit !(first_line > 0 && second_line > 0 && first_line < second_line)
    }
  ' "$file"
}

fixture_contains() {
  local fixture_id="$1"
  local expected_input="$2"
  local expected_status="$3"
  local expected_actor="$4"

  awk -v fixture_id="$fixture_id" \
      -v expected_input="$expected_input" \
      -v expected_status="$expected_status" \
      -v expected_actor="$expected_actor" '
    $0 == "  - id: " fixture_id { in_fixture = 1; next }
    in_fixture && $0 ~ /^  - id:/ { exit }
    in_fixture && $0 == "    input: " expected_input { input_ok = 1 }
    in_fixture && $0 == "    expected_status: " expected_status { status_ok = 1 }
    in_fixture && $0 == "    expected_actor: " expected_actor { actor_ok = 1 }
    END { exit !(input_ok && status_ok && actor_ok) }
  ' "$FIXTURES"
}

test_contract_and_fixture_files_exist() {
  test -f "$ENGINE" && test -f "$FIXTURES"
}

test_fixture_catalog_is_complete() {
  test "$(grep -c '^  - id:' "$FIXTURES")" -eq 19 && \
    fixture_contains advisor-agrees advisor_agrees decided advisor && \
    fixture_contains advisor-disagrees-arbiter-original advisor_disagrees_arbiter_selects_original decided arbiter && \
    fixture_contains advisor-disagrees-arbiter-advisor advisor_disagrees_arbiter_selects_advisor decided arbiter && \
    fixture_contains malformed-advisor-response malformed_yaml user_pending user && \
    fixture_contains invalid-option option_not_in_supplied_list user_pending user && \
    fixture_contains low-confidence low_confidence_escalation user_pending user && \
    fixture_contains advisor-timeout-retry timeout_then_valid_response decided advisor && \
    fixture_contains advisor-retry-exhausted timeout_retry_exhaustion blocked system && \
    fixture_contains denylisted-fully-automatic implementation_approval_fully_automatic user_pending user && \
    fixture_contains implementation-approval-pending implementation_approval_pending blocked system && \
    fixture_contains implementation-approval-rejected implementation_approval_rejected blocked system && \
    fixture_contains duplicate-terminal-resume terminal_record_exists decided user && \
    fixture_contains resume-advisor-pending advisor_pending decided advisor && \
    fixture_contains resume-arbiter-pending arbiter_pending decided arbiter && \
    fixture_contains resume-user-pending user_pending decided user && \
    fixture_contains report-user-override user_override decided user && \
    fixture_contains report-failed failed_terminal_outcome failed system && \
    fixture_contains read-only-advisor advisor_attempts_file_edit blocked system && \
    fixture_contains fully-automatic-phase-continue valid_advisor_result_non_denylisted decided advisor && \
    contains 'expected_continuation: phase_continue' "$FIXTURES"
}

test_normalized_result_schema_is_complete() {
  contains 'idempotency_key: "sha256:..."' "$ENGINE" && \
    contains 'status: decided # pending | advisor_pending | arbiter_pending | user_pending | decided | blocked | failed' "$ENGINE" && \
    contains 'selected_option:' "$ENGINE" && \
    contains 'final_actor: advisor # user | advisor | arbiter | system' "$ENGINE" && \
    contains 'original_recommendation:' "$ENGINE" && \
    contains 'confidence: high # high | medium | low' "$ENGINE" && \
    contains 'escalate_to_user: false' "$ENGINE" && \
    contains 'user_override: false' "$ENGINE" && \
    contains 'error: null' "$ENGINE"
}

test_exact_option_validation_is_strict() {
  contains 'Require `selected_option` to be a supplied option' "$ENGINE" && \
    contains 'a string `rationale`' "$ENGINE" && \
    contains '`confidence` in `high|medium|low`' "$ENGINE" && \
    contains 'a boolean `escalate_to_user`' "$ENGINE" && \
    contains 'Reject extra decision fields' "$ENGINE" && \
    contains 'reject an arbiter response' "$ENGINE" && \
    contains 'invent a third' "$ENGINE"
}

test_denylist_is_non_overridable() {
  contains 'The hard denylist is:' "$ENGINE" && \
    contains 'rollback' "$ENGINE" && \
    contains 'data-integrity-halt' "$ENGINE" && \
    contains 'scope-expansion' "$ENGINE" && \
    contains 'unresolved-critical-verification' "$ENGINE" && \
    contains 'failure-recovery-skip' "$ENGINE" && \
    contains 'final-handoff-approval' "$ENGINE" && \
    contains 'implementation-approval' "$ENGINE" && \
    contains 'production-go-no-go' "$ENGINE" && \
    contains 'cannot be removed or' "$ENGINE" && \
    contains 'overridden by an advisor, arbiter, configuration, resume, or dashboard.' "$ENGINE" && \
    contains 'These gates always use the user gate.' "$ENGINE"
}

test_implementation_approval_is_independent() {
  contains 'Before dispatching an implementation executor, the host must read the current' "$ENGINE" && \
    contains 'status: approved' "$ENGINE" && \
    contains 'approved_by: user' "$ENGINE" && \
    contains 'approved_scope:' "$ENGINE" && \
    contains 'The approval record must contain the approving actor, timestamp, and approved scope.' "$ENGINE" && \
    contains 'Advisor, arbiter, automatic gate results, and resume state cannot infer or substitute this approval.' "$ENGINE" && \
    contains 'A missing, pending, or rejected approval' "$ENGINE" && \
    contains 'terminal `blocked` condition' "$ENGINE"
}

test_retry_backoff_and_exhaustion_are_persisted() {
  contains 'advisor failures' "$ENGINE" && \
    contains 'retry.advisor_attempts' "$ENGINE" && \
    contains 'exponential backoff metadata' "$ENGINE" && \
    contains 'After exhaustion' "$ENGINE" && \
    contains 'Retry arbiter failures using' "$ENGINE" && \
    contains 'arbiter_attempts' "$ENGINE" && \
    contains 'arbitration is exhausted or low-confidence' "$ENGINE" && \
    contains 'advisor_pending → advisor_pending   (retry)' "$ENGINE" && \
    contains 'arbiter_pending → arbiter_pending   (retry)' "$ENGINE" && \
    contains 'every attempt before proceeding' "$ENGINE"
}

test_disagreement_uses_exactly_one_arbiter() {
  contains 'invoke exactly one logical arbiter decision' "$ENGINE" && \
    contains 'both recommendations, both' "$ENGINE" && \
    contains 'rationales, and the same read-only context' "$ENGINE" && \
    contains 'never start a second arbiter or' "$ENGINE" && \
    contains 'Disagreement creates one logical arbiter decision.' "$ENGINE" && \
    contains 'same decision' "$ENGINE"
}

test_phase_continuation_fail_closed_behavior_is_explicit() {
  contains 'A host that cannot consume a validated result through `phase_continue`' "$ENGINE" && \
    contains 'gate when interactive and persists `blocked` otherwise' "$ENGINE" && \
    contains 'fully_automatic` mode on a non-interactive host' "$ENGINE" && \
    contains 'No host may claim `fully_automatic`' "$ENGINE"
}

test_idempotency_reuses_terminal_records() {
  contains 'A gate is idempotent by `phase_id` plus a canonical hash' "$ENGINE" && \
    contains 'Any terminal record with that key is reused' "$ENGINE" && \
    contains 'Before any host invocation, read the persisted `orchestrator.gate_history`.' "$ENGINE" && \
    contains 'Do not invoke an advisor, arbiter, user gate,' "$ENGINE" && \
    contains 'do not append a duplicate record.' "$ENGINE"
}

test_resume_state_machine_is_complete() {
  contains 'advisor_pending`, `arbiter_pending`, or `user_pending`' "$ENGINE" && \
    contains 'It does not restart completed attempts, reset backoff, or invoke a' "$ENGINE" && \
    contains 'A terminal idempotency record is returned as-is' "$ENGINE" && \
    contains 'Resume cannot infer implementation approval from any gate result.' "$ENGINE" && \
    contains 'interruption/timeout and consumes its recorded retry slot.' "$ENGINE"
}

test_persistence_precedes_continuation() {
  contains 'For every terminal outcome, append one complete result to' "$ENGINE" && \
    contains 'The host/orchestrator must perform these operations in order' "$ENGINE" && \
    contains 'write_state_atomic(pending or *_pending + attempt record)' "$ENGINE" && \
    contains 'write_state_atomic(updated attempt or terminal gate_history record)' "$ENGINE" && \
    contains 'generate decision-summary.md (and .html when html_output is true) from state' "$ENGINE" && \
    contains 'phase_continue(selected_option) / update phase status' "$ENGINE" && \
    in_order 'write_state_atomic(pending or *_pending + attempt record)' 'write_state_atomic(updated attempt or terminal gate_history record)' "$ENGINE" && \
    in_order 'generate decision-summary.md' 'phase_continue(selected_option) / update phase status' "$ENGINE"
}

test_reports_use_state_source_of_truth() {
  contains 'Decision reports are generated from `orchestrator.gate_history` only.' "$ENGINE" && \
  contains 'enumerate `orchestrator.gate_history[]` from `orchestrator-state.yml` and never' "$ENGINE" && \
    contains 'dashboard data is a projection' "$ENGINE" && \
    contains 'success, blocked, failed' "$ENGINE" && \
    contains 'resume reuse' "$ENGINE" && \
    contains 'The HTML companion is a faithful presentation of the Markdown report' "$ENGINE" && \
    contains 'contains no additional decision data.' "$ENGINE"
}

test_all_source_orchestrators_reference_engine() {
  local skill
  for skill in development research product-design performance migration; do
    contains 'gate-decision-engine.md' "$ROOT/plugins/maister/skills/$skill/SKILL.md" || return 1
  done
}

test_all_source_orchestrators_bind_runner() {
  local skill
  for skill in development research product-design performance migration; do
    contains 'bin/phase-continue.mjs' "$ROOT/plugins/maister/skills/$skill/SKILL.md" || return 1
  done
}

test_host_adapter_contract_is_present() {
  contains 'The host adapter supplies five primitives:' "$ENGINE" && \
    contains 'Every host must map these core primitives' "$ENGINE" && \
    contains '`read_state`' "$ENGINE" && \
    contains '`invoke_advisor`' "$ENGINE" && \
    contains '`invoke_arbiter`' "$ENGINE" && \
    contains '`present_user_gate`' "$ENGINE" && \
    contains '`write_state`' "$ENGINE" && \
    contains '`write_state_atomic`' "$ENGINE" && \
    contains '`refresh_dashboard`' "$ENGINE" && \
    contains '`generate_decision_reports`' "$ENGINE" && \
    contains '`automatic_answer_injection_supported`' "$ENGINE" && \
    contains '`phase_continue`' "$ENGINE" && \
    contains '`phase_continuation_supported`' "$ENGINE" && \
    contains 'phase-continue.mjs' "$ENGINE" && \
    contains 'fully_automatic` may continue through `phase_continue(selected_option)`' "$ENGINE" && \
    contains 'must not call `present_user_gate`' "$ENGINE"
}

test_fully_automatic_continuation_is_executable() {
    contains '`fully_automatic` may continue through `phase_continue(selected_option)`' "$ENGINE" && \
    contains 'must not call `present_user_gate`' "$ENGINE" && \
    contains 'automatic answer injection' "$ENGINE" && \
    contains '`phase_continue(selected_option)`' "$ENGINE"
}

test_hosts_declare_phase_continuation_support() {
  local matrix="$ROOT/.maister/tasks/development/2026-07-11-advisor-mode/analysis/runtime-capability-matrix.md"
  for host in Cursor Kiro Kilo Copilot Codex; do
    grep -Fq "| $host |" "$matrix" || return 1
  done
  contains 'phase_continue(selected_option)' "$matrix" && \
    contains 'fully_automatic: supported' "$matrix" && \
    contains 'denylisted gates remain manual' "$matrix" && \
    contains 'phase_continue(selected_option)' "$ROOT/plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md"
}

test_generated_variants_preserve_continuation_contract() {
  local file
  for file in \
    "$ROOT/plugins/maister-codex/skills/orchestrator-framework/references/gate-decision-engine.md" \
    "$ROOT/plugins/maister-copilot/skills/orchestrator-framework/references/gate-decision-engine.md" \
    "$ROOT/plugins/maister-cursor/lib/orchestrator-framework/references/gate-decision-engine.md" \
    "$ROOT/plugins/maister-kilo/.kilo/skills/orchestrator-framework/references/gate-decision-engine.md" \
    "$ROOT/plugins/maister-kiro/skills/maister-orchestrator-framework/references/gate-decision-engine.md"; do
    test -f "$file" && grep -Fq 'phase_continue(selected_option)' "$file" || return 1
  done
  for file in \
    "$ROOT/plugins/maister-codex/skills/orchestrator-framework/bin/phase-continue.mjs" \
    "$ROOT/plugins/maister-copilot/skills/orchestrator-framework/bin/phase-continue.mjs" \
    "$ROOT/plugins/maister-cursor/lib/orchestrator-framework/bin/phase-continue.mjs" \
    "$ROOT/plugins/maister-kilo/.kilo/skills/orchestrator-framework/bin/phase-continue.mjs" \
    "$ROOT/plugins/maister-kiro/skills/maister-orchestrator-framework/bin/phase-continue.mjs"; do
    test -f "$file" || return 1
  done
}

echo "=== Gate decision engine deterministic contract tests ==="
assert "contract and fixture files exist" test_contract_and_fixture_files_exist
assert "fixture catalog covers all required deterministic scenarios" test_fixture_catalog_is_complete
assert "normalized result schema is complete" test_normalized_result_schema_is_complete
assert "exact option validation rejects malformed decisions" test_exact_option_validation_is_strict
assert "safety denylist is non-overridable" test_denylist_is_non_overridable
assert "implementation approval is an independent mutation guard" test_implementation_approval_is_independent
assert "retry, backoff, and exhaustion are persisted" test_retry_backoff_and_exhaustion_are_persisted
assert "disagreement invokes exactly one arbiter" test_disagreement_uses_exactly_one_arbiter
assert "unsupported phase continuation fails closed" test_phase_continuation_fail_closed_behavior_is_explicit
assert "terminal decisions are idempotently reused" test_idempotency_reuses_terminal_records
assert "resume state machine preserves pending and terminal states" test_resume_state_machine_is_complete
assert "persistence precedes phase continuation" test_persistence_precedes_continuation
assert "reports use gate history as their source of truth" test_reports_use_state_source_of_truth
assert "all source orchestrators reference the shared engine" test_all_source_orchestrators_reference_engine
assert "all source orchestrators bind the executable continuation runner" test_all_source_orchestrators_bind_runner
assert "host adapter capability contract is documented" test_host_adapter_contract_is_present
assert "fully automatic continuation is executable" test_fully_automatic_continuation_is_executable
assert "all hosts declare phase continuation support" test_hosts_declare_phase_continuation_support
assert "generated variants preserve continuation contract" test_generated_variants_preserve_continuation_contract

echo ""
echo "Results: $pass passed, $fail failed"
test "$fail" -eq 0
