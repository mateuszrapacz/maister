#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPOSITORY="$ROOT/plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs"
FIXTURES="$ROOT/tests/fixtures/orchestrator-state-v2"
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

commit_valid_v2() {
  local state="$WORK/valid/orchestrator-state.yml"
  mkdir -p "$(dirname "$state")"
  cp "$FIXTURES/valid-v2.yml" "$state"
  chmod 640 "$state"
  local owner_before
  owner_before="$(stat -f '%u:%g' "$state" 2>/dev/null || stat -c '%u:%g' "$state")"
  STATE="$state" REPOSITORY="$REPOSITORY" node --input-type=module <<'NODE'
const { commitState, readState } = await import(process.env.REPOSITORY);
await commitState(process.env.STATE, 0, (draft) => {
  draft.task.status = "completed";
});
const result = readState(process.env.STATE);
if (result.orchestrator.revision !== 1 || result.task.status !== "completed") process.exit(1);
NODE
  local result=$?
  test "$result" -eq 0 || return 1
  test "$(stat -f '%Lp' "$state" 2>/dev/null || stat -c '%a' "$state")" = 640 && test "$(stat -f '%u:%g' "$state" 2>/dev/null || stat -c '%u:%g' "$state")" = "$owner_before"
}

reject_stale_revision_without_mutation() {
  local state="$WORK/stale/orchestrator-state.yml"
  mkdir -p "$(dirname "$state")"
  cp "$FIXTURES/valid-v2.yml" "$state"
  cp -p "$state" "$state.before"
  set +e
  STATE="$state" REPOSITORY="$REPOSITORY" node --input-type=module 2>"$WORK/stale.err" <<'NODE'
const { commitState } = await import(process.env.REPOSITORY);
await commitState(process.env.STATE, 4, () => {});
NODE
  local result=$?
  set -e
  test "$result" -ne 0 && cmp -s "$state" "$state.before" && test ! -e "$state.lock"
}

reject_lock_metadata_and_symlink_failures_without_mutation() {
  local state="$WORK/safety/orchestrator-state.yml"
  mkdir -p "$(dirname "$state")"
  cp "$FIXTURES/valid-v2.yml" "$state"
  chmod 640 "$state"
  local metadata_before
  metadata_before="$(stat -f '%u:%g:%Lp' "$state" 2>/dev/null || stat -c '%u:%g:%a' "$state")"
  cp -p "$state" "$state.before"
  find "$(dirname "$state")" -mindepth 1 -maxdepth 1 -print | sort > "$WORK/topology.before"

  mkdir "$state.lock"
  printf '%s\n' '{"token":"foreign","pid":1,"hostname":"other-host","acquired_at":"2026-07-13T00:00:00Z","lease_expires_at":"2026-07-13T00:00:01Z"}' > "$state.lock/owner.json"
  set +e
  STATE="$state" REPOSITORY="$REPOSITORY" node --input-type=module 2>"$WORK/lock.err" <<'NODE'
const { commitState } = await import(process.env.REPOSITORY);
await commitState(process.env.STATE, 0, () => {}, { waitMs: 20 });
NODE
  local locked=$?
  set -e
  test "$locked" -ne 0 && cmp -s "$state" "$state.before" && test -f "$state.lock/owner.json" || return 1
  rm -r "$state.lock"
  find "$(dirname "$state")" -mindepth 1 -maxdepth 1 -print | sort > "$WORK/safety-unlocked.before"

  ln -s "$state" "$WORK/state-link.yml"
  set +e
  STATE="$WORK/state-link.yml" REPOSITORY="$REPOSITORY" node --input-type=module 2>"$WORK/symlink.err" <<'NODE'
const { commitState } = await import(process.env.REPOSITORY);
await commitState(process.env.STATE, 0, () => {});
NODE
  local linked=$?
  set -e
  test "$linked" -ne 0 && cmp -s "$state" "$state.before" || return 1

  set +e
  STATE="$state" REPOSITORY="$REPOSITORY" ORCHESTRATOR_STATE_TEST_FAILURE=before_rename node --input-type=module 2>"$WORK/injected.err" <<'NODE'
const { commitState } = await import(process.env.REPOSITORY);
await commitState(process.env.STATE, 0, (draft) => { draft.task.status = "completed"; });
NODE
  local injected=$?
  set -e
  test "$injected" -ne 0 && cmp -s "$state" "$state.before" || return 1
  test "$(stat -f '%u:%g:%Lp' "$state" 2>/dev/null || stat -c '%u:%g:%a' "$state")" = "$metadata_before" || return 1
  test ! -e "$state.lock" || return 1
  find "$(dirname "$state")" -mindepth 1 -maxdepth 1 -print | sort > "$WORK/safety-unlocked.after"
  cmp -s "$WORK/safety-unlocked.before" "$WORK/safety-unlocked.after" && test -z "$(find "$(dirname "$state")" -mindepth 1 -maxdepth 1 -name '.orchestrator-state-*' -print -quit)"
}

assert "valid v2 commit increments once and preserves mode" commit_valid_v2
assert "stale revision cannot mutate state" reject_stale_revision_without_mutation
assert "lock, metadata, symlink, and injected failures are transactional" reject_lock_metadata_and_symlink_failures_without_mutation

echo "$pass passed, $fail failed"
test "$fail" -eq 0
