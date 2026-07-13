#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNNER="$ROOT/plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs"
FIXTURE="$ROOT/tests/fixtures/phase-continue/valid-v2-terminal.yml"
WORK="$(mktemp -d)"
WORK="$(cd "$WORK" && pwd -P)"
trap 'rm -rf "$WORK"' EXIT

STATE="$WORK/orchestrator-state.yml"
REPORT_MD="$WORK/decision-summary.md"
REPORT_HTML="$WORK/decision-summary.html"
cp "$FIXTURE" "$STATE"

make_payload() {
  STATE="$STATE" REPORT_MD="$REPORT_MD" REPORT_HTML="$REPORT_HTML" node --input-type=module <<'NODE'
process.stdout.write(JSON.stringify({
  state: process.env.STATE,
  phase_id: "phase-1",
  gate_type: "research-convergence",
  question: "Choose the next decision area",
  options: ["Continue", "Pause"],
  selected_option: "Continue",
  actor: "advisor",
  confidence: "high",
  next_phase: "phase-2",
  report_md: process.env.REPORT_MD,
  report_html: process.env.REPORT_HTML,
}));
NODE
}

first="$(make_payload | node "$RUNNER")"
jq -e '.status == "continued" and .actor == "advisor"' <<<"$first" >/dev/null
grep -Fq 'current_phase: "phase-2"' "$STATE"
grep -Fq 'The recommendation is safe' "$REPORT_MD"

cp -p "$STATE" "$WORK/state.after"
second="$(make_payload | node "$RUNNER")"
jq -e '.status == "reused"' <<<"$second" >/dev/null
cmp -s "$STATE" "$WORK/state.after"

echo "PASS: evaluator-owned automatic decision is verified, continued, and reused"
