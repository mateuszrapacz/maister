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
checklist="$ROOT/plugins/maister/skills/orchestrator-framework/references/orchestrator-creation-checklist.md"
schema="$ROOT/plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs"
engine="$ROOT/plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md"
grep -q 'disabled snapshot resolves every execution policy to `manual`' "$patterns" || fail 'disabled snapshot execution is not fail-closed'
grep -q 'exactly one logical arbiter record' "$engine" || fail 'single arbitration is not explicit'
grep -q 'never invokes Advisor again' "$engine" || fail 'Advisor-Arbiter loop is not prohibited explicitly'
grep -q 'Invalid or incomplete workflow snapshots fail closed' "$engine" || fail 'invalid snapshots do not fail closed'
grep -q 'denylisted gate is always `manual`' "$engine" || fail 'protected gates do not override configured policy'
grep -q 'cannot approve implementation' "$engine" || fail 'Advisor can cross the implementation boundary'
pass 'runtime roles, bounded arbitration, and invalid-snapshot behavior'

exact_resolver='resolveAgent({ logical_role_id: "maister:<role_id>", target, dispatch_id, manifest, projection, paths, hooks })'
exact_dispatch='dispatchAgent({ plan, task: { actor, work_item, output, bounded_task }, adapters })'
grep -Fq "$exact_resolver" "$patterns" || fail 'shared exact resolver contract is missing'
grep -Fq "$exact_dispatch" "$patterns" || fail 'shared bounded dispatch contract is missing'
grep -Fq 'exact resolver and bounded dispatch contract' "$checklist" || fail 'orchestrator checklist does not require the common runtime contract'
! grep -Eq '"agent"|"model"|source\.agent|source\.model' "$schema" || fail 'state schema retains actor-specific agent/model fields'
pass 'common resolver, bounded dispatch, and state identity contract'

assert_exact_role_call() {
  relative=$1 role=$2
  file="$ROOT/$relative"
  grep -Fq "logical_role_id: \"maister:$role\"" "$file" || fail "$relative does not request exact role maister:$role"
}

while IFS='|' read -r relative role; do
  [ -n "$relative" ] || continue
  assert_exact_role_call "$relative" "$role"
done <<'EOF'
plugins/maister/skills/init/SKILL.md|project-analyzer
plugins/maister/skills/init/SKILL.md|docs-operator
plugins/maister/skills/codebase-analyzer/SKILL.md|project-analyzer
plugins/maister/skills/codebase-analyzer/SKILL.md|codebase-analysis-reporter
plugins/maister/skills/development/SKILL.md|gap-analyzer
plugins/maister/skills/development/SKILL.md|ui-mockup-generator
plugins/maister/skills/development/SKILL.md|specification-creator
plugins/maister/skills/development/SKILL.md|spec-auditor
plugins/maister/skills/development/SKILL.md|implementation-planner
plugins/maister/skills/development/SKILL.md|e2e-test-verifier
plugins/maister/skills/development/SKILL.md|user-docs-generator
plugins/maister/skills/implementation-plan-executor/SKILL.md|task-group-implementer
plugins/maister/skills/implementation-verifier/SKILL.md|test-suite-runner
plugins/maister/skills/implementation-verifier/SKILL.md|implementation-completeness-checker
plugins/maister/skills/implementation-verifier/SKILL.md|code-reviewer
plugins/maister/skills/implementation-verifier/SKILL.md|code-quality-pragmatist
plugins/maister/skills/implementation-verifier/SKILL.md|production-readiness-checker
plugins/maister/skills/implementation-verifier/SKILL.md|reality-assessor
plugins/maister/skills/migration/SKILL.md|gap-analyzer
plugins/maister/skills/migration/SKILL.md|specification-creator
plugins/maister/skills/migration/SKILL.md|implementation-planner
plugins/maister/skills/migration/SKILL.md|user-docs-generator
plugins/maister/skills/performance/SKILL.md|bottleneck-analyzer
plugins/maister/skills/performance/SKILL.md|specification-creator
plugins/maister/skills/performance/SKILL.md|spec-auditor
plugins/maister/skills/performance/SKILL.md|implementation-planner
plugins/maister/skills/product-design/SKILL.md|html-companion-writer
plugins/maister/skills/product-design/SKILL.md|information-gatherer
plugins/maister/skills/product-design/SKILL.md|solution-brainstormer
plugins/maister/skills/product-design/SKILL.md|ui-mockup-generator
plugins/maister/skills/research/SKILL.md|research-planner
plugins/maister/skills/research/SKILL.md|information-gatherer
plugins/maister/skills/research/SKILL.md|research-synthesizer
plugins/maister/skills/research/SKILL.md|solution-brainstormer
plugins/maister/skills/research/SKILL.md|solution-designer
plugins/maister/skills/standards-discover/SKILL.md|information-gatherer
plugins/maister/skills/standards-discover/SKILL.md|docs-operator
plugins/maister/skills/standards-update/SKILL.md|docs-operator
plugins/maister/skills/thermos/SKILL.md|thermo-nuclear-review-subagent
plugins/maister/skills/thermos/SKILL.md|thermo-nuclear-code-quality-review-subagent
plugins/maister/commands/reviews-code.md|code-reviewer
plugins/maister/commands/reviews-pragmatic.md|code-quality-pragmatist
plugins/maister/commands/reviews-production-readiness.md|production-readiness-checker
plugins/maister/commands/reviews-reality-check.md|reality-assessor
plugins/maister/commands/reviews-spec-audit.md|spec-auditor
plugins/maister/commands/work.md|task-classifier
EOF

