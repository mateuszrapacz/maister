#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/plugins/maister/skills/init/bin/reconcile-advisor-config.sh"
TEMPLATE="$ROOT/platforms/codex-cli/templates/advisor.toml"
FIXTURES="$ROOT/tests/fixtures/advisor-config"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
passed=0

assert_fails() { if "$@" >/dev/null 2>&1; then echo "expected failure: $*" >&2; exit 1; fi; }
mode() { stat -f '%Lp' "$1" 2>/dev/null || stat -c '%a' "$1"; }
new_case() {
  if test -d "$TMP/case"; then
    test -z "$(find "$TMP/case" -name '.advisor-*' -print -quit)"
    rm -rf "$TMP/case"
  fi
  mkdir -p "$TMP/case/.maister"
  cp "$FIXTURES/yaml/absent.yml" "$TMP/case/.maister/config.yml"
}
with_agents() { mkdir -p "$TMP/case/.codex/agents"; }
assert_no_transaction_artifacts() {
  test -z "$(find "$TMP/case" -name '.advisor-*' -print -quit)"
}

# 1. Repeated identical flags collapse; mixed and invalid flags fail before mutation.
test "$(bash "$SCRIPT" resolve-flags absent no --advisor=on --advisor=on)" = on
new_case; before=$(cksum "$TMP/case/.maister/config.yml")
assert_fails bash "$SCRIPT" init "$TMP/case/.maister/config.yml" non-codex no - "$TEMPLATE" --advisor=on --advisor=off
test "$before" = "$(cksum "$TMP/case/.maister/config.yml")"
assert_fails bash "$SCRIPT" resolve-flags absent no --advisor=maybe
passed=$((passed + 1))

# Every non-critical exit cleans staging/backup/tombstone artifacts.
assert_no_transaction_artifacts

# 2. Explicit intent wins without consulting the host answer.
test "$(MAISTER_ADVISOR_ANSWER=off bash "$SCRIPT" resolve-flags off yes --advisor=on)" = on
test "$(MAISTER_ADVISOR_ANSWER=on bash "$SCRIPT" resolve-flags on yes --advisor=off)" = off
passed=$((passed + 1))

# 3. Interactive omission recommends current state; non-interactive omission is off.
test "$(MAISTER_ADVISOR_ANSWER=on bash "$SCRIPT" resolve-flags off yes)" = on
test "$(MAISTER_ADVISOR_ANSWER=off bash "$SCRIPT" resolve-flags on yes)" = off
test "$(bash "$SCRIPT" resolve-flags on no)" = off
passed=$((passed + 1))

# 4. Authoritative Codex on creates/reconciles canonical TOML; non-Codex never touches it.
new_case; with_agents; cp "$FIXTURES/toml/valid.toml" "$TMP/case/.codex/agents/advisor.toml"
bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on >/dev/null
cmp "$TMP/case/.codex/agents/advisor.toml" "$TEMPLATE"
first_mtime=$(stat -f '%m' "$TMP/case/.codex/agents/advisor.toml" 2>/dev/null || stat -c '%Y' "$TMP/case/.codex/agents/advisor.toml")
bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on >/dev/null
test "$first_mtime" = "$(stat -f '%m' "$TMP/case/.codex/agents/advisor.toml" 2>/dev/null || stat -c '%Y' "$TMP/case/.codex/agents/advisor.toml")"
new_case; with_agents; cp "$FIXTURES/toml/malformed.toml" "$TMP/case/.codex/agents/advisor.toml"; before=$(cksum "$TMP/case/.codex/agents/advisor.toml")
bash "$SCRIPT" init "$TMP/case/.maister/config.yml" non-codex no - "$TEMPLATE" --advisor=on >/dev/null
test "$before" = "$(cksum "$TMP/case/.codex/agents/advisor.toml")"
passed=$((passed + 1))

