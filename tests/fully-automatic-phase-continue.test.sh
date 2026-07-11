#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNNER="$ROOT/plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

STATE="$WORK/orchestrator-state.yml"
REPORT_MD="$WORK/decision-summary.md"
REPORT_HTML="$WORK/decision-summary.html"

cat > "$STATE" <<'YAML'
orchestrator:
  current_phase: phase-1
  completed_phases: []
  gate_history: []
  implementation_approval:
    status: approved
    approved_by: user
    approved_scope:
      - test scope
task:
  status: in_progress
phases:
  - id: phase-1
    status: in_progress
  - id: phase-2
    status: pending
YAML

result=$(node "$RUNNER" \
  --state "$STATE" \
  --phase-id phase-1 \
  --gate-type phase-exit \
  --question "Continue to phase 2?" \
  --options-json '["Continue to phase 2","Pause workflow"]' \
  --selected-option "Continue to phase 2" \
  --actor advisor \
  --confidence high \
  --next-phase phase-2 \
  --report-md "$REPORT_MD" \
  --report-html "$REPORT_HTML")

grep -Fq '"status":"decided"' <<<"$result"
grep -Fq '"continuation":"phase_continue"' <<<"$result"
grep -Fq 'current_phase: phase-2' "$STATE"
grep -A1 -F '  - id: phase-1' "$STATE" | grep -Fq '    status: completed'
grep -A1 -F '  - id: phase-2' "$STATE" | grep -Fq '    status: in_progress'
grep -Fq '1 persisted gate decision(s)' "$REPORT_MD"
grep -Fq 'Options' "$REPORT_MD"
grep -Fq 'Continue to phase 2' "$REPORT_MD"
grep -Fq 'Continue to phase 2' "$REPORT_HTML"

second=$(node "$RUNNER" \
  --state "$STATE" \
  --phase-id phase-1 \
  --gate-type phase-exit \
  --question "Continue to phase 2?" \
  --options-json '["Continue to phase 2","Pause workflow"]' \
  --selected-option "Pause workflow" \
  --actor advisor \
  --confidence high \
  --next-phase phase-2 \
  --report-md "$REPORT_MD" \
  --report-html "$REPORT_HTML")

grep -Fq '"status":"reused"' <<<"$second"

if node "$RUNNER" \
  --state "$STATE" \
  --phase-id phase-2 \
  --gate-type implementation-approval \
  --question "Approve?" \
  --options-json '["Approve","Reject"]' \
  --selected-option "Approve" \
  --actor advisor \
  --confidence high \
  --next-phase phase-3 \
  --report-md "$REPORT_MD" \
  --report-html "$REPORT_HTML"; then
  echo "FAIL: denylisted gate was continued automatically" >&2
  exit 1
fi

echo "PASS: fully automatic phase continuation, idempotent reuse, and denylist guard"
