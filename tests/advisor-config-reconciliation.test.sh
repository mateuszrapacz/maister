#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SCRIPT="$ROOT/plugins/maister/skills/init/bin/reconcile-advisor-config.sh"
FIXTURES="$ROOT/tests/fixtures/advisor-config/yaml"
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

# 1. An absent node is inserted canonically while all existing bytes stay intact.
assert_reconciles absent absent.yml on absent-on.expected.yml

# 2. A partial enabled node retains explicit policy values and fills current fields.
assert_reconciles partial partial.yml on partial-on.expected.yml

# 3. Disabled configuration keeps a complete current policy map.
assert_reconciles disabled disabled.yml off disabled.expected.yml

# 4. Unsupported simple managed fields are removed and reported after validation.
target="$TMP/cleanup.yml"
cp "$FIXTURES/cleanup.yml" "$target"
"$SCRIPT" reconcile "$target" on >"$TMP/cleanup.out" 2>"$TMP/cleanup.err"
cmp "$target" "$FIXTURES/cleanup.expected.yml"
grep -F 'removed unsupported advisor field: legacy_mode' "$TMP/cleanup.err" >/dev/null
grep -F 'removed unsupported gate policy: obsolete-gate' "$TMP/cleanup.err" >/dev/null
passed=$((passed + 1))

# 11. Alternate top-level key spellings and unsafe YAML document forms cannot
# hide a second Advisor mapping from the narrow parser.
for payload in \
  'advisor :' 'advisor  :' \
  '"advisor":' '"advisor" :' '"advisor"  :' \
  "'advisor':" "'advisor' :" \
  '? advisor' '?  advisor  ' '? "advisor"' "? 'advisor'" \
  '!!str advisor:' '!!str advisor :' '!<tag:yaml.org,2002:str> advisor:' \
  '&advisor-key advisor:' '*advisor-key:' '{advisor: {}}' \
  '---' '...' '%YAML 1.2'; do
  target="$TMP/unsafe-top-level-${passed}.yml"
  printf 'html_output: true\n%s\n' "$payload" >"$target"
  cp "$target" "$target.before"
  if "$SCRIPT" reconcile "$target" on >/dev/null 2>"$target.err"; then
    echo "expected unsafe top-level YAML rejection: $payload" >&2
    exit 1
  fi
  cmp "$target" "$target.before"
done
passed=$((passed + 1))

# Explicit-key continuations and advisor-looking comments/scalar values are
# distinguished: semantic keys reject, ordinary content remains untouched.
for key in '? advisor' '? "advisor"' "? 'advisor'"; do
  target="$TMP/explicit-key.yml"
  printf 'html_output: true\n%s\n:\n' "$key" >"$target"
  cp "$target" "$target.before"
  if "$SCRIPT" reconcile "$target" on >/dev/null 2>"$target.err"; then
    echo "expected explicit Advisor key rejection: $key" >&2; exit 1
  fi
  cmp "$target" "$target.before"
done
target="$TMP/advisor-looking-content.yml"
printf '# "advisor" : is documentation\nnote: advisor : remains a scalar value\n' >"$target"
"$SCRIPT" reconcile "$target" on >/dev/null
grep -F '# "advisor" : is documentation' "$target" >/dev/null
grep -F 'note: advisor : remains a scalar value' "$target" >/dev/null
test "$(grep -c '^advisor:$' "$target")" -eq 1
passed=$((passed + 1))

# 12. Model identifiers use one portable YAML/TOML grammar. Quoting, escapes,
# whitespace, Unicode, comments, and empty strings are rejected without mutation.
for value in '"gpt-5"' 'model\ name' 'módèle' 'gpt#5' "'gpt-5'" '"gpt\\u002d5"' '""'; do
  target="$TMP/model-${passed}.yml"
  cp "$FIXTURES/partial-on.expected.yml" "$target"
  awk -v value="$value" '/^  advisor_model:/ { print "  advisor_model: " value; next } { print }' "$target" >"$target.edited"
  mv "$target.edited" "$target"
  cp "$target" "$target.before"
  if "$SCRIPT" reconcile "$target" on >/dev/null 2>"$target.err"; then
    echo "expected non-portable model rejection: $value" >&2
    exit 1
  fi
  cmp "$target" "$target.before"
done
target="$TMP/portable-model.yml"
cp "$FIXTURES/partial-on.expected.yml" "$target"
awk '/^  advisor_model:/ { print "  advisor_model: openai/gpt-5.2_codex"; next } { print }' "$target" >"$target.edited"
mv "$target.edited" "$target"
"$SCRIPT" reconcile "$target" on >/dev/null
grep -F 'advisor_model: openai/gpt-5.2_codex' "$target" >/dev/null
passed=$((passed + 1))