# 5. Codex off deletes atomically; malformed and typed-invalid managed TOML reject unchanged.
new_case; with_agents; cp "$TEMPLATE" "$TMP/case/.codex/agents/advisor.toml"
bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=off >/dev/null
test ! -e "$TMP/case/.codex/agents/advisor.toml"
new_case; with_agents; cp "$FIXTURES/toml/malformed.toml" "$TMP/case/.codex/agents/advisor.toml"; yaml_before=$(cksum "$TMP/case/.maister/config.yml"); toml_before=$(cksum "$TMP/case/.codex/agents/advisor.toml")
assert_fails bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on
test "$yaml_before" = "$(cksum "$TMP/case/.maister/config.yml")"; test "$toml_before" = "$(cksum "$TMP/case/.codex/agents/advisor.toml")"
passed=$((passed + 1))

# 6. A failed second action restores exact YAML/TOML bytes, modes, and existence.
new_case; with_agents; cp "$FIXTURES/toml/valid.toml" "$TMP/case/.codex/agents/advisor.toml"; chmod 640 "$TMP/case/.maister/config.yml"; chmod 600 "$TMP/case/.codex/agents/advisor.toml"
cp -p "$TMP/case/.maister/config.yml" "$TMP/yaml.before"; cp -p "$TMP/case/.codex/agents/advisor.toml" "$TMP/toml.before"
assert_fails env MAISTER_ADVISOR_FAIL=second-action bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on
cmp "$TMP/yaml.before" "$TMP/case/.maister/config.yml"; cmp "$TMP/toml.before" "$TMP/case/.codex/agents/advisor.toml"
test "$(mode "$TMP/yaml.before")" = "$(mode "$TMP/case/.maister/config.yml")"; test "$(mode "$TMP/toml.before")" = "$(mode "$TMP/case/.codex/agents/advisor.toml")"
passed=$((passed + 1))

# 7. TOML tables, arrays, duplicate keys, non-strings, and invalid enums reject atomically.
for payload in '[extra]' 'model = ["inherit"]' 'name = "advisor"' 'model = 3' 'sandbox_mode = "workspace-write"'; do
  new_case
  with_agents
  cp "$TEMPLATE" "$TMP/case/.codex/agents/advisor.toml"
  printf '\n%s\n' "$payload" >>"$TMP/case/.codex/agents/advisor.toml"
  yaml_before=$(cksum "$TMP/case/.maister/config.yml")
  toml_before=$(cksum "$TMP/case/.codex/agents/advisor.toml")
  assert_fails bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on
  test "$yaml_before" = "$(cksum "$TMP/case/.maister/config.yml")"
  test "$toml_before" = "$(cksum "$TMP/case/.codex/agents/advisor.toml")"
done
passed=$((passed + 1))

# 8. Candidate, staging, and first-replace failures happen before commit mutation.
for failure in candidate staging first-replace; do
  new_case
  with_agents
  cp "$FIXTURES/toml/valid.toml" "$TMP/case/.codex/agents/advisor.toml"
  yaml_before=$(cksum "$TMP/case/.maister/config.yml")
  toml_before=$(cksum "$TMP/case/.codex/agents/advisor.toml")
  assert_fails env MAISTER_ADVISOR_FAIL="$failure" bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on
  test "$yaml_before" = "$(cksum "$TMP/case/.maister/config.yml")"
  test "$toml_before" = "$(cksum "$TMP/case/.codex/agents/advisor.toml")"
done
passed=$((passed + 1))

# 9. Rollback failure is critical and names both exact recovery artifacts.
new_case
with_agents
cp "$FIXTURES/toml/valid.toml" "$TMP/case/.codex/agents/advisor.toml"
if env MAISTER_ADVISOR_FAIL=second-action MAISTER_ADVISOR_ROLLBACK_FAIL=yes \
  bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on \
  >"$TMP/rollback.out" 2>"$TMP/rollback.err"; then
  echo 'expected critical rollback failure' >&2
  exit 1
fi
grep -F 'CRITICAL: rollback failed' "$TMP/rollback.err" >/dev/null
grep -Eq 'recover YAML from .+ and TOML from .+' "$TMP/rollback.err"
test -n "$(find "$TMP/case" -name '.advisor-yaml-backup.*' -print -quit)"
test -n "$(find "$TMP/case" -name '.advisor-toml-backup.*' -print -quit)"
find "$TMP/case" -name '.advisor-*' -exec rm -f {} +
passed=$((passed + 1))

