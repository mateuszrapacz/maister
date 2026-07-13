#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BINDING="$ROOT/platforms/codex-cli/bin/fully-automatic-gate.mjs"

if test "${CODEX_ACTIVE_TURN_TEST_FORCE_UNAVAILABLE:-0}" = 1; then
  echo "UNAVAILABLE: native Codex runtime was disabled for this test" >&2
  exit 77
fi

if ! command -v codex >/dev/null 2>&1 || ! codex login status >/dev/null 2>&1; then
  echo "UNAVAILABLE: authenticated native Codex runtime is required" >&2
  exit 77
fi

WORK="$(mktemp -d "$ROOT/.tmp-codex-active-turn.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

RESULT="$WORK/shared-result.json"
MARKER="$WORK/target-start.marker"
EVENTS="$WORK/events.jsonl"
LAST_MESSAGE="$WORK/last-message.txt"

printf '{"directive":"continue","dispatch_id":"sha256:active-turn-spike"}\n' >"$RESULT"

prompt=$(cat <<EOF
This is a repository-owned native Codex active-turn viability test.

Perform these steps in this one active turn:
1. Use the shell to run exactly: node "$BINDING" --input-file "$RESULT"
2. Read that command's JSON result. If and only if its directive is "continue", immediately use the shell to run exactly: touch "$MARKER"
3. Do not ask the user a question and do not produce a final response before the marker command has completed.
4. After the marker exists, respond with exactly: TARGET_STARTED
EOF
)

set +e
codex --ask-for-approval never exec \
  --json \
  --ephemeral \
  --ignore-user-config \
  --ignore-rules \
  --skip-git-repo-check \
  --sandbox workspace-write \
  --cd "$WORK" \
  --output-last-message "$LAST_MESSAGE" \
  "$prompt" >"$EVENTS" 2>"$WORK/stderr.log"
status=$?
set -e

if test "$status" -ne 0; then
  cat "$WORK/stderr.log" >&2
  exit "$status"
fi

test -f "$MARKER"
test "$(cat "$LAST_MESSAGE")" = TARGET_STARTED

binding_event_line="$(grep -n -F "$BINDING" "$EVENTS" | head -n 1 | cut -d: -f1)"
marker_event_line="$(grep -n -F "$MARKER" "$EVENTS" | tail -n 1 | cut -d: -f1)"
final_event_line="$(grep -n -F 'TARGET_STARTED' "$EVENTS" | tail -n 1 | cut -d: -f1)"

test -n "$binding_event_line"
test -n "$marker_event_line"
test -n "$final_event_line"
test "$binding_event_line" -lt "$marker_event_line"
test "$marker_event_line" -lt "$final_event_line"
head -n "$((marker_event_line - 1))" "$EVENTS" |
  jq -s -e '[.[] | select(.type == "item.completed" and .item.type == "agent_message") | .item.text] | all(test("\\?") | not)' >/dev/null

echo "PASS: native Codex resumed the live workflow loop and started the target before its final response"
