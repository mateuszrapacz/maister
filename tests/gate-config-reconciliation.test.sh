#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SCRIPT="$ROOT/plugins/maister/skills/init/bin/reconcile-gate-config.sh"
FIXTURES="$ROOT/tests/fixtures/gate-config/yaml"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

passed=0

assert_reconciles() {
  name=$1 input=$2 enabled=$3 expected=$4
  target="$TMP/$name.yml"
  cp "$FIXTURES/$input" "$target"
  "$SCRIPT" reconcile "$target" "$enabled" >"$TMP/$name.out" 2>"$TMP/$name.err"
  cmp "$target" "$FIXTURES/$expected"
  passed=$((passed + 1))
}

assert_rejects_without_rewrite() {
  name=$1 expected_error=$2
  target="$TMP/$name.yml"
  cp "$TMP/$name.input.yml" "$target"
  cp "$target" "$target.before"
  if "$SCRIPT" reconcile "$target" on >"$target.out" 2>"$target.err"; then
    printf 'expected rejection: %s\n' "$name" >&2
    exit 1
  fi
  cmp "$target" "$target.before"
  grep -F "$expected_error" "$target.err" >/dev/null
  passed=$((passed + 1))
}

# 1. An absent gate node receives exact namespaced defaults and no model fields.
assert_reconciles absent absent.yml on absent-on.expected.yml

# 2. A complete gate node keeps explicit policy/retry semantics while enabled changes.
assert_reconciles complete complete.yml on complete-on.expected.yml

# 3. The exact disabled defaults are complete and stable on a no-op reconciliation.
assert_reconciles disabled disabled.yml off disabled.yml

# 4. Actor-specific model fields are legacy configuration and fail transactionally.
for field in advisor_model arbiter_model; do
  sed "/^  arbiter_enabled_on_disagreement:/i\\
  $field: null" "$FIXTURES/disabled.yml" >"$TMP/legacy-$field.input.yml"
  assert_rejects_without_rewrite "legacy-$field" "legacy gate field is not supported: $field"
done

# 5. Bare, noncanonical, aliased, and malformed logical IDs are never normalized.
for entry in \
  'advisor_agent|advisor' \
  'arbiter_agent|arbiter' \
  'advisor_agent|maister:code-reviewer' \
  'arbiter_agent|maister:Advisor' \
  'arbiter_agent|maister-advisor'; do
  field=${entry%%|*}
  value=${entry#*|}
  name="role-${field}-${value//[^A-Za-z0-9]/_}"
  sed "s/^  $field: maister:advisor$/  $field: $value/" "$FIXTURES/disabled.yml" >"$TMP/$name.input.yml"
  assert_rejects_without_rewrite "$name" "$field must equal exact logical role maister:advisor"
done

# 6. A present gate node must already be complete; missing fields are rejected.
for pattern in \
  '^    verify-matrix:' \
  '^  advisor_agent:' \
  '^  arbiter_agent:' \
  '^    arbiter_attempts:'; do
  name="incomplete-$passed"
  sed "/$pattern/d" "$FIXTURES/disabled.yml" >"$TMP/$name.input.yml"
  assert_rejects_without_rewrite "$name" 'gate configuration is incomplete; missing'
done

# 7. Unknown fields, unsafe YAML, invalid policies, retry bounds, and backoff fail closed.
cp "$FIXTURES/disabled.yml" "$TMP/unknown.input.yml"
sed -i.bak '/^  arbiter_enabled_on_disagreement:/i\
  legacy_mode: true' "$TMP/unknown.input.yml"
rm "$TMP/unknown.input.yml.bak"
assert_rejects_without_rewrite unknown 'unsupported gate field: legacy_mode'

for entry in \
  'policy|phase-exit|automatic' \
  'retry|advisor_attempts|0' \
  'retry|arbiter_attempts|11' \
  'retry|backoff|linear'; do
  kind=${entry%%|*}
  rest=${entry#*|}
  field=${rest%%|*}
  value=${rest#*|}
  name="invalid-$kind-$field"
  sed "s/^    $field: .*/    $field: $value/" "$FIXTURES/disabled.yml" >"$TMP/$name.input.yml"
  assert_rejects_without_rewrite "$name" "$field"
done

printf 'html_output: true\nadvisor: &gate\n  enabled: false\n' >"$TMP/unsafe-yaml.input.yml"
assert_rejects_without_rewrite unsafe-yaml 'YAML anchors, aliases, tags, directives, and flow collections are not supported'

# 8. Candidate/backup/commit/restore preserve exact bytes and mode; equal output is a no-op.
target="$TMP/transaction.yml"
candidate="$TMP/.transaction.candidate"
backup="$TMP/.transaction.backup"
cp "$FIXTURES/disabled.yml" "$target"
chmod 640 "$target"
before_inode=$(ls -i "$target" | awk '{print $1}')
"$SCRIPT" reconcile "$target" off
after_inode=$(ls -i "$target" | awk '{print $1}')
test "$before_inode" = "$after_inode"
"$SCRIPT" candidate "$target" on "$candidate"
"$SCRIPT" backup "$target" "$backup"
"$SCRIPT" commit "$target" "$candidate"
"$SCRIPT" restore "$target" "$backup"
cmp "$target" "$FIXTURES/disabled.yml"
test "$(stat -f '%Lp' "$target" 2>/dev/null || stat -c '%a' "$target")" = 640
passed=$((passed + 1))

# 9. The project-only gate reconciler and init skill contain no host agent-TOML lifecycle.
! grep -Eiq '(\.codex/agents|\.toml|permissions|readonly|sandbox|host profile|host-profile|migration|cleanup)' "$SCRIPT"
! grep -Eiq '(reconcile-advisor-config|\.codex/agents|advisor\.toml|arbiter\.toml|host TOML|Codex TOML)' "$ROOT/plugins/maister/skills/init/SKILL.md"
passed=$((passed + 1))

printf '%s gate config reconciliation tests passed\n' "$passed"
