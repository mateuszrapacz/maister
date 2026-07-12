#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNNER="${PHASE_CONTINUE_RUNNER:-$ROOT/plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs}"
RUNNER_LABEL="${PHASE_CONTINUE_RUNNER_LABEL:-source}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

BASELINE="$WORK/baseline.yml"
FIXTURES="$ROOT/tests/fixtures/phase-continue"
cp "$FIXTURES/valid-empty.yml" "$BASELINE"

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
  CASE="$WORK/case-$1"
  rm -rf "$CASE"
  mkdir -p "$CASE/reports"
  STATE="$CASE/orchestrator-state.yml"
  REPORT_MD="$CASE/reports/decision-summary.md"
  REPORT_HTML="$CASE/reports/decision-summary.html"
  cp "$BASELINE" "$STATE"
  printf 'existing markdown\n' > "$REPORT_MD"
  printf 'existing html\n' > "$REPORT_HTML"
}

setup_fixture_case() {
  local fixture="$1"
  setup_case "fixture-$(basename "$fixture" .yml)"
  cp "$FIXTURES/$fixture" "$STATE"
}

make_payload() {
  local variant="${1:-valid}"
  STATE_PATH="$STATE" REPORT_MD_PATH="$REPORT_MD" REPORT_HTML_PATH="$REPORT_HTML" \
    node --input-type=module - "$variant" <<'NODE'
const variant = process.argv[2];
const payload = {
  state: process.env.STATE_PATH,
  phase_id: "phase-1",
  gate_type: "phase-exit",
  question: "Question with spaces, café \"quote\" | pipe\nline",
  options: ["Continue now", "暂停 | keep", "line\noption", "<tag> & \"quote\""],
  selected_option: "Continue now",
  actor: "advisor",
  confidence: "high",
  next_phase: "phase-2",
  report_md: process.env.REPORT_MD_PATH,
  report_html: process.env.REPORT_HTML_PATH,
};

switch (variant) {
  case "unknown": payload.extra = true; break;
  case "unknown-proto": Object.defineProperty(payload, "__proto__", { value: true, enumerable: true }); break;
  case "missing": delete payload.actor; break;
  case "wrong-options": payload.options = {}; break;
  case "bad-actor": payload.actor = "system"; break;
  case "bad-confidence": payload.confidence = "low"; break;
  case "non-string-selection": payload.selected_option = ["Continue now"]; break;
  case "bad-next-phase": payload.next_phase = 4; break;
  case "empty-question": payload.question = ""; break;
  case "nul-question": payload.question = "bad\u0000question"; break;
  case "empty-state": payload.state = ""; break;
  case "nul-state": payload.state = "bad\u0000state"; break;
  case "collision-state-md": payload.report_md = payload.state; break;
  case "collision-reports": payload.report_html = payload.report_md; break;
  case "duplicate-options": payload.options = ["Continue now", "Continue now"]; break;
  case "invalid-selection": payload.selected_option = "Not supplied"; break;
  case "bad-phase-id": payload.phase_id = "phase 1"; break;
  case "bad-gate-type": payload.gate_type = "phase/exit"; break;
  case "bad-next-id": payload.next_phase = "phase\\2"; break;
  case "bad-report": payload.report_md = 7; break;
  case "unknown-phase": payload.phase_id = "phase-unknown"; break;
  case "unknown-target": payload.next_phase = "phase-unknown"; break;
  case "self-transition": payload.next_phase = payload.phase_id; break;
  case "invalid-current": payload.phase_id = "phase-1"; break;
  case "already-active-target": payload.phase_id = "phase-1"; payload.next_phase = "phase-2"; break;
  case "denylist": payload.gate_type = "rollback"; break;
  case "denylist-changed": payload.gate_type = "rollback"; payload.selected_option = "暂停 | keep"; break;
  case "changed-selection": payload.selected_option = "暂停 | keep"; break;
  case "no-transition": delete payload.next_phase; break;
  default: break;
}

process.stdout.write(JSON.stringify(payload));
NODE
}

run_stdin() {
  local input="$1"
  set +e
  printf '%s' "$input" | node "$RUNNER" > "$CASE/stdout" 2> "$CASE/stderr"
  RUN_EXIT=$?
  set -e
}

