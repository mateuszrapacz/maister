#!/bin/bash
# Reminder to invoke Maister skills and respect orchestrator gates.

cat <<'EOF'
{
  "additional_context": "MAISTER PLUGIN RULE: When any /maister-* command appears in the user's prompt, invoke it via the Skill tool as your FIRST action. Do not substitute your own approach.\n\nORCHESTRATOR GATE RULE: When running any maister orchestrator, present every mandatory gate via AskQuestion when that tool is available in the session. If AskQuestion is missing (Tool not found — e.g. some Grok 4.5 sessions), fall back to an inline chat question with the same options and WAIT for the user's reply. Never skip a gate because the tool is absent. See orchestrator-patterns.md sections 2 and 2.1."
}
EOF
exit 0
