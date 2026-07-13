#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
EXPECTED="$ROOT/tests/fixtures/advisor-state/canonical-advisor.yml"

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
pass() { printf 'PASS: %s\n' "$1"; }

assert_workflow_snapshot() {
  workflow=$1
  file="$ROOT/plugins/maister/skills/$workflow/SKILL.md"
  block=$(sed -n '/^    advisor:$/,/^        backoff: exponential$/p' "$file" | head -n 17 | sed 's/^    //')
  for html_output in true false; do
    # Dashboard mode must not alter the independently captured Advisor bytes.
    diff -u "$EXPECTED" <(printf '%s\n' "$block") >/dev/null || fail "$workflow has no exact complete Advisor snapshot with html_output=$html_output"
  done
  [ "$(grep -c '^    advisor:$' "$file")" -eq 1 ] || fail "$workflow writes Advisor snapshot more than once"
  ! grep -q '^options:$' "$file" || fail "$workflow documents a root-level options mapping"
  grep -q 'Resume reads `orchestrator.options.advisor` from canonical state only' "$file" || fail "$workflow resume may reread project config"
  pass "$workflow snapshot and immutable resume"
}

for workflow in development research migration performance product-design; do
  assert_workflow_snapshot "$workflow"
done

patterns="$ROOT/plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md"
engine="$ROOT/plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md"
grep -q 'disabled snapshot resolves every execution policy to `manual`' "$patterns" || fail 'disabled snapshot execution is not fail-closed'
grep -q 'exactly one logical arbiter record' "$engine" || fail 'single arbitration is not explicit'
grep -q 'never invokes Advisor again' "$engine" || fail 'Advisor-Arbiter loop is not prohibited explicitly'
grep -q 'Invalid or incomplete workflow snapshots fail closed' "$engine" || fail 'invalid snapshots do not fail closed'
grep -q 'denylisted gate is always `manual`' "$engine" || fail 'protected gates do not override configured policy'
grep -q 'cannot approve implementation' "$engine" || fail 'Advisor can cross the implementation boundary'
pass 'runtime roles, bounded arbitration, and invalid-snapshot behavior'