run_stdin_with_failure() {
  local failure="$1"
  local input="$2"
  set +e
  printf '%s' "$input" | PHASE_CONTINUE_TEST_FAILURE="$failure" node "$RUNNER" > "$CASE/stdout" 2> "$CASE/stderr"
  RUN_EXIT=$?
  set -e
}

run_args() {
  set +e
  printf '%s' "$(make_payload)" | node "$RUNNER" "$@" > "$CASE/stdout" 2> "$CASE/stderr"
  RUN_EXIT=$?
  set -e
}

run_input_file() {
  local input="$1"
  printf '%s' "$input" > "$CASE/input.json"
  set +e
  node "$RUNNER" --input-file "$CASE/input.json" > "$CASE/stdout" 2> "$CASE/stderr"
  RUN_EXIT=$?
  set -e
}

state_and_reports_unchanged() {
  cmp -s "$STATE" "$CASE/state.before" && \
    cmp -s "$REPORT_MD" "$CASE/report-md.before" && \
    cmp -s "$REPORT_HTML" "$CASE/report-html.before"
}

snapshot_files() {
  cp "$STATE" "$CASE/state.before"
  cp "$REPORT_MD" "$CASE/report-md.before"
  cp "$REPORT_HTML" "$CASE/report-html.before"
}

snapshot_directories() {
  find "$CASE" -type d -print | sort > "$CASE/directories.before"
}

state_reports_and_directories_unchanged() {
  state_and_reports_unchanged && \
    find "$CASE" -type d -print | sort > "$CASE/directories.after" && \
    cmp -s "$CASE/directories.before" "$CASE/directories.after"
}

json_stdout() {
  node --input-type=module - "$CASE/stdout" <<'NODE'
import fs from "node:fs";
const output = fs.readFileSync(process.argv[2], "utf8");
JSON.parse(output);
if (output.includes("phase_continue:")) process.exit(1);
NODE
}

test_valid_stdin() {
  setup_case 1
  run_stdin "$(make_payload)"
  test "$RUN_EXIT" -eq 0 && json_stdout && grep -Fq 'café' "$STATE" && grep -Fq '1 persisted gate decision(s)' "$REPORT_MD"
}

test_runner_path_is_explicit() {
  test -n "$RUNNER_LABEL" && test -f "$RUNNER"
}

test_valid_input_file() {
  setup_case 2
  run_input_file "$(make_payload)"
  test "$RUN_EXIT" -eq 0 && json_stdout && grep -Fq '"status":"decided"' "$CASE/stdout"
}

test_invalid_json_values() {
  local input
  for input in "" '{' 'true' '1' '[]' 'null'; do
    setup_case "invalid-${#input}-${RANDOM}"
    snapshot_files
    run_stdin "$input"
    test "$RUN_EXIT" -ne 0 || return 1
    test ! -s "$CASE/stdout" || return 1
    grep -Eiq 'json|payload|input' "$CASE/stderr" || return 1
    state_and_reports_unchanged || return 1
  done
}

test_rejects_legacy_and_extra_arguments() {
  setup_case 4
  snapshot_files
  run_args --input-file "$CASE/one.json" --input-file "$CASE/two.json"
  test "$RUN_EXIT" -ne 0 && state_and_reports_unchanged && test ! -s "$CASE/stdout" || return 1

  run_args positional
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" || return 1

  run_args --state "$STATE"
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" || return 1

  run_args --options-json '[]'
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout"
}

test_rejects_duplicate_json_keys() {
  setup_case 5
  snapshot_files
  local duplicate_root duplicate_nested
  duplicate_root=$(make_payload | sed "s#\"phase_id\":\"phase-1\"#\"phase_id\":\"phase-1\",\"phase_id\":\"phase-1\"#")
  duplicate_nested=$(make_payload | sed 's#"report_html"#"nested":{"key":1,"key":2},"report_html"#')
  for input in "$duplicate_root" "$duplicate_nested"; do
    run_stdin "$input"
    test "$RUN_EXIT" -ne 0 || return 1
    grep -Eiq 'duplicate.*key|duplicate.*json' "$CASE/stderr" || return 1
    state_and_reports_unchanged || return 1
  done
}

