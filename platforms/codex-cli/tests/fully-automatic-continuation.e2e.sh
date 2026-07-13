#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BOOTSTRAP="$ROOT/platforms/codex-cli/tests/native-evidence-bootstrap.mjs"
FIXTURE="$ROOT/tests/fixtures/phase-continue/valid-v2-empty.yml"

if test "${CODEX_NATIVE_EVIDENCE_FORCE_UNAVAILABLE:-0}" = 1; then
  echo "UNAVAILABLE: native Codex runtime was disabled for this test" >&2
  exit 77
fi

if ! command -v codex >/dev/null 2>&1 || ! codex login status >/dev/null 2>&1; then
  echo "UNAVAILABLE: authenticated native Codex runtime is required" >&2
  exit 77
fi

test -f "$BOOTSTRAP"

WORK="$(mktemp -d "$ROOT/.tmp-codex-native-evidence.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

run_native_scenario() {
  local scenario="$1"
  local state="$WORK/$scenario.yml"
  local trace="$WORK/$scenario-trace.json"
  local marker="$WORK/$scenario-target.marker"
  local events="$WORK/$scenario-events.jsonl"
  local last_message="$WORK/$scenario-last-message.txt"
  local stderr_log="$WORK/$scenario-stderr.log"
  local expected_message="NATIVE_${scenario//-/_}_COMPLETE"
  local prompt status bootstrap_line marker_line final_line

  cp "$FIXTURE" "$state"
  prompt=$(cat <<EOF
This is a repository-owned native Codex continuation evidence test.

Perform these steps in this one active turn:
1. Use the shell to run exactly: node "$BOOTSTRAP" --scenario "$scenario" --state "$state" --trace "$trace"
2. Read the command's JSON output. If and only if its directive is "continue", immediately use the shell to run exactly: touch "$marker"
3. Do not ask the user a question and do not produce a final response before the marker command has completed.
4. After the marker exists, respond with exactly: $expected_message
EOF
)

  set +e
  codex --ask-for-approval never exec \
    --json \
    --ephemeral \
    --ignore-user-config \
    --ignore-rules \
    --skip-git-repo-check \
    --sandbox workspace-write \
    --cd "$WORK" \
    --output-last-message "$last_message" \
    "$prompt" >"$events" 2>"$stderr_log"
  status=$?
  set -e
  if test "$status" -ne 0; then
    cat "$stderr_log" >&2
    return "$status"
  fi

  test -f "$marker"
  test "$(cat "$last_message")" = "$expected_message"
  jq -e --arg scenario "$scenario" '
    .scenario == $scenario and
    .directive == "continue" and
    .declared_status == "supported" and
    .eligibility_source == "declaration" and
    .user_gates == 0 and
    .logical_target_starts == 1 and
    .gate_history_count == 1 and
    .dispatch_count == 1 and
    .dispatch_status == "acknowledged" and
    (.checkpoint | startswith("started:"))
  ' "$trace" >/dev/null

  bootstrap_line="$(grep -n -F "$BOOTSTRAP" "$events" | head -n 1 | cut -d: -f1)"
  marker_line="$(grep -n -F "$marker" "$events" | tail -n 1 | cut -d: -f1)"
  final_line="$(grep -n -F "$expected_message" "$events" | tail -n 1 | cut -d: -f1)"
  test -n "$bootstrap_line"
  test -n "$marker_line"
  test -n "$final_line"
  test "$bootstrap_line" -lt "$marker_line"
  test "$marker_line" -lt "$final_line"
  head -n "$((marker_line - 1))" "$events" |
    jq -s -e '[.[] | select(.type == "item.completed" and .item.type == "agent_message") | .item.text] | all(test("\\?") | not)' >/dev/null
}

test_agreement_same_phase_resume() {
  run_native_scenario agreement-same-phase
  jq -e '
    .advisor_calls == 1 and
    .arbiter_calls == 0 and
    .receiver_invocations == 2 and
    .logical_target_starts == 1 and
    .target_kind == "same_phase_work_item" and
    .target_status == "in_progress" and
    .dispatch_attempts == 1
  ' "$WORK/agreement-same-phase-trace.json" >/dev/null
}

test_disagreement_next_phase() {
  run_native_scenario disagreement-next-phase
  jq -e '
    .advisor_calls == 1 and
    .arbiter_calls == 1 and
    .logical_arbiter_id_count == 1 and
    .logical_target_starts == 1 and
    .target_kind == "phase_entry" and
    .current_phase == "phase-2" and
    .source_phase_status == "completed" and
    .target_phase_status == "in_progress"
  ' "$WORK/disagreement-next-phase-trace.json" >/dev/null
}

test_bootstrap_isolation_and_fail_closed_behavior() {
  local state="$WORK/denylisted.yml"
  local trace="$WORK/denylisted-trace.json"
  cp "$FIXTURE" "$state"
  node "$BOOTSTRAP" --scenario denylisted --state "$state" --trace "$trace" >/dev/null
  jq -e '.directive == "blocked" and .advisor_calls == 0 and .arbiter_calls == 0 and .user_gates == 0 and .dispatch_count == 0 and .logical_target_starts == 0' "$trace" >/dev/null
  ! find "$ROOT/plugins/maister-codex" "$ROOT/plugins/maister-cursor" "$ROOT/plugins/maister-kiro" \
    -name 'native-evidence-bootstrap.mjs' -print -quit | grep -q .
  ! grep -Rq 'CODEX_NATIVE_EVIDENCE_FORCE_UNAVAILABLE\|native-evidence-bootstrap' \
    "$ROOT/platforms/codex-cli/bin" "$ROOT/platforms/codex-cli/build.sh" \
    "$ROOT/plugins/maister-codex" "$ROOT/plugins/maister-cursor" "$ROOT/plugins/maister-kiro" \
    --include='*.mjs' --include='*.sh' --include='*.md'
  if CODEX_NATIVE_EVIDENCE_FORCE_UNAVAILABLE=1 bash "$0" >"$WORK/unavailable.out" 2>"$WORK/unavailable.err"; then
    return 1
  else
    test "$?" -eq 77
  fi
  grep -Fq 'UNAVAILABLE:' "$WORK/unavailable.err"
}

test_agreement_same_phase_resume
echo "PASS: native agreement resumes one same-phase target without duplicate logical effects or UI"
test_disagreement_next_phase
echo "PASS: native disagreement uses one Arbiter and starts one acknowledged next phase without UI"
test_bootstrap_isolation_and_fail_closed_behavior
echo "PASS: evidence bootstrap is isolated, denylisted gates fail closed, and unavailable exits 77"
echo "Results: 3 passed, 0 failed"
