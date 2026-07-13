#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNNER="${PHASE_CONTINUE_RUNNER:-$ROOT/plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs}"
RUNNER_LABEL="${PHASE_CONTINUE_RUNNER_LABEL:-source}"
FIXTURE="$ROOT/tests/fixtures/phase-continue/valid-v2-terminal.yml"
WORK="$(mktemp -d)"
WORK="$(cd "$WORK" && pwd -P)"
trap 'rm -rf "$WORK"' EXIT

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

setup_case() {
  CASE="$WORK/$1"
  mkdir -p "$CASE"
  STATE="$CASE/orchestrator-state.yml"
  REPORT_MD="$CASE/decision-summary.md"
  REPORT_HTML="$CASE/decision-summary.html"
  cp "$FIXTURE" "$STATE"
}

payload() {
  local selected="${1:-Continue}"
  local gate_type="${2:-research-convergence}"
  STATE="$STATE" REPORT_MD="$REPORT_MD" REPORT_HTML="$REPORT_HTML" SELECTED="$selected" GATE_TYPE="$gate_type" node --input-type=module <<'NODE'
const value = {
  state: process.env.STATE,
  phase_id: "phase-1",
  gate_type: process.env.GATE_TYPE,
  question: "Choose the next decision area",
  options: ["Continue", "Pause"],
  selected_option: process.env.SELECTED,
  actor: "advisor",
  confidence: "high",
  next_phase: "phase-2",
  report_md: process.env.REPORT_MD,
  report_html: process.env.REPORT_HTML,
};
process.stdout.write(JSON.stringify(value));
NODE
}

run_payload() {
  local input="$1"
  local failure="${2:-}"
  set +e
  printf '%s' "$input" | PHASE_CONTINUE_TEST_FAILURE="$failure" node "$RUNNER" >"$CASE/stdout" 2>"$CASE/stderr"
  RUN_EXIT=$?
  set -e
}

valid_terminal_is_verified_and_projected() {
  setup_case valid
  run_payload "$(payload)"
  test "$RUN_EXIT" -eq 0 && jq -e '.status == "continued" and .gate_status == "decided"' "$CASE/stdout" >/dev/null && \
    grep -Fq 'current_phase: "phase-2"' "$STATE" && grep -Fq '1 persisted gate decision(s)' "$REPORT_MD" && grep -Fq 'Decision Summary' "$REPORT_HTML"
}

duplicate_json_and_unknown_fields_fail_without_mutation() {
  setup_case invalid-json
  cp -p "$STATE" "$CASE/state.before"
  run_payload '{"state":"a","state":"b"}'
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" && cmp -s "$STATE" "$CASE/state.before" || return 1
  local invalid
  invalid="$(payload | sed 's/}$/,"extra":true}/')"
  run_payload "$invalid"
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" && cmp -s "$STATE" "$CASE/state.before"
}

changed_selection_and_denylist_are_rejected() {
  setup_case unsafe
  cp -p "$STATE" "$CASE/state.before"
  run_payload "$(payload Pause)"
  test "$RUN_EXIT" -ne 0 && grep -Eiq 'selection|terminal' "$CASE/stderr" && cmp -s "$STATE" "$CASE/state.before" || return 1
  run_payload "$(payload Continue implementation-approval)"
  test "$RUN_EXIT" -ne 0 && grep -Fqi 'denylisted' "$CASE/stderr" && cmp -s "$STATE" "$CASE/state.before"
}

report_failure_recovers_from_terminal_without_duplicate_effects() {
  setup_case report-recovery
  cp -p "$STATE" "$CASE/state.before"
  run_payload "$(payload)" report
  test "$RUN_EXIT" -ne 0 && cmp -s "$STATE" "$CASE/state.before" && test ! -e "$REPORT_MD" && test ! -e "$REPORT_HTML" || return 1
  run_payload "$(payload)"
  test "$RUN_EXIT" -eq 0 && grep -Fq 'current_phase: "phase-2"' "$STATE" && test "$(grep -c 'idempotency_key:' "$STATE")" -eq 1 || return 1
  cp -p "$STATE" "$CASE/state.after"
  run_payload "$(payload)"
  test "$RUN_EXIT" -eq 0 && jq -e '.status == "reused"' "$CASE/stdout" >/dev/null && cmp -s "$STATE" "$CASE/state.after"
}

transition_failure_recovers_exactly_once() {
  setup_case transition-recovery
  run_payload "$(payload)" transition
  test "$RUN_EXIT" -ne 0 && grep -Fq 'current_phase: "phase-1"' "$STATE" && grep -Fq 'Decision Summary' "$REPORT_MD" || return 1
  run_payload "$(payload)"
  test "$RUN_EXIT" -eq 0 && grep -Fq 'current_phase: "phase-2"' "$STATE" && test "$(grep -c 'idempotency_key:' "$STATE")" -eq 1
}

input_file_transport_is_supported() {
  setup_case input-file
  payload >"$CASE/input.json"
  node "$RUNNER" --input-file "$CASE/input.json" >"$CASE/stdout" 2>"$CASE/stderr"
  jq -e '.status == "continued"' "$CASE/stdout" >/dev/null
}

echo "=== phase-continue contract matrix: $RUNNER_LABEL ($RUNNER) ==="
assert "terminal evaluator record is verified before reports and transition" valid_terminal_is_verified_and_projected
assert "duplicate JSON and unknown payload fields fail without mutation" duplicate_json_and_unknown_fields_fail_without_mutation
assert "changed selection and denylisted gates remain fail-closed" changed_selection_and_denylist_are_rejected
assert "report failure recovers without duplicate gate or transition effects" report_failure_recovers_from_terminal_without_duplicate_effects
assert "transition failure recovers exactly once" transition_failure_recovers_exactly_once
assert "exact --input-file transport remains supported" input_file_transport_is_supported

echo "Contract cases: $pass passed, $fail failed"
test "$fail" -eq 0
