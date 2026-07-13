#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MATRIX="$ROOT/plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml"

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

matrix_has_canonical_rows() {
  test -f "$MATRIX" || return 1
  test "$(grep -c '^  - host:' "$MATRIX")" -eq 4 || return 1
  for host in claude cursor kiro codex; do
    test "$(grep -c "^  - host: $host$" "$MATRIX")" -eq 1 || return 1
  done
  grep -Fq 'target: tests/host-continuation/claude.e2e.sh' "$MATRIX" &&
    grep -Fq 'target: platforms/cursor/tests/fully-automatic-continuation.e2e.sh' "$MATRIX" &&
    grep -Fq 'target: platforms/kiro-cli/tests/fully-automatic-continuation.e2e.sh' "$MATRIX" &&
    grep -Fq 'target: platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh' "$MATRIX"
}

projection_reports_each_host_outcome() {
  local output host
  output=$(make -s -C "$ROOT" print-host-capabilities)
  for host in claude cursor kiro codex; do
    test "$(grep -c "^HOST_CAPABILITY host=$host declared=unsupported projected=unsupported evidence=unavailable " <<<"$output")" -eq 1 || return 1
  done
  test "$(grep -c '^HOST_CAPABILITY ' <<<"$output")" -eq 4
}

matrix_executes_native_targets() {
  make -s -C "$ROOT" validate-host-capabilities >"${TMPDIR:-/tmp}/maister-host-matrix.out" 2>&1
}

matrix_fails_closed_for_bad_outcomes() {
  local outcome output host
  for outcome in missing skipped unavailable inconclusive failed; do
    output=$(HOST_CAPABILITY_TEST_OUTCOME="$outcome" make -s -C "$ROOT" print-host-capabilities) || return 1
    for host in claude cursor kiro codex; do
      grep -q "^HOST_CAPABILITY host=$host declared=unsupported projected=unsupported evidence=$outcome " <<<"$output" || return 1
    done
  done
}

shared_runner_does_not_qualify() {
  HOST_CAPABILITY_MATRIX_TARGET=tests/phase-continue-contract.test.sh \
    make -s -C "$ROOT" validate-host-capabilities >/dev/null 2>&1 && return 1
  return 0
}

native_result_proves_safety_contract() {
  local output
  output=$(make -s -C "$ROOT" print-host-capabilities)
  grep -Fq 'denylist: manual' <<<"$output" &&
    grep -Fq 'terminal_history: exactly_once' <<<"$output" &&
    grep -Fq 'phase_transition: required' <<<"$output"
}

assert "matrix has exactly four canonical host rows and targets" matrix_has_canonical_rows
assert "projection reports one machine-readable outcome for every host" projection_reports_each_host_outcome
assert "matrix executes every host-native evidence target" matrix_executes_native_targets
assert "missing, skipped, unavailable, inconclusive, and failed evidence fail closed" matrix_fails_closed_for_bad_outcomes
assert "shared runner evidence cannot qualify a host" shared_runner_does_not_qualify
assert "capability projection preserves denylist and continuation invariants" native_result_proves_safety_contract

echo "$pass passed, $fail failed"
test "$fail" -eq 0