# 5. Ambiguous or structurally unsafe YAML is rejected without mutation.
for fixture in duplicate.yml anchor.yml implicit.yml deprecated.yml non-mapping.yml; do
  target="$TMP/$fixture"
  cp "$FIXTURES/$fixture" "$target"
  cp "$target" "$target.before"
  if "$SCRIPT" reconcile "$target" on >"$target.out" 2>"$target.err"; then
    echo "expected rejection: $fixture" >&2
    exit 1
  fi
  cmp "$target" "$target.before"
done
passed=$((passed + 1))

# 6. Equal candidates are no-ops; backup/commit/restore preserve bytes and mode.
target="$TMP/transaction.yml"
candidate="$TMP/.transaction.candidate"
backup="$TMP/.transaction.backup"
cp "$FIXTURES/partial-on.expected.yml" "$target"
chmod 640 "$target"
before_inode=$(ls -i "$target" | awk '{print $1}')
"$SCRIPT" reconcile "$target" on >"$TMP/noop.out" 2>"$TMP/noop.err"
after_inode=$(ls -i "$target" | awk '{print $1}')
test "$before_inode" = "$after_inode"
"$SCRIPT" candidate "$target" off "$candidate" "$TMP/removals"
"$SCRIPT" backup "$target" "$backup"
"$SCRIPT" commit "$target" "$candidate"
"$SCRIPT" restore "$target" "$backup"
cmp "$target" "$FIXTURES/partial-on.expected.yml"
test "$(stat -f '%Lp' "$target" 2>/dev/null || stat -c '%a' "$target")" = 640
passed=$((passed + 1))

# 7. Retry attempts accept only unquoted integers in the inclusive 1..10 domain.
for value in 0 11 1.0 '"3"'; do
  target="$TMP/retry-${value//[^A-Za-z0-9]/_}.yml"
  cp "$FIXTURES/partial-on.expected.yml" "$target"
  sed "s/advisor_attempts: 3/advisor_attempts: $value/" "$target" >"$target.edited"
  mv "$target.edited" "$target"
  cp "$target" "$target.before"
  if "$SCRIPT" reconcile "$target" on >"$target.out" 2>"$target.err"; then
    echo "expected retry boundary rejection: $value" >&2
    exit 1
  fi
  cmp "$target" "$target.before"
  grep -F 'advisor_attempts must be an integer from 1 through 10' "$target.err" >/dev/null
done
passed=$((passed + 1))

# 8. Empty models, alternate agents, and alternate backoff values are rejected.
for replacement in 'advisor_model: ""' 'advisor_agent: reviewer' 'backoff: linear'; do
  target="$TMP/domain-${replacement%%:*}.yml"
  cp "$FIXTURES/partial-on.expected.yml" "$target"
  case "$replacement" in
    advisor_model*) awk -v replacement="$replacement" '/^  advisor_model:/ { print "  " replacement; next } { print }' "$target" >"$target.edited" ;;
    advisor_agent*) sed "s/advisor_agent: advisor/$replacement/" "$target" >"$target.edited" ;;
    backoff*) sed "s/backoff: exponential/$replacement/" "$target" >"$target.edited" ;;
  esac
  mv "$target.edited" "$target"
  cp "$target" "$target.before"
  if "$SCRIPT" reconcile "$target" on >/dev/null 2>"$target.err"; then
    echo "expected strict domain rejection: $replacement" >&2
    exit 1
  fi
  cmp "$target" "$target.before"
done
passed=$((passed + 1))

# 9. Tags, merge keys, and flow collections are rejected without mutation.
for payload in '  advisor_model: !secret model' '  <<: *defaults' '  gate_policies: [manual]'; do
  target="$TMP/yaml-feature-$passed.yml"
  cp "$FIXTURES/partial.yml" "$target"
  sed "/^advisor:/a\\
$payload" "$target" >"$target.edited"
  mv "$target.edited" "$target"
  cp "$target" "$target.before"
  if "$SCRIPT" reconcile "$target" on >/dev/null 2>"$target.err"; then
    echo "expected YAML feature rejection: $payload" >&2
    exit 1
  fi
  cmp "$target" "$target.before"
done
passed=$((passed + 1))

# 10. A preceding top-level comment is preserved; managed comments are removed.
target="$TMP/comments.yml"
sed 's/^advisor:$/advisor: # managed comment\n  # managed nested comment/' \
  "$FIXTURES/partial-on.expected.yml" >"$target"
"$SCRIPT" reconcile "$target" on >/dev/null
grep -Fq '# This comment belongs to the top level.' "$target"
! grep -Fq 'managed comment' "$target"
passed=$((passed + 1))

echo "$passed advisor config reconciliation tests passed"
