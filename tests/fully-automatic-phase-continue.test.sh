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

result=$(printf '{"state":"%s","phase_id":"phase-1","gate_type":"phase-exit","question":"Continue to phase 2?","options":["Continue to phase 2","Pause workflow"],"selected_option":"Continue to phase 2","actor":"advisor","confidence":"high","next_phase":"phase-2","report_md":"%s","report_html":"%s"}' "$STATE" "$REPORT_MD" "$REPORT_HTML" | node "$RUNNER")

grep -Fq '"status":"decided"' <<<"$result"
grep -Fq '"continuation":"phase_continue"' <<<"$result"
grep -Fq 'current_phase: phase-2' "$STATE"
grep -A1 -F '  - id: phase-1' "$STATE" | grep -Fq '    status: completed'
grep -A1 -F '  - id: phase-2' "$STATE" | grep -Fq '    status: in_progress'
grep -Fq '1 persisted gate decision(s)' "$REPORT_MD"
grep -Fq 'Options' "$REPORT_MD"
grep -Fq 'Continue to phase 2' "$REPORT_MD"
grep -Fq 'Continue to phase 2' "$REPORT_HTML"

second=$(printf '{"state":"%s","phase_id":"phase-1","gate_type":"phase-exit","question":"Continue to phase 2?","options":["Continue to phase 2","Pause workflow"],"selected_option":"Continue to phase 2","actor":"advisor","confidence":"high","next_phase":"phase-2","report_md":"%s","report_html":"%s"}' "$STATE" "$REPORT_MD" "$REPORT_HTML" | node "$RUNNER")

grep -Fq '"status":"reused"' <<<"$second"

if printf '{"state":"%s","phase_id":"phase-2","gate_type":"implementation-approval","question":"Approve?","options":["Approve","Reject"],"selected_option":"Approve","actor":"advisor","confidence":"high","next_phase":"phase-3","report_md":"%s","report_html":"%s"}' "$STATE" "$REPORT_MD" "$REPORT_HTML" | node "$RUNNER"; then
  echo "FAIL: denylisted gate was continued automatically" >&2
  exit 1
fi

echo "PASS: fully automatic phase continuation, idempotent reuse, and denylist guard"