# 10. Codex staging/failure/off no-op does not create or leave project directories.
new_case
assert_fails env MAISTER_ADVISOR_FAIL=staging bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on
test ! -e "$TMP/case/.codex"
new_case
bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=off >/dev/null
test ! -e "$TMP/case/.codex"
assert_no_transaction_artifacts
passed=$((passed + 1))

# 11. Real second-action failures are captured, rollback is attempted, and
# diagnostics retain exact recovery paths even when rollback itself fails.
new_case; with_agents; cp "$FIXTURES/toml/valid.toml" "$TMP/case/.codex/agents/advisor.toml"
cp -p "$TMP/case/.maister/config.yml" "$TMP/yaml.real.before"
cp -p "$TMP/case/.codex/agents/advisor.toml" "$TMP/toml.real.before"
assert_fails env MAISTER_ADVISOR_FAIL=toml-action bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on
cmp "$TMP/yaml.real.before" "$TMP/case/.maister/config.yml"
cmp "$TMP/toml.real.before" "$TMP/case/.codex/agents/advisor.toml"
assert_fails env MAISTER_ADVISOR_FAIL=toml-cleanup bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=off
cmp "$TMP/yaml.real.before" "$TMP/case/.maister/config.yml"
cmp "$TMP/toml.real.before" "$TMP/case/.codex/agents/advisor.toml"
if env MAISTER_ADVISOR_FAIL=toml-action MAISTER_ADVISOR_ROLLBACK_FAIL=yes \
  bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on \
  >"$TMP/real-rollback.out" 2>"$TMP/real-rollback.err"; then
  echo 'expected real action plus rollback failure' >&2; exit 1
fi
grep -F 'CRITICAL: rollback failed' "$TMP/real-rollback.err" >/dev/null
grep -F "$TMP/case/.maister/" "$TMP/real-rollback.err" >/dev/null
test -n "$(find "$TMP/case" -name '.advisor-yaml-backup.*' -print -quit)"
test -n "$(find "$TMP/case" -name '.advisor-toml-backup.*' -print -quit)"
find "$TMP/case" -name '.advisor-*' -exec rm -f {} +
passed=$((passed + 1))

# 13. A real executable boundary failure (not a synthetic status assignment)
# is captured and rolls both files back without leaking transaction artifacts.
new_case; with_agents; cp "$FIXTURES/toml/valid.toml" "$TMP/case/.codex/agents/advisor.toml"
cp -p "$TMP/case/.maister/config.yml" "$TMP/yaml.wrapper.before"
cp -p "$TMP/case/.codex/agents/advisor.toml" "$TMP/toml.wrapper.before"
wrapper="$TMP/failing-mv"
printf '#!/usr/bin/env bash\nexit 73\n' >"$wrapper"
chmod +x "$wrapper"
assert_fails env MAISTER_ADVISOR_MV_COMMAND="$wrapper" bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on
cmp "$TMP/yaml.wrapper.before" "$TMP/case/.maister/config.yml"
cmp "$TMP/toml.wrapper.before" "$TMP/case/.codex/agents/advisor.toml"
assert_no_transaction_artifacts
passed=$((passed + 1))

# 12. Success reports the complete effective configuration and actual TOML action.
new_case
bash "$SCRIPT" init "$TMP/case/.maister/config.yml" codex no - "$TEMPLATE" --advisor=on >"$TMP/summary.out"
for expected in \
  'Advisor enabled: on' \
  'policies: phase-exit=advisor, optional-phase=advisor, clarify=advisor, convergence=advisor, verify-matrix=advisor' \
  'roles: advisor=advisor (model=inherit), arbiter=advisor (model=inherit)' \
  'arbiter: disagreement=true, advisor_attempts=3, arbiter_attempts=3, backoff=exponential' \
  'Codex TOML action: created' \
  'capability posture: host=codex, automatic-continuation=capability-matrix-controlled'; do
  grep -F "$expected" "$TMP/summary.out" >/dev/null
done
passed=$((passed + 1))

echo "$passed advisor init lifecycle tests passed"