in_scope_files=(
  plugins/maister/skills/init/SKILL.md
  plugins/maister/skills/codebase-analyzer/SKILL.md
  plugins/maister/skills/development/SKILL.md
  plugins/maister/skills/implementation-plan-executor/SKILL.md
  plugins/maister/skills/implementation-verifier/SKILL.md
  plugins/maister/skills/migration/SKILL.md
  plugins/maister/skills/performance/SKILL.md
  plugins/maister/skills/product-design/SKILL.md
  plugins/maister/skills/research/SKILL.md
  plugins/maister/skills/standards-discover/SKILL.md
  plugins/maister/skills/standards-update/SKILL.md
  plugins/maister/skills/thermos/SKILL.md
  plugins/maister/commands/reviews-code.md
  plugins/maister/commands/reviews-pragmatic.md
  plugins/maister/commands/reviews-production-readiness.md
  plugins/maister/commands/reviews-reality-check.md
  plugins/maister/commands/reviews-spec-audit.md
  plugins/maister/commands/work.md
)
if errors=$(grep -En '(Task tool|subagent_type|Task\()' "${in_scope_files[@]/#/$ROOT/}"); then
  printf '%s\n' "$errors" >&2
  fail 'host-foreign delegation assumptions remain in an in-scope call site'
fi
pass 'repository-wide in-scope exact-role call sites'

cursor_command_entrypoints=()
while IFS='|' read -r relative role; do
  [ -n "$relative" ] || continue
  assert_exact_role_call "$relative" "$role"
  cursor_command_entrypoints+=("$ROOT/$relative")
done <<'EOF'
plugins/maister/overlays/cursor/assets/skills/maister-reviews-code/SKILL.md|code-reviewer
plugins/maister/overlays/cursor/assets/skills/maister-reviews-pragmatic/SKILL.md|code-quality-pragmatist
plugins/maister/overlays/cursor/assets/skills/maister-reviews-production-readiness/SKILL.md|production-readiness-checker
plugins/maister/overlays/cursor/assets/skills/maister-reviews-reality-check/SKILL.md|reality-assessor
plugins/maister/overlays/cursor/assets/skills/maister-reviews-spec-audit/SKILL.md|spec-auditor
plugins/maister/overlays/cursor/assets/skills/maister-work/SKILL.md|task-classifier
EOF
if errors=$(grep -En '(Task tool|subagent_type|Task\()' "${cursor_command_entrypoints[@]}"); then
  printf '%s\n' "$errors" >&2
  fail 'generated Cursor command entrypoint retains host-foreign delegation syntax'
fi
pass 'generated Cursor command entrypoints use exact logical roles'

node --input-type=module - "$ROOT" <<'EOF'
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
const projector = await import(pathToFileURL(path.join(root, "plugins/maister/lib/distribution/cursor-skill-projector.mjs")));
const source = Buffer.from(`---\nname: maister:development\n---\nResolve resolveAgent({ logical_role_id: "maister:advisor", ...verifiedRuntimeInputs }).\nInvoke skill: "maister:development".\nResume skill: "maister:[orchestrator-name]".\n`);
const transformed = projector.applyCursorTransforms(
  source,
  "maister-development/SKILL.md",
  new Set(["cursor-skill-name-v1"]),
);
const output = transformed.toString("utf8");
assert.match(output, /name: maister-development/u);
assert.match(output, /logical_role_id: "maister:advisor"/u);
assert.match(output, /skill: "maister-development"/u);
assert.match(output, /skill: "maister-\[orchestrator-name\]"/u);
assert.doesNotMatch(output, /logical_role_id: "maister-advisor"/u);
EOF
pass 'Cursor projection preserves logical-role tokens while adapting skill tokens'

file_mode() {
  stat -f '%Lp' "$1" 2>/dev/null || stat -c '%a' "$1"
}

generator="$ROOT/plugins/maister/bin/generate-cursor-skills.mjs"
generated_gate="$ROOT/plugins/maister/overlays/cursor/assets/skills/maister-init/bin/reconcile-gate-config.sh"
generated_command="$ROOT/plugins/maister/overlays/cursor/assets/skills/maister-work/SKILL.md"
check_output=$(mktemp "${TMPDIR:-/tmp}/maister-cursor-mode-check.XXXXXX")
cleanup_mode_test() {
  chmod 0755 "$generated_gate"
  rm -f "$check_output"
}
trap cleanup_mode_test EXIT

chmod 0644 "$generated_gate"
if node "$generator" --check >"$check_output" 2>&1; then
  fail 'Cursor projection check accepts generated mode drift'
fi
grep -Fq 'mode' "$check_output" || fail 'Cursor projection check does not identify mode drift'
(umask 077; node "$generator" >/dev/null)
[ "$(file_mode "$generated_gate")" = 755 ] || fail 'Cursor projection write does not restore executable source mode'
[ "$(file_mode "$generated_command")" = 644 ] || fail 'Cursor projection write does not normalize non-executable source mode'
node "$generator" --check >/dev/null || fail 'Cursor projection check fails after mode normalization'

trap - EXIT
rm -f "$check_output"
pass 'Cursor projection rejects and repairs deterministic mode drift'