test_exact_schema_validation() {
  local variant field
  for variant in unknown unknown-proto missing wrong-options bad-actor bad-confidence non-string-selection bad-next-phase bad-report; do
    setup_case "schema-$variant"
    snapshot_files
    run_stdin "$(make_payload "$variant")"
    test "$RUN_EXIT" -ne 0 || return 1
    test ! -s "$CASE/stdout" || return 1
    state_and_reports_unchanged || return 1
  done
  field=$(cat "$CASE/stderr")
  test -n "$field" && printf '%s' "$field" | grep -Eiq 'field|actor|confidence|options|next_phase|report|unknown|missing'
}

test_exact_string_and_membership_validation() {
  local variant
  for variant in empty-question nul-question empty-state nul-state collision-state-md collision-reports duplicate-options invalid-selection bad-phase-id bad-gate-type bad-next-id; do
    setup_case "value-$variant"
    snapshot_files
    run_stdin "$(make_payload "$variant")"
    test "$RUN_EXIT" -ne 0 || return 1
    grep -Eiq 'field|path|question|state|report|option|phase|gate|NUL|empty|collision' "$CASE/stderr" || return 1
    state_and_reports_unchanged || return 1
  done
}

test_validation_channels_and_immutability() {
  setup_case 8
  snapshot_files
  run_stdin '{"state":"'"$STATE"'","phase_id":"phase-1","gate_type":"phase-exit","question":"?","options":["a"],"selected_option":"b","actor":"advisor","confidence":"high"}'
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" && test -s "$CASE/stderr" && state_and_reports_unchanged
}

test_accepts_canonical_state_fixtures() {
  local fixture
  for fixture in valid-empty.yml valid-populated.yml; do
    setup_fixture_case "$fixture"
    run_stdin "$(make_payload)"
    test "$RUN_EXIT" -eq 0 || return 1
    json_stdout || return 1
    grep -Fq 'current_phase: phase-2' "$STATE" || return 1
  done
}

test_rejects_malformed_canonical_state() {
  local fixture
  for fixture in invalid-tabs.yml invalid-duplicate-anchors.yml invalid-misplaced-anchors.yml \
    invalid-history-record.yml invalid-phases.yml unsupported-yaml.yml; do
    setup_fixture_case "$fixture"
    snapshot_directories
    snapshot_files
    run_stdin "$(make_payload)"
    test "$RUN_EXIT" -ne 0 || return 1
    test ! -s "$CASE/stdout" || return 1
    test -s "$CASE/stderr" || return 1
    grep -Eiq 'state|canonical|yaml|phase|history|anchor|unsupported|duplicate|record|tab' "$CASE/stderr" || return 1
    state_reports_and_directories_unchanged || return 1
  done
}

test_rejects_missing_canonical_anchors() {
  setup_fixture_case invalid-missing-gate-history.yml
  snapshot_directories
  snapshot_files
  run_stdin "$(make_payload)"
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" && \
    grep -Fq 'orchestrator.gate_history must exist exactly once at its canonical anchor' "$CASE/stderr" && \
    state_reports_and_directories_unchanged || return 1

  setup_fixture_case invalid-missing-root-phases.yml
  snapshot_directories
  snapshot_files
  run_stdin "$(make_payload)"
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" && \
    grep -Fq 'root phases must be a sequence' "$CASE/stderr" && \
    state_reports_and_directories_unchanged
}

test_rejects_invalid_phase_membership_and_transitions() {
  local variant
  for variant in unknown-phase unknown-target self-transition invalid-current already-active-target; do
    setup_fixture_case valid-empty.yml
    case "$variant" in
      unknown-phase) make_payload_variant=unknown-phase ;;
      unknown-target) make_payload_variant=unknown-target ;;
      self-transition) make_payload_variant=self-transition ;;
      invalid-current) make_payload_variant=invalid-current ;;
      already-active-target) make_payload_variant=already-active-target ;;
    esac

    if test "$variant" = invalid-current; then
      perl -0pi -e 's/current_phase: phase-1/current_phase: phase-2/' "$STATE"
      perl -0pi -e 's/status: in_progress/status: completed/' "$STATE"
      perl -0pi -e 's/status: pending/status: in_progress/' "$STATE"
    elif test "$variant" = already-active-target; then
      perl -0pi -e 's/status: pending/status: in_progress/' "$STATE"
    fi
    snapshot_directories
    snapshot_files
    run_stdin "$(make_payload "$make_payload_variant")"
    test "$RUN_EXIT" -ne 0 || return 1
    test ! -s "$CASE/stdout" || return 1
    grep -Eiq 'phase|transition|current|target|pending|in.progress|membership' "$CASE/stderr" || return 1
    state_reports_and_directories_unchanged || return 1
  done
}

test_rejects_backward_transition() {
  setup_fixture_case valid-empty.yml
  perl -0pi -e 's/current_phase: phase-1/current_phase: phase-2/' "$STATE"
  perl -0pi -e 's/status: in_progress/status: completed/' "$STATE"
  perl -0pi -e 's/status: pending/status: in_progress/' "$STATE"
  snapshot_directories
  snapshot_files
  STATE_PATH="$STATE" REPORT_MD_PATH="$REPORT_MD" REPORT_HTML_PATH="$REPORT_HTML" node --input-type=module - > "$CASE/input.json" <<'NODE'
const payload = {
  state: process.env.STATE_PATH,
  phase_id: "phase-2",
  gate_type: "phase-exit",
  question: "Go backwards?",
  options: ["Go backwards"],
  selected_option: "Go backwards",
  actor: "advisor",
  confidence: "high",
  next_phase: "phase-1",
  report_md: process.env.REPORT_MD_PATH,
  report_html: process.env.REPORT_HTML_PATH,
};
process.stdout.write(JSON.stringify(payload));
NODE
  set +e
  node "$RUNNER" --input-file "$CASE/input.json" > "$CASE/stdout" 2> "$CASE/stderr"
  RUN_EXIT=$?
  set -e
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" && \
    grep -Eiq 'backward|forward|transition|phase' "$CASE/stderr" && \
    state_reports_and_directories_unchanged
}

test_normal_decision_writes_deterministic_reports() {
  setup_case 9
  run_stdin "$(make_payload)"
  test "$RUN_EXIT" -eq 0 && json_stdout && \
    grep -Fq '1 persisted gate decision(s)' "$REPORT_MD" && \
    grep -Fq '暂停 \| keep' "$REPORT_MD" && \
    grep -Fq '暂停 | keep' "$REPORT_HTML" && \
    grep -Fq '&lt;tag&gt; &amp; &quot;quote&quot;' "$REPORT_HTML" && \
    test "$(grep -c 'schema_version:' "$STATE")" -eq 1
}

test_denylist_stays_blocked_on_retry() {
  setup_case 10
  run_stdin "$(make_payload denylist)"
  test "$RUN_EXIT" -eq 3 && test ! -s "$CASE/stdout" && \
    grep -Fq 'denylisted' "$CASE/stderr" && \
    grep -Fq 'status: "blocked"' "$STATE" && \
    grep -Fq 'current_phase: phase-1' "$STATE" || return 1

  snapshot_files
  run_stdin "$(make_payload denylist-changed)"
  test "$RUN_EXIT" -eq 3 && test ! -s "$CASE/stdout" && \
    grep -Fq 'denylisted' "$CASE/stderr" && \
    test "$(grep -c 'schema_version:' "$STATE")" -eq 1 && \
    state_and_reports_unchanged
}

test_changed_selection_is_rejected_without_mutation() {
  setup_case 11
  run_stdin "$(make_payload)"
  test "$RUN_EXIT" -eq 0 || return 1
  snapshot_files
  run_stdin "$(make_payload changed-selection)"
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" && \
    grep -Eiq 'selection|terminal|decision' "$CASE/stderr" && \
    state_and_reports_unchanged
}

test_terminal_retry_validates_transition_before_reports() {
  setup_case 16
  run_stdin "$(make_payload no-transition)"
  test "$RUN_EXIT" -eq 0 || return 1

  perl -0pi -e 's/status: pending/status: in_progress/' "$STATE"
  snapshot_files
  run_stdin_with_failure report "$(make_payload already-active-target)"
  test "$RUN_EXIT" -ne 0 && test ! -s "$CASE/stdout" && \
    grep -Eiq 'pending|active|transition|phase' "$CASE/stderr" && \
    ! grep -Fq 'injected report failure' "$CASE/stderr" && \
    state_and_reports_unchanged
}

test_no_transition_and_forward_transition_are_distinct() {
  setup_case 12
  run_stdin "$(make_payload no-transition)"
  test "$RUN_EXIT" -eq 0 && \
    grep -Fq 'current_phase: phase-1' "$STATE" && \
    grep -A1 -F 'id: phase-2' "$STATE" | grep -Fq 'status: pending' || return 1

  setup_case 13
  run_stdin "$(make_payload)"
  test "$RUN_EXIT" -eq 0 && \
    grep -Fq 'current_phase: phase-2' "$STATE" && \
    grep -A1 -F 'id: phase-1' "$STATE" | grep -Fq 'status: completed' && \
    grep -A1 -F 'id: phase-2' "$STATE" | grep -Fq 'status: in_progress'
}

test_report_failure_leaves_terminal_record_for_regeneration() {
  setup_case 14
  run_stdin_with_failure report "$(make_payload)"
  test "$RUN_EXIT" -eq 1 && test ! -s "$CASE/stdout" && \
    grep -Fq 'injected report failure' "$CASE/stderr" && \
    test "$(grep -c 'schema_version:' "$STATE")" -eq 1 && \
    grep -Fq 'existing markdown' "$REPORT_MD" && grep -Fq 'existing html' "$REPORT_HTML" || return 1

  run_stdin "$(make_payload)"
  test "$RUN_EXIT" -eq 0 && json_stdout && \
    grep -Fq '1 persisted gate decision(s)' "$REPORT_MD" && \
    grep -Fq 'Decision Summary' "$REPORT_HTML" && \
    test "$(grep -c 'schema_version:' "$STATE")" -eq 1
}

test_transition_failure_recovers_exactly_once() {
  setup_case 15
  run_stdin_with_failure transition "$(make_payload)"
  test "$RUN_EXIT" -eq 1 && test ! -s "$CASE/stdout" && \
    grep -Fq 'injected transition failure' "$CASE/stderr" && \
    test "$(grep -c 'schema_version:' "$STATE")" -eq 1 && \
    grep -Fq 'current_phase: phase-1' "$STATE" || return 1

  run_stdin "$(make_payload)"
  test "$RUN_EXIT" -eq 0 && json_stdout && \
    grep -Fq 'current_phase: phase-2' "$STATE" && \
    test "$(grep -c 'schema_version:' "$STATE")" -eq 1 || return 1

  snapshot_files
  run_stdin "$(make_payload)"
  test "$RUN_EXIT" -eq 0 && json_stdout && state_and_reports_unchanged
}

echo "=== phase-continue contract matrix: $RUNNER_LABEL ($RUNNER) ==="
assert "runner path is present for the named matrix entry" test_runner_path_is_explicit
assert "valid stdin payload succeeds with JSON-only stdout" test_valid_stdin
assert "valid --input-file payload succeeds" test_valid_input_file
assert "empty, malformed, primitive, array, and null input fail safely" test_invalid_json_values
assert "duplicate transport, positional, and legacy arguments fail" test_rejects_legacy_and_extra_arguments
assert "duplicate JSON keys are rejected before materialization" test_rejects_duplicate_json_keys
assert "payload allowlist, required fields, types, enums, and optionals are exact" test_exact_schema_validation
assert "identifiers, strings, paths, collisions, and membership are exact" test_exact_string_and_membership_validation
assert "validation errors use stderr and preserve all files" test_validation_channels_and_immutability
assert "canonical empty and populated state fixtures are accepted" test_accepts_canonical_state_fixtures
assert "malformed canonical YAML is rejected before any write" test_rejects_malformed_canonical_state
assert "missing canonical anchors are rejected explicitly before any write" test_rejects_missing_canonical_anchors
assert "unknown, self, current, and active phase transitions are rejected" test_rejects_invalid_phase_membership_and_transitions
assert "backward phase transitions are rejected before any write" test_rejects_backward_transition
assert "normal decisions write deterministic Markdown and HTML reports" test_normal_decision_writes_deterministic_reports
assert "denylisted decisions remain blocked across changed-selection retries" test_denylist_stays_blocked_on_retry
assert "changed terminal selections are rejected without mutation" test_changed_selection_is_rejected_without_mutation
assert "terminal retries validate transitions before report rendering" test_terminal_retry_validates_transition_before_reports
assert "no-transition decisions and forward transitions follow separate paths" test_no_transition_and_forward_transition_are_distinct
assert "report failure leaves a durable terminal record for regeneration" test_report_failure_leaves_terminal_record_for_regeneration
assert "transition failure recovers exactly once from durable terminal state" test_transition_failure_recovers_exactly_once

echo "Contract cases: $pass passed, $fail failed"
test "$fail" -eq 0
